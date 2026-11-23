const pool = require("../config/db.js");
const { MercadoPagoConfig, Preference, Payment } = require("mercadopago");

const OrderService = {
  createOrder: async (storeId, payload) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Verificar configuración de medios de pago, envío y zonas de la tienda
      const [settingsRows] = await connection.query(
        `SELECT mp_enabled, transfer_enabled, cash_pickup_enabled,
                delivery_enabled, pickup_enabled, flat_delivery_cost,
                free_shipping_min, shipping_zones
         FROM store_settings
         WHERE store_id = ? LIMIT 1`,
        [storeId],
      );
      if (settingsRows.length === 0) {
        const err = new Error("Configuración de tienda no encontrada");
        err.statusCode = 404;
        throw err;
      }
      const settings = settingsRows[0];

      if (payload.payment_method === "mercadopago" && !settings.mp_enabled) {
        const err = new Error("Este comercio no tiene habilitado Mercado Pago");
        err.statusCode = 400;
        throw err;
      }
      if (payload.payment_method === "transfer" && !settings.transfer_enabled) {
        const err = new Error("Este comercio no acepta transferencias");
        err.statusCode = 400;
        throw err;
      }
      if (
        payload.payment_method === "cash_pickup" &&
        !settings.cash_pickup_enabled
      ) {
        const err = new Error("Este comercio no acepta pago en efectivo");
        err.statusCode = 400;
        throw err;
      }
      if (payload.delivery_type === "delivery" && !settings.delivery_enabled) {
        const err = new Error("Este comercio no realiza envíos a domicilio");
        err.statusCode = 400;
        throw err;
      }

      // 2. Agrupar y ordenar variant_ids para evitar deadlocks en FOR UPDATE
      const qtyByVariant = new Map();
      for (const item of payload.items) {
        qtyByVariant.set(
          item.variant_id,
          (qtyByVariant.get(item.variant_id) || 0) + item.quantity,
        );
      }
      const sortedVariantIds = Array.from(qtyByVariant.keys()).sort(
        (a, b) => a - b,
      );

      let subtotal = 0;
      const resolvedItems = [];

      for (const variantId of sortedVariantIds) {
        const requestedQty = qtyByVariant.get(variantId);

        const [rows] = await connection.query(
          `SELECT pv.id AS variant_id, pv.stock, pv.price_override, pv.attribute_value, pv.is_active AS variant_active,
                  p.id AS product_id, p.name AS product_name, p.base_price, p.is_active AS product_active
           FROM product_variants pv
           INNER JOIN products p ON pv.product_id = p.id
           WHERE pv.id = ? AND pv.store_id = ?
           FOR UPDATE`,
          [variantId, storeId],
        );

        if (
          rows.length === 0 ||
          !rows[0].variant_active ||
          !rows[0].product_active
        ) {
          const err = new Error(
            `El producto seleccionado ya no está disponible (variante #${variantId})`,
          );
          err.statusCode = 400;
          throw err;
        }

        const v = rows[0];
        if (v.stock < requestedQty) {
          const err = new Error(
            `Stock insuficiente para "${v.product_name} (${v.attribute_value})". Disponible: ${v.stock}`,
          );
          err.statusCode = 409;
          throw err;
        }

        const unitPrice =
          v.price_override !== null
            ? Number(v.price_override)
            : Number(v.base_price);
        const lineSubtotal = Number((unitPrice * requestedQty).toFixed(2));
        subtotal = Number((subtotal + lineSubtotal).toFixed(2));

        resolvedItems.push({
          product_id: v.product_id,
          variant_id: v.variant_id,
          product_name_snapshot: v.product_name,
          variant_label_snapshot: v.attribute_value,
          quantity: requestedQty,
          unit_price: unitPrice,
          subtotal: lineSubtotal,
        });

        // Reserva inmediata de stock bajo bloqueo FOR UPDATE
        await connection.query(
          "UPDATE product_variants SET stock = stock - ? WHERE id = ? AND store_id = ?",
          [requestedQty, variantId, storeId],
        );
      }

      // 3. Validar y descontar cupón si fue enviado
      let appliedCouponCode = null;
      let discountAmount = 0;

      if (payload.coupon_code && payload.coupon_code.trim() !== "") {
        const cleanCode = payload.coupon_code.toUpperCase().trim();
        const [couponRows] = await connection.query(
          `SELECT * FROM coupons
           WHERE store_id = ? AND code = ? AND is_active = 1
           FOR UPDATE`,
          [storeId, cleanCode],
        );

        if (couponRows.length === 0) {
          const err = new Error("El cupón ingresado no es válido");
          err.statusCode = 400;
          throw err;
        }

        const coupon = couponRows[0];
        if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
          const err = new Error("El cupón ingresado ya venció");
          err.statusCode = 400;
          throw err;
        }
        if (
          coupon.usage_limit !== null &&
          coupon.used_count >= coupon.usage_limit
        ) {
          const err = new Error("El cupón alcanzó su límite de usos");
          err.statusCode = 400;
          throw err;
        }
        if (subtotal < Number(coupon.min_order_amount)) {
          const err = new Error(
            `El monto mínimo para este cupón es $${Number(coupon.min_order_amount).toLocaleString("es-AR")}`,
          );
          err.statusCode = 400;
          throw err;
        }

        appliedCouponCode = coupon.code;
        discountAmount =
          coupon.discount_type === "percentage"
            ? Number(
                ((subtotal * Number(coupon.discount_value)) / 100).toFixed(2),
              )
            : Math.min(subtotal, Number(coupon.discount_value));

        await connection.query(
          "UPDATE coupons SET used_count = used_count + 1 WHERE id = ?",
          [coupon.id],
        );
      }

      // 4. Calcular costo de envío (por zona elegida o tarifa plana, con regla de envío gratis)
      const netMerchandiseTotal = Math.max(
        0,
        Number((subtotal - discountAmount).toFixed(2)),
      );
      let shippingCost = 0;
      let resolvedShippingNotes = payload.shipping_notes || "";

      if (payload.delivery_type === "delivery") {
        let baseShipping = Number(settings.flat_delivery_cost || 0);

        const zones =
          typeof settings.shipping_zones === "string"
            ? JSON.parse(settings.shipping_zones)
            : settings.shipping_zones;

        if (
          Array.isArray(zones) &&
          zones.length > 0 &&
          payload.shipping_zone_name
        ) {
          const matchedZone = zones.find(
            (z) =>
              z.name.toLowerCase().trim() ===
              payload.shipping_zone_name.toLowerCase().trim(),
          );
          if (matchedZone) {
            baseShipping = Number(matchedZone.cost || 0);
            resolvedShippingNotes =
              `[Zona: ${matchedZone.name}] ${resolvedShippingNotes}`.trim();
          }
        }

        if (
          settings.free_shipping_min !== null &&
          Number(settings.free_shipping_min) > 0 &&
          netMerchandiseTotal >= Number(settings.free_shipping_min)
        ) {
          shippingCost = 0;
        } else {
          shippingCost = baseShipping;
        }
      }

      const totalAmount = Number(
        (netMerchandiseTotal + shippingCost).toFixed(2),
      );
      const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(10 + Math.random() * 89)}`;

      // 5. Insertar cabecera del pedido
      const [orderResult] = await connection.query(
        `INSERT INTO orders
          (store_id, order_number, customer_name, customer_phone, customer_email,
           delivery_type, shipping_address, shipping_notes, payment_method, coupon_code,
           status, subtotal, discount_amount, shipping_cost, total_amount)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
        [
          storeId,
          orderNumber,
          payload.customer_name,
          payload.customer_phone,
          payload.customer_email || null,
          payload.delivery_type,
          payload.delivery_type === "delivery"
            ? payload.shipping_address
            : null,
          resolvedShippingNotes || null,
          payload.payment_method,
          appliedCouponCode,
          subtotal,
          discountAmount,
          shippingCost,
          totalAmount,
        ],
      );

      const orderId = orderResult.insertId;

      for (const item of resolvedItems) {
        await connection.query(
          `INSERT INTO order_items
            (store_id, order_id, product_id, variant_id, product_name_snapshot, variant_label_snapshot, quantity, unit_price, subtotal)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            storeId,
            orderId,
            item.product_id,
            item.variant_id,
            item.product_name_snapshot,
            item.variant_label_snapshot,
            item.quantity,
            item.unit_price,
            item.subtotal,
          ],
        );
      }

      await connection.commit();

      return {
        id: orderId,
        order_number: orderNumber,
        status: "pending",
        subtotal,
        discount_amount: discountAmount,
        coupon_code: appliedCouponCode,
        shipping_cost: shippingCost,
        total_amount: totalAmount,
        items: resolvedItems,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  createMercadoPagoPreference: async (storeId, slug, orderId) => {
    const [orders] = await pool.query(
      "SELECT * FROM orders WHERE id = ? AND store_id = ? LIMIT 1",
      [orderId, storeId],
    );
    if (orders.length === 0) {
      const err = new Error("Pedido no encontrado");
      err.statusCode = 404;
      throw err;
    }
    const order = orders[0];

    const [settingsRows] = await pool.query(
      "SELECT mp_enabled, mp_access_token FROM store_settings WHERE store_id = ? LIMIT 1",
      [storeId],
    );
    const settings = settingsRows[0];
    if (!settings?.mp_enabled || !settings?.mp_access_token) {
      const err = new Error(
        "El comercio no tiene configurado el token de Mercado Pago",
      );
      err.statusCode = 400;
      throw err;
    }

    const client = new MercadoPagoConfig({
      accessToken: settings.mp_access_token,
    });
    const preference = new Preference(client);

    const frontendBase = (
      process.env.FRONTEND_URL || "http://localhost:5173"
    ).replace(/\/$/, "");
    const backendBase = (
      process.env.BACKEND_URL || "https://ecommerce-z6at.onrender.com"
    ).replace(/\/$/, "");

    const response = await preference.create({
      body: {
        items: [
          {
            id: String(order.order_number),
            title: `Pedido #${order.order_number}`,
            quantity: 1,
            currency_id: "ARS",
            unit_price: Number(order.total_amount),
          },
        ],
        external_reference: `${storeId}:${order.id}`,
        notification_url: `${backendBase}/api/webhooks/mercadopago/${storeId}`,
        back_urls: {
          success: `${frontendBase}/t/${slug}/checkout/success?order=${order.order_number}`,
          failure: `${frontendBase}/t/${slug}/checkout/failure?order=${order.order_number}`,
          pending: `${frontendBase}/t/${slug}/checkout/pending?order=${order.order_number}`,
        },
        auto_return: "approved",
      },
    });

    return {
      preference_id: response.id,
      init_point: response.init_point,
    };
  },

  processMercadoPagoWebhook: async (storeId, paymentId) => {
    const connection = await pool.getConnection();
    try {
      const [settings] = await connection.query(
        "SELECT mp_access_token FROM store_settings WHERE store_id = ? LIMIT 1",
        [storeId],
      );
      if (settings.length === 0 || !settings[0].mp_access_token) return;

      const client = new MercadoPagoConfig({
        accessToken: settings[0].mp_access_token,
      });
      const paymentApi = new Payment(client);
      const paymentInfo = await paymentApi.get({ id: paymentId });

      if (!paymentInfo?.external_reference) return;

      const [, orderIdStr] = String(paymentInfo.external_reference).split(":");
      const orderId = Number(orderIdStr);
      if (!orderId) return;

      await connection.beginTransaction();

      // Bloquear orden para garantizar idempotencia si MP reenvía el webhook
      const [orders] = await connection.query(
        "SELECT id, status FROM orders WHERE id = ? AND store_id = ? FOR UPDATE",
        [orderId, storeId],
      );

      if (orders.length === 0) {
        await connection.commit();
        return;
      }

      const currentStatus = orders[0].status;

      if (paymentInfo.status === "approved") {
        if (currentStatus !== "paid") {
          // El stock ya fue reservado al crear la orden en createOrder
          await connection.query(
            "UPDATE orders SET status = 'paid', mp_payment_id = ? WHERE id = ? AND store_id = ?",
            [String(paymentId), orderId, storeId],
          );
        }
      } else if (
        (paymentInfo.status === "rejected" ||
          paymentInfo.status === "cancelled") &&
        currentStatus === "pending"
      ) {
        // Devolver stock reservado si el pago fue rechazado o cancelado
        const [items] = await connection.query(
          "SELECT variant_id, quantity FROM order_items WHERE order_id = ? AND store_id = ?",
          [orderId, storeId],
        );
        for (const item of items) {
          await connection.query(
            "UPDATE product_variants SET stock = stock + ? WHERE id = ? AND store_id = ?",
            [item.quantity, item.variant_id, storeId],
          );
        }
        await connection.query(
          "UPDATE orders SET status = 'cancelled', mp_payment_id = ? WHERE id = ? AND store_id = ?",
          [String(paymentId), orderId, storeId],
        );
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },
};

module.exports = OrderService;
