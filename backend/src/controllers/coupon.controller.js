const pool = require("../config/db.js");

const CouponController = {
  // Público: validar cupón en el carrito antes de confirmar
  validatePublicCoupon: async (req, res, next) => {
    try {
      const { code, subtotal } = req.body;
      if (!code) {
        return res
          .status(400)
          .json({ success: false, message: "Ingresá un código de cupón" });
      }

      const [rows] = await pool.query(
        `SELECT * FROM coupons 
         WHERE store_id = ? AND code = ? AND is_active = 1 LIMIT 1`,
        [req.storeId, code.toUpperCase().trim()],
      );

      if (rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Cupón inválido o inexistente" });
      }

      const coupon = rows[0];

      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        return res
          .status(400)
          .json({ success: false, message: "Este cupón ya venció" });
      }

      if (
        coupon.usage_limit !== null &&
        coupon.used_count >= coupon.usage_limit
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Este cupón alcanzó su límite de usos",
          });
      }

      if (Number(subtotal) < Number(coupon.min_order_amount)) {
        return res.status(400).json({
          success: false,
          message: `Compra mínima de $${Number(coupon.min_order_amount).toLocaleString("es-AR")} para usar este cupón`,
        });
      }

      const discountAmount =
        coupon.discount_type === "percentage"
          ? Number(
              (
                (Number(subtotal) * Number(coupon.discount_value)) /
                100
              ).toFixed(2),
            )
          : Math.min(Number(subtotal), Number(coupon.discount_value));

      res.status(200).json({
        success: true,
        data: {
          code: coupon.code,
          discount_type: coupon.discount_type,
          discount_value: Number(coupon.discount_value),
          discount_amount: discountAmount,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // Admin: listar cupones
  listAdminCoupons: async (req, res, next) => {
    try {
      const [rows] = await pool.query(
        "SELECT * FROM coupons WHERE store_id = ? ORDER BY created_at DESC",
        [req.storeId],
      );
      res.status(200).json({ success: true, data: rows });
    } catch (error) {
      next(error);
    }
  },

  // Admin: crear cupón
  createCoupon: async (req, res, next) => {
    try {
      const {
        code,
        discount_type,
        discount_value,
        min_order_amount,
        usage_limit,
        expires_at,
      } = req.body;
      const cleanCode = code.toUpperCase().trim().replace(/\s+/g, "");

      const [result] = await pool.query(
        `INSERT INTO coupons (store_id, code, discount_type, discount_value, min_order_amount, usage_limit, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          req.storeId,
          cleanCode,
          discount_type || "percentage",
          Number(discount_value),
          Number(min_order_amount || 0),
          usage_limit ? Number(usage_limit) : null,
          expires_at || null,
        ],
      );

      res
        .status(201)
        .json({
          success: true,
          data: { id: result.insertId, code: cleanCode },
        });
    } catch (error) {
      next(error);
    }
  },

  // Admin: activar/desactivar cupón
  toggleCoupon: async (req, res, next) => {
    try {
      await pool.query(
        "UPDATE coupons SET is_active = NOT is_active WHERE id = ? AND store_id = ?",
        [Number(req.params.id), req.storeId],
      );
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = CouponController;
