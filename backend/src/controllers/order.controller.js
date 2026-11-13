const pool = require("../config/db.js");
const OrderService = require("../services/order.service.js");

const OrderController = {
  // Público: crear pedido (Guest Checkout)
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
      res.sendStatus(200); // Siempre 200 a MP para evitar reintentos infinitos
    }
  },

  // Admin: listar pedidos del comercio con sus ítems
  getAdminOrders: async (req, res, next) => {
    try {
      const [orders] = await pool.query(
        `SELECT * FROM orders WHERE store_id = ? ORDER BY created_at DESC LIMIT 100`,
        [req.storeId],
      );

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

  // Admin: actualizar estado (y devolver stock si se cancela)
  updateOrderStatus: async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
      const orderId = Number(req.params.id);
      const { status } = req.body;

      await connection.beginTransaction();

      const [orders] = await connection.query(
        "SELECT id, status, payment_method FROM orders WHERE id = ? AND store_id = ? FOR UPDATE",
        [orderId, req.storeId],
      );

      if (orders.length === 0) {
        await connection.rollback();
        return res
          .status(404)
          .json({ success: false, message: "Pedido no encontrado" });
      }

      const currentOrder = orders[0];

      // Si pasa a 'cancelled' desde un estado que ya había descontado stock, lo reponemos
      const stockWasDeducted =
        currentOrder.payment_method !== "mercadopago" ||
        currentOrder.status === "paid";

      if (
        status === "cancelled" &&
        currentOrder.status !== "cancelled" &&
        stockWasDeducted
      ) {
        const [items] = await connection.query(
          "SELECT variant_id, quantity FROM order_items WHERE order_id = ?",
          [orderId],
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
