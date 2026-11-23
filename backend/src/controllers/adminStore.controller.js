const pool = require("../config/db.js");
const ShippingService = require("../services/shipping.service.js");

const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const AdminStoreController = {
  getSettings: async (req, res, next) => {
    try {
      await ShippingService.ensureShippingSchema();
      const [rows] = await pool.query(
        `SELECT s.id, s.name, s.slug, s.whatsapp_number, s.address, st.*
         FROM stores s
         INNER JOIN store_settings st ON s.id = st.store_id
         WHERE s.id = ? LIMIT 1`,
        [req.storeId],
      );
      if (rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Tienda no encontrada" });
      }
      res.status(200).json({ success: true, data: rows[0] });
    } catch (error) {
      next(error);
    }
  },

  updateSettings: async (req, res, next) => {
    try {
      await ShippingService.ensureShippingSchema();
      const storeId = req.storeId;
      const {
        logo_url,
        banner_url,
        primary_color,
        secondary_color,
        accent_color,
        background_color,
        font_family,
        hero_title,
        hero_subtitle,
        whatsapp_number,
        instagram_url,
        address,
        business_hours,
        mp_enabled,
        mp_access_token,
        transfer_enabled,
        transfer_alias,
        transfer_cbu,
        transfer_holder,
        cash_pickup_enabled,
        delivery_enabled,
        pickup_enabled,
        flat_delivery_cost,
        free_shipping_min,
        shipping_zones,
        origin_postal_code,
        andreani_enabled,
        andreani_user,
        andreani_password,
        andreani_contract,
        correo_enabled,
        correo_api_key,
        correo_agreement,
      } = req.body;

      const serializedZones =
        shipping_zones === undefined
          ? null
          : shipping_zones === null
            ? null
            : JSON.stringify(shipping_zones);

      await pool.query(
        `UPDATE store_settings SET
          logo_url = COALESCE(?, logo_url),
          banner_url = COALESCE(?, banner_url),
          primary_color = COALESCE(?, primary_color),
          secondary_color = COALESCE(?, secondary_color),
          accent_color = COALESCE(?, accent_color),
          background_color = COALESCE(?, background_color),
          font_family = COALESCE(?, font_family),
          hero_title = COALESCE(?, hero_title),
          hero_subtitle = COALESCE(?, hero_subtitle),
          whatsapp_number = COALESCE(?, whatsapp_number),
          instagram_url = COALESCE(?, instagram_url),
          address = COALESCE(?, address),
          business_hours = COALESCE(?, business_hours),
          mp_enabled = COALESCE(?, mp_enabled),
          mp_access_token = COALESCE(?, mp_access_token),
          transfer_enabled = COALESCE(?, transfer_enabled),
          transfer_alias = COALESCE(?, transfer_alias),
          transfer_cbu = COALESCE(?, transfer_cbu),
          transfer_holder = COALESCE(?, transfer_holder),
          cash_pickup_enabled = COALESCE(?, cash_pickup_enabled),
          delivery_enabled = COALESCE(?, delivery_enabled),
          pickup_enabled = COALESCE(?, pickup_enabled),
          flat_delivery_cost = COALESCE(?, flat_delivery_cost),
          free_shipping_min = ?,
          shipping_zones = COALESCE(?, shipping_zones),
          origin_postal_code = COALESCE(?, origin_postal_code),
          andreani_enabled = COALESCE(?, andreani_enabled),
          andreani_user = COALESCE(?, andreani_user),
          andreani_password = COALESCE(?, andreani_password),
          andreani_contract = COALESCE(?, andreani_contract),
          correo_enabled = COALESCE(?, correo_enabled),
          correo_api_key = COALESCE(?, correo_api_key),
          correo_agreement = COALESCE(?, correo_agreement)
         WHERE store_id = ?`,
        [
          logo_url ?? null,
          banner_url ?? null,
          primary_color ?? null,
          secondary_color ?? null,
          accent_color ?? null,
          background_color ?? null,
          font_family ?? null,
          hero_title ?? null,
          hero_subtitle ?? null,
          whatsapp_number ?? null,
          instagram_url ?? null,
          address ?? null,
          business_hours ?? null,
          mp_enabled !== undefined ? (mp_enabled ? 1 : 0) : null,
          mp_access_token !== undefined ? mp_access_token || null : null,
          transfer_enabled !== undefined ? (transfer_enabled ? 1 : 0) : null,
          transfer_alias ?? null,
          transfer_cbu ?? null,
          transfer_holder ?? null,
          cash_pickup_enabled !== undefined
            ? cash_pickup_enabled
              ? 1
              : 0
            : null,
          delivery_enabled !== undefined ? (delivery_enabled ? 1 : 0) : null,
          pickup_enabled !== undefined ? (pickup_enabled ? 1 : 0) : null,
          flat_delivery_cost !== undefined ? Number(flat_delivery_cost) : null,
          free_shipping_min !== undefined &&
          free_shipping_min !== "" &&
          free_shipping_min !== null
            ? Number(free_shipping_min)
            : null,
          serializedZones,
          origin_postal_code ?? null,
          andreani_enabled !== undefined ? (andreani_enabled ? 1 : 0) : null,
          andreani_user ?? null,
          andreani_password ?? null,
          andreani_contract ?? null,
          correo_enabled !== undefined ? (correo_enabled ? 1 : 0) : null,
          correo_api_key ?? null,
          correo_agreement ?? null,
          storeId,
        ],
      );

      res.status(200).json({
        success: true,
        message: "Configuración de tienda actualizada correctamente",
      });
    } catch (error) {
      next(error);
    }
  },

  getCategories: async (req, res, next) => {
    try {
      const [rows] = await pool.query(
        "SELECT * FROM categories WHERE store_id = ? ORDER BY sort_order ASC, name ASC",
        [req.storeId],
      );
      res.status(200).json({ success: true, data: rows });
    } catch (error) {
      next(error);
    }
  },

  createCategory: async (req, res, next) => {
    try {
      const { name } = req.body;
      if (!name || name.trim().length < 2) {
        return res
          .status(400)
          .json({ success: false, message: "Nombre de categoría inválido" });
      }
      const slug = `${slugify(name)}-${Date.now().toString().slice(-3)}`;
      const [result] = await pool.query(
        "INSERT INTO categories (store_id, name, slug) VALUES (?, ?, ?)",
        [req.storeId, name.trim(), slug],
      );
      res.status(201).json({
        success: true,
        data: { id: result.insertId, name: name.trim(), slug },
      });
    } catch (error) {
      next(error);
    }
  },

  getSubcategories: async (req, res, next) => {
    try {
      const { category_id } = req.query;
      let query = "SELECT * FROM subcategories WHERE store_id = ?";
      const params = [req.storeId];

      if (category_id) {
        query += " AND category_id = ?";
        params.push(Number(category_id));
      }
      query += " ORDER BY name ASC";

      const [rows] = await pool.query(query, params);
      res.status(200).json({ success: true, data: rows });
    } catch (error) {
      next(error);
    }
  },

  createSubcategory: async (req, res, next) => {
    try {
      const { category_id, name } = req.body;
      if (!category_id || !name || name.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: "Categoría y nombre son obligatorios",
        });
      }
      const slug = `${slugify(name)}-${Date.now().toString().slice(-3)}`;
      const [result] = await pool.query(
        "INSERT INTO subcategories (store_id, category_id, name, slug) VALUES (?, ?, ?, ?)",
        [req.storeId, Number(category_id), name.trim(), slug],
      );
      res.status(201).json({
        success: true,
        data: {
          id: result.insertId,
          category_id: Number(category_id),
          name: name.trim(),
          slug,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  getDashboardStats: async (req, res, next) => {
    try {
      const storeId = req.storeId;

      const [orderStats] = await pool.query(
        `SELECT 
          COUNT(*) AS total_orders,
          COALESCE(SUM(CASE WHEN status IN ('paid', 'preparing', 'completed') THEN total_amount ELSE 0 END), 0) AS confirmed_revenue,
          COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) AS pending_orders,
          COALESCE(SUM(CASE WHEN DATE(created_at) = CURDATE() AND status != 'cancelled' THEN 1 ELSE 0 END), 0) AS today_orders
         FROM orders
         WHERE store_id = ?`,
        [storeId],
      );

      const [productStats] = await pool.query(
        `SELECT 
          COUNT(DISTINCT p.id) AS total_products,
          COALESCE(SUM(CASE WHEN p.is_active = 1 THEN 1 ELSE 0 END), 0) AS active_products
         FROM products p
         WHERE p.store_id = ?`,
        [storeId],
      );

      const [lowStockItems] = await pool.query(
        `SELECT pv.id AS variant_id, p.name AS product_name, pv.attribute_value, pv.stock, pv.min_stock_alert
         FROM product_variants pv
         INNER JOIN products p ON pv.product_id = p.id
         WHERE pv.store_id = ? AND p.is_active = 1 AND pv.is_active = 1 AND pv.stock <= pv.min_stock_alert
         ORDER BY pv.stock ASC
         LIMIT 10`,
        [storeId],
      );

      res.status(200).json({
        success: true,
        data: {
          orders: orderStats[0],
          products: productStats[0],
          lowStockItems,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  updateCategory: async (req, res, next) => {
    try {
      const { name, sort_order, is_active } = req.body;
      await pool.query(
        `UPDATE categories SET
          name = COALESCE(?, name),
          sort_order = COALESCE(?, sort_order),
          is_active = COALESCE(?, is_active)
         WHERE id = ? AND store_id = ?`,
        [
          name ?? null,
          sort_order ?? null,
          is_active ?? null,
          Number(req.params.id),
          req.storeId,
        ],
      );
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  },

  deleteCategory: async (req, res, next) => {
    try {
      await pool.query("DELETE FROM categories WHERE id = ? AND store_id = ?", [
        Number(req.params.id),
        req.storeId,
      ]);
      res.status(200).json({ success: true });
    } catch (error) {
      if (error.code === "ER_ROW_IS_REFERENCED_2") {
        return res.status(400).json({
          success: false,
          message:
            "No podés eliminar esta categoría porque tiene productos asociados. Ocultala o reasigná sus productos.",
        });
      }
      next(error);
    }
  },

  deleteSubcategory: async (req, res, next) => {
    try {
      await pool.query(
        "DELETE FROM subcategories WHERE id = ? AND store_id = ?",
        [Number(req.params.id), req.storeId],
      );
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = AdminStoreController;
