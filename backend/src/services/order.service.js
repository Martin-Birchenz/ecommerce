const pool = require("../config/db.js");
const { MercadoPagoConfig, Preference, Payment } = require("mercadopago");

const generateOrderNumber = () => {
  const randomPart = Math.floor(100000 + Math.random() * 900000);
  return `ORD-${randomPart}`;
};

const OrderService = {
  createOrder: async (storeId, payload) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Obtener configuración de envío y MP de esta tienda
      const [settingsRows] = await connection.query(
        `SELECT flat_delivery_cost, mp_access_token, whatsapp_number, name AS store_name, slug
         FROM store_settings st
         INNER JOIN stores s ON s.id = st.store_id
         WHERE st.store_id = ? LIMIT 1`,
        [storeId],
      );

      if (settingsRows.length === 0) {
        throw Object.assign(
          new Error("Configuración de tienda no encontrada"),
          { statusCode: 404 },
        );
      }
      const storeConfig = settingsRows[0];

      // 2. Bloquear y validar stock de cada variante con FOR UPDATE (ACID)
      let subtotal = 0;
      const resolvedItems = [];

      for (const item of payload.items) {
        const [rows] = await connection.query(
          `SELECT pv.id AS variant_id, pv.product_id, pv.attribute_name, pv.attribute_value,
                  pv.price_override, pv.stock, pv.is_active AS variant_active,
                  p.name AS product_name, p.base_price, p.is_active AS product_active
           FROM product_variants pv
           INNER JOIN products p ON pv.product_id = p.id
           WHERE pv.id = ? AND pv.store_id = ?
           FOR UPDATE`,
          [item.variant_id, storeId],
        );

        if (
          rows.length === 0 ||
          !rows[0].variant_active ||
          !rows[0].product_active
        ) {
          throw Object.assign(
            new Error(
              `Uno de los productos seleccionados ya no está disponible`,
            ),
            {
              statusCode: 400,
            },
          );
        }

        const variant = rows[0];

        if (Number(variant.stock) < Number(item.quantity)) {
          throw Object.assign(
            new Error(
              `Stock insuficiente para "${variant.product_name} (${variant.attribute_value})". Disponible: ${variant.stock}`,
            ),
            { statusCode: 409 },
          );
        }

        const unitPrice = Number(variant.price_override ?? variant.base_price);
        const itemSubtotal = Number((unitPrice * item.quantity).toFixed(2));
        subtotal = Number((subtotal + itemSubtotal).toFixed(2));

        resolvedItems.push({
          product_id: variant.product_id,
          variant_id: variant.variant_id,
          product_name_snapshot: variant.product_name,
          variant_label_snapshot: `${variant.attribute_name}: ${variant.attribute_value}`,
          quantity: item.quantity,
          unit_price: unitPrice,
          subtotal: itemSubtotal,
        });

        // Descontamos stock atómicamente para pedidos directos (WhatsApp / Transferencia)
        if (payload.payment_method !== "mercadopago") {
          await connection.query(
            "UPDATE product_variants SET stock = stock - ? WHERE id = ? AND store_id = ?",
            [item.quantity, variant.variant_id, storeId],
          );
        }
      }

      const shippingCost =
        payload.delivery_method === "local_delivery"
          ? Number(storeConfig.flat_delivery_cost || 0)
          : 0;
      const totalAmount = Number((subtotal + shippingCost).toFixed(2));
      const orderNumber = generateOrderNumber();

      // 3. Insertar cabecera del pedido
      const [orderResult] = await connection.query(
        `INSERT INTO orders 
         (store_id, order_number, customer_name, customer_phone, customer_email,
          delivery_method, delivery_address, customer_notes, payment_method,
          subtotal, shipping_cost, total_amount, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
          storeId,
          orderNumber,
          payload.customer_name,
          payload.customer_phone,
          payload.customer_email || null,
          payload.delivery_method,
          payload.delivery_address || null,
          payload.customer_notes || null,
          payload.payment_method,
          subtotal,
          shippingCost,
          totalAmount,
        ],
      );

      const orderId = orderResult.insertId;

      // 4. Insertar detalle congelado
      for (const line of resolvedItems) {
        await connection.query(
          `INSERT INTO order_items 
           (order_id, product_id, variant_id, product_name_snapshot, variant_label_snapshot, quantity, unit_price, subtotal)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            orderId,
            line.product_id,
            line.variant_id,
            line.product_name_snapshot,
            line.variant_label_snapshot,
            line.quantity,
            line.unit_price,
            line.subtotal,
          ],
        );
      }

      // 5. Si eligió Mercado Pago y el comercio tiene token configurado, crear preferencia
      let mpInitPoint = null;
      if (payload.payment_method === "mercadopago") {
        if (!storeConfig.mp_access_token) {
          throw Object.assign(
            new Error("Este comercio aún no tiene habilitado Mercado Pago"),
            {
              statusCode: 400,
            },
          );
        }

        const client = new MercadoPagoConfig({
          accessToken: storeConfig.mp_access_token,
        });
        const preference = new Preference(client);
        const frontendBase = (
          process.env.FRONTEND_URL || "http://localhost:5173"
        )
          .split(",")[0]
          .trim();
        const backendBase =
          process.env.BACKEND_URL ||
          `http://localhost:${process.env.PORT || 3000}`;

        const mpResponse = await preference.create({
          body: {
            items: resolvedItems.map((i) => ({
              title: `${i.product_name_snapshot} (${i.variant_label_snapshot})`,
              quantity: Number(i.quantity),
              unit_price: Number(i.unit_price),
              currency_id: "ARS",
            })),
            external_reference: `${storeId}:${orderId}`,
            notification_url: `${backendBase}/api/webhooks/mercadopago/${storeId}`,
            back_urls: {
              success: `${frontendBase}/t/${storeConfig.slug}?payment=success&order=${orderNumber}`,
              failure: `${frontendBase}/t/${storeConfig.slug}?payment=failure&order=${orderNumber}`,
              pending: `${frontendBase}/t/${storeConfig.slug}?payment=pending&order=${orderNumber}`,
            },
            auto_return: "approved",
          },
        });

        mpInitPoint = mpResponse.init_point;
        await connection.query(
          "UPDATE orders SET mp_preference_id = ? WHERE id = ?",
          [mpResponse.id, orderId],
        );
      }

      await connection.commit();

      return {
        orderId,
        orderNumber,
        subtotal,
        shippingCost,
        totalAmount,
        paymentMethod: payload.payment_method,
        mpInitPoint,
        items: resolvedItems,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
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

      if (paymentInfo.status !== "approved" || !paymentInfo.external_reference)
        return;

      const [, orderIdStr] = paymentInfo.external_reference.split(":");
      const orderId = Number(orderIdStr);

      await connection.beginTransaction();

      // Bloquear orden para garantizar idempotencia si MP reenvía el webhook
      const [orders] = await connection.query(
        "SELECT id, status FROM orders WHERE id = ? AND store_id = ? FOR UPDATE",
        [orderId, storeId],
      );

      if (orders.length === 0 || orders[0].status === "paid") {
        await connection.commit();
        return;
      }

      const [items] = await connection.query(
        "SELECT variant_id, quantity FROM order_items WHERE order_id = ?",
        [orderId],
      );

      for (const item of items) {
        await connection.query(
          "UPDATE product_variants SET stock = GREATEST(0, stock - ?) WHERE id = ? AND store_id = ?",
          [item.quantity, item.variant_id, storeId],
        );
      }

      await connection.query(
        "UPDATE orders SET status = 'paid', mp_payment_id = ? WHERE id = ?",
        [String(paymentId), orderId],
      );

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
