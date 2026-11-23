const pool = require("../config/db.js");

let schemaEnsured = false;

const ensureShippingSchema = async () => {
  if (schemaEnsured) return;
  const alterStatements = [
    "ALTER TABLE store_settings ADD COLUMN origin_postal_code VARCHAR(16) NULL",
    "ALTER TABLE store_settings ADD COLUMN andreani_enabled TINYINT(1) NOT NULL DEFAULT 0",
    "ALTER TABLE store_settings ADD COLUMN andreani_user VARCHAR(120) NULL",
    "ALTER TABLE store_settings ADD COLUMN andreani_password VARCHAR(180) NULL",
    "ALTER TABLE store_settings ADD COLUMN andreani_contract VARCHAR(80) NULL",
    "ALTER TABLE store_settings ADD COLUMN correo_enabled TINYINT(1) NOT NULL DEFAULT 0",
    "ALTER TABLE store_settings ADD COLUMN correo_api_key VARCHAR(255) NULL",
    "ALTER TABLE store_settings ADD COLUMN correo_agreement VARCHAR(80) NULL",
    "ALTER TABLE orders ADD COLUMN shipping_carrier VARCHAR(40) NULL",
    "ALTER TABLE orders ADD COLUMN shipping_tracking_code VARCHAR(100) NULL",
    "ALTER TABLE orders ADD COLUMN shipping_label_url TEXT NULL",
  ];

  for (const sql of alterStatements) {
    try {
      await pool.query(sql);
    } catch (err) {
      // Ignorar ER_DUP_FIELDNAME (1060) si la columna ya existe
      if (err.errno !== 1060) {
        console.warn("[Shipping Schema Note]:", err.message);
      }
    }
  }
  schemaEnsured = true;
};

const calculateRegionalFactor = (originCp, destCp) => {
  const o = String(originCp || "3150").replace(/\D/g, "");
  const d = String(destCp || "").replace(/\D/g, "");
  if (!d) return 1.2;
  if (o === d) return 0.75; // Local
  if (o.slice(0, 2) === d.slice(0, 2)) return 1.0; // Misma provincia / región cercana
  return 1.45; // Nacional larga distancia
};

const quoteAndreaniLive = async (settings, destCp, declaredValue) => {
  if (
    !settings.andreani_user ||
    !settings.andreani_password ||
    !settings.andreani_contract
  ) {
    return null;
  }

  try {
    const basicAuth = Buffer.from(
      `${settings.andreani_user}:${settings.andreani_password}`,
    ).toString("base64");

    const loginRes = await fetch("https://apis.andreani.com/login", {
      method: "GET",
      headers: { Authorization: `Basic ${basicAuth}` },
    });
    if (!loginRes.ok) return null;

    const token = loginRes.headers.get("x-authorization-token");
    if (!token) return null;

    const params = new URLSearchParams({
      cpDestino: String(destCp).replace(/\D/g, ""),
      contrato: settings.andreani_contract,
      "bultos[0][volumen]": "2000",
      "bultos[0][kilos]": "1",
      "bultos[0][valorDeclarado]": String(
        Math.max(1000, declaredValue || 5000),
      ),
    });

    const quoteRes = await fetch(
      `https://apis.andreani.com/v1/tarifas?${params.toString()}`,
      {
        headers: { "x-authorization-token": token },
      },
    );
    if (!quoteRes.ok) return null;

    const data = await quoteRes.json();
    const totalConIva = Number(data?.tarifaConIva?.total);
    if (!Number.isNaN(totalConIva) && totalConIva > 0) {
      return {
        carrier: "andreani",
        service_name: "Andreani Estándar a Domicilio",
        cost: Math.round(totalConIva),
        estimated_days: "2 a 4 días hábiles",
        mode: "live_api",
      };
    }
    return null;
  } catch {
    return null;
  }
};

const quoteCorreoLive = async (settings, destCp) => {
  if (!settings.correo_api_key || !settings.correo_agreement) {
    return null;
  }

  try {
    const res = await fetch(
      "https://api.correoargentino.com.ar/micorreo/v1/rates",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.correo_api_key}`,
        },
        body: JSON.stringify({
          customerId: settings.correo_agreement,
          postalCodeOrigin: String(
            settings.origin_postal_code || "3150",
          ).replace(/\D/g, ""),
          postalCodeDestination: String(destCp).replace(/\D/g, ""),
          deliveredType: "D",
          dimensions: { weight: 1000, height: 15, width: 20, length: 25 },
        }),
      },
    );
    if (!res.ok) return null;

    const data = await res.json();
    const firstRate = Array.isArray(data?.rates) ? data.rates[0] : null;
    if (firstRate && Number(firstRate.price) > 0) {
      return {
        carrier: "correo_argentino",
        service_name: `Correo Argentino (${firstRate.productName || "Clásico"})`,
        cost: Math.round(Number(firstRate.price)),
        estimated_days: firstRate.deliveryTimeMin
          ? `${firstRate.deliveryTimeMin} a ${firstRate.deliveryTimeMax} días hábiles`
          : "3 a 6 días hábiles",
        mode: "live_api",
      };
    }
    return null;
  } catch {
    return null;
  }
};

const ShippingService = {
  ensureShippingSchema,

  quoteRates: async (storeId, { postal_code, subtotal = 0 }) => {
    await ensureShippingSchema();

    const cleanCp = String(postal_code || "").replace(/\D/g, "");
    if (cleanCp.length < 4) {
      const err = new Error("Ingresá un Código Postal válido (4 dígitos)");
      err.statusCode = 400;
      throw err;
    }

    const [rows] = await pool.query(
      `SELECT origin_postal_code, flat_delivery_cost, free_shipping_min,
              andreani_enabled, andreani_user, andreani_password, andreani_contract,
              correo_enabled, correo_api_key, correo_agreement
       FROM store_settings
       WHERE store_id = ? LIMIT 1`,
      [storeId],
    );

    if (rows.length === 0) {
      const err = new Error("Configuración de tienda no encontrada");
      err.statusCode = 404;
      throw err;
    }

    const settings = rows[0];
    const baseFlat = Math.max(
      2500,
      Number(settings.flat_delivery_cost || 4500),
    );
    const factor = calculateRegionalFactor(
      settings.origin_postal_code,
      cleanCp,
    );
    const freeMin = settings.free_shipping_min
      ? Number(settings.free_shipping_min)
      : null;
    const isFree = freeMin && freeMin > 0 && Number(subtotal) >= freeMin;

    const quotes = [];

    if (settings.andreani_enabled) {
      const liveAndreani = await quoteAndreaniLive(settings, cleanCp, subtotal);
      const quote = liveAndreani || {
        carrier: "andreani",
        service_name: "Andreani Estándar a Domicilio",
        cost: Math.round((baseFlat * 1.15 * factor) / 100) * 100,
        estimated_days:
          factor <= 1 ? "24 a 48 hs hábiles" : "2 a 5 días hábiles",
        mode: "calculated",
      };
      if (isFree) quote.cost = 0;
      quotes.push(quote);
    }

    if (settings.correo_enabled) {
      const liveCorreo = await quoteCorreoLive(settings, cleanCp);
      const quote = liveCorreo || {
        carrier: "correo_argentino",
        service_name: "Correo Argentino Clásico",
        cost: Math.round((baseFlat * 0.95 * factor) / 100) * 100,
        estimated_days:
          factor <= 1 ? "2 a 3 días hábiles" : "3 a 6 días hábiles",
        mode: "calculated",
      };
      if (isFree) quote.cost = 0;
      quotes.push(quote);
    }

    return quotes;
  },

  generateOrderLabel: async (storeId, orderId, requestedCarrier) => {
    await ensureShippingSchema();

    const [orders] = await pool.query(
      `SELECT o.*, s.name AS store_name, s.address AS store_address, s.whatsapp_number AS store_phone,
              st.origin_postal_code, st.andreani_enabled, st.correo_enabled
       FROM orders o
       INNER JOIN stores s ON o.store_id = s.id
       INNER JOIN store_settings st ON s.id = st.store_id
       WHERE o.id = ? AND o.store_id = ? LIMIT 1`,
      [orderId, storeId],
    );

    if (orders.length === 0) {
      const err = new Error("Pedido no encontrado");
      err.statusCode = 404;
      throw err;
    }

    const order = orders[0];
    if (order.delivery_type !== "delivery") {
      const err = new Error(
        "Este pedido es retiro en local, no requiere etiqueta de envío",
      );
      err.statusCode = 400;
      throw err;
    }

    const carrier =
      requestedCarrier ||
      order.shipping_carrier ||
      (order.andreani_enabled
        ? "andreani"
        : order.correo_enabled
          ? "correo_argentino"
          : "correo_argentino");

    const prefix = carrier === "andreani" ? "AND" : "CA";
    const trackingCode =
      order.shipping_tracking_code ||
      `${prefix}${Date.now().toString().slice(-8)}${Math.floor(10 + Math.random() * 89)}AR`;

    const labelUrl = `/api/admin/orders/${order.id}/shipping-label/print`;

    await pool.query(
      `UPDATE orders
       SET shipping_carrier = ?,
           shipping_tracking_code = ?,
           shipping_label_url = ?,
           status = CASE WHEN status IN ('pending', 'paid') THEN 'preparing' ELSE status END
       WHERE id = ? AND store_id = ?`,
      [carrier, trackingCode, labelUrl, orderId, storeId],
    );

    return {
      order_id: order.id,
      order_number: order.order_number,
      shipping_carrier: carrier,
      shipping_tracking_code: trackingCode,
      shipping_label_url: labelUrl,
    };
  },

  getPrintableLabelHtml: async (storeId, orderId) => {
    await ensureShippingSchema();

    const [orders] = await pool.query(
      `SELECT o.*, s.name AS store_name, s.address AS store_address, s.whatsapp_number AS store_phone,
              st.origin_postal_code
       FROM orders o
       INNER JOIN stores s ON o.store_id = s.id
       INNER JOIN store_settings st ON s.id = st.store_id
       WHERE o.id = ? AND o.store_id = ? LIMIT 1`,
      [orderId, storeId],
    );

    if (orders.length === 0) {
      const err = new Error("Pedido no encontrado");
      err.statusCode = 404;
      throw err;
    }

    const o = orders[0];
    const carrierTitle =
      o.shipping_carrier === "andreani"
        ? "ANDREANI LOGÍSTICA"
        : "CORREO ARGENTINO";
    const tracking = o.shipping_tracking_code || `ENV-${o.order_number}`;

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Etiqueta ${tracking}</title>
  <style>
    * { box-sizing: border-box; font-family: Arial, Helvetica, sans-serif; }
    body { margin: 0; padding: 12px; background: #fff; color: #000; }
    .label { width: 100mm; min-height: 145mm; border: 2px solid #000; padding: 10px; margin: 0 auto; display: flex; flex-direction: column; justify-content: space-between; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 8px; }
    .carrier { font-size: 16px; font-weight: 900; letter-spacing: 0.5px; }
    .badge { border: 1.5px solid #000; padding: 2px 6px; font-size: 11px; font-weight: bold; }
    .barcode-box { text-align: center; padding: 12px 0; border-bottom: 1.5px dashed #000; }
    .bars { height: 46px; background: repeating-linear-gradient(90deg, #000 0px, #000 2px, #fff 2px, #fff 4px, #000 4px, #000 7px, #fff 7px, #fff 9px); margin: 0 auto 6px; width: 85%; }
    .tracking { font-family: monospace; font-size: 15px; font-weight: bold; letter-spacing: 2px; }
    .section { padding: 8px 0; border-bottom: 1px solid #000; font-size: 12px; line-height: 1.4; }
    .section-title { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #333; margin-bottom: 2px; }
    .dest-name { font-size: 15px; font-weight: bold; }
    .dest-addr { font-size: 13px; font-weight: bold; margin-top: 2px; }
    .footer { font-size: 10px; display: flex; justify-content: space-between; padding-top: 6px; }
    @media print { body { padding: 0; } .label { border: 2px solid #000; } }
  </style>
</head>
<body>
  <div class="label">
    <div>
      <div class="header">
        <span class="carrier">${carrierTitle}</span>
        <span class="badge">ESTÁNDAR</span>
      </div>

      <div class="barcode-box">
        <div class="bars"></div>
        <div class="tracking">${tracking}</div>
      </div>

      <div class="section">
        <div class="section-title">Destinatario</div>
        <div class="dest-name">${o.customer_name}</div>
        <div>Tel: ${o.customer_phone}</div>
        <div class="dest-addr">${o.shipping_address || "Domicilio informado"}</div>
        ${o.shipping_notes ? `<div style="margin-top:4px;font-size:11px;">Obs: ${o.shipping_notes}</div>` : ""}
      </div>

      <div class="section">
        <div class="section-title">Remitente</div>
        <div><strong>${o.store_name}</strong></div>
        <div>${o.store_address || "Local Comercial"} (CP ${o.origin_postal_code || "3150"})</div>
        <div>Tel: ${o.store_phone || "-"}</div>
      </div>
    </div>

    <div class="footer">
      <span>Pedido: <strong>#${o.order_number}</strong></span>
      <span>Bulto 1/1 · Peso est. 1.0 kg</span>
    </div>
  </div>
  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`;
  },
};

module.exports = ShippingService;
