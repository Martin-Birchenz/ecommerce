const pool = require("../config/db.js");
const OrderService = require("../services/order.service.js");
const ShippingService = require("../services/shipping.service.js");

const OrderController = {
  createPublicOrder: async (req, res, next) => {
    try {
      const result = await OrderService.createOrder(req.storeId, req.body);
      res.status(201).json({
        success: true,
        message: "Pedido registrado correctamente",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  quotePublicShipping: async (req, res, next) => {
    try {
      const quotes = await ShippingService.quoteRates(req.storeId, req.body);
      res.status(200).json({ success: true, data: quotes });
    } catch (error) {
      next(error);
    }
  },

  createMercadoPagoPreference: async (req, res, next) => {
    try {
      const orderId = Number(req.body.order_id);
      if (!orderId) {
        return res
          .status(400)
          .json({ success: false, message: "order_id requerido" });
      }
      const data = await OrderService.createMercadoPagoPreference(
        req.storeId,
        req.params.slug,
        orderId,
      );
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  // Webhook público de Mercado Pago por tienda
  mercadoPagoWebhook: async (req, res) => {
    try {
      const storeId = Number(req.params.storeId);
      const paymentId =
        req.body?.data?.id || req.query?.["data.id"] || req.query?.id;

      if (storeId && paymentId) {
        await OrderService.processMercadoPagoWebhook(storeId, paymentId);
      }
      res.sendStatus(200);
    } catch (error) {
      console.error("[MP Webhook Error]:", error.message);
      res.sendStatus(200);
    }
  },

  // Admin: listar pedidos del comercio con sus ítems
  getAdminOrders: async (req, res, next) => {
    try {
      await ShippingService.ensureShippingSchema();
      const { status } = req.query;
      let sql = `SELECT * FROM orders WHERE store_id = ?`;
      const params = [req.storeId];

      if (status && status !== "all") {
        sql += " AND status = ?";
        params.push(status);
      }
      sql += " ORDER BY created_at DESC LIMIT 100";

      const [orders] = await pool.query(sql, params);

      if (orders.length === 0) {
        return res.status(200).json({ success: true, data: [] });
      }

      const orderIds = orders.map((o) => o.id);
      const [items] = await pool.query(
        `SELECT * FROM order_items WHERE order_id IN (?)`,
        [orderIds],
      );

      const enriched = orders.map((order) => ({
        ...order,
        items: items.filter((i) => i.order_id === order.id),
      }));

      res.status(200).json({ success: true, data: enriched });
    } catch (error) {
      next(error);
    }
  },

  // Admin: generar etiqueta de envío Correo Argentino / Andreani
  generateShippingLabel: async (req, res, next) => {
    try {
      const orderId = Number(req.params.id);
      const { carrier } = req.body || {};
      const labelData = await ShippingService.generateOrderLabel(
        req.storeId,
        orderId,
        carrier,
      );
      res.status(200).json({
        success: true,
        message: "Etiqueta de envío generada correctamente",
        data: labelData,
      });
    } catch (error) {
      next(error);
    }
  },

  // Admin: HTML imprimible 10x15cm de etiqueta
  printShippingLabel: async (req, res, next) => {
    try {
      const orderId = Number(req.params.id);
      const html = await ShippingService.getPrintableLabelHtml(
        req.storeId,
        orderId,
      );
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.status(200).send(html);
    } catch (error) {
      next(error);
    }
  },

  // Admin: actualizar estado (y devolver stock si se cancela)
  updateOrderStatus: async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
      const orderId = Number(req.params.id);
      const { status } = req.body;

      await connection.beginTransaction();

      const [orders] = await connection.query(
        "SELECT id, status FROM orders WHERE id = ? AND store_id = ? FOR UPDATE",
        [orderId, req.storeId],
      );

      if (orders.length === 0) {
        await connection.rollback();
        return res
          .status(404)
          .json({ success: false, message: "Pedido no encontrado" });
      }

      const currentOrder = orders[0];

      if (status === "cancelled" && currentOrder.status !== "cancelled") {
        const [items] = await connection.query(
          "SELECT variant_id, quantity FROM order_items WHERE order_id = ? AND store_id = ?",
          [orderId, req.storeId],
        );
        for (const item of items) {
          await connection.query(
            "UPDATE product_variants SET stock = stock + ? WHERE id = ? AND store_id = ?",
            [item.quantity, item.variant_id, req.storeId],
          );
        }
      }

      await connection.query(
        "UPDATE orders SET status = ? WHERE id = ? AND store_id = ?",
        [status, orderId, req.storeId],
      );

      await connection.commit();
      res
        .status(200)
        .json({ success: true, message: "Estado del pedido actualizado" });
    } catch (error) {
      await connection.rollback();
      next(error);
    } finally {
      connection.release();
    }
  },
};

module.exports = OrderController;
