const pool = require("../config/db.js");

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
    const connection = await pool.getConnection();
    try {
      const {
        name,
        whatsapp_number,
        address,
        logo_url,
        banner_desktop_url,
        hero_title,
        hero_subtitle,
        primary_color,
        secondary_color,
        accent_color,
        background_color,
        surface_color,
        text_color,
        font_heading,
        font_body,
        border_radius,
        bank_alias,
        bank_cbu,
        bank_holder_name,
        allow_pickup,
        allow_delivery,
        flat_delivery_cost,
      } = req.body;

      await connection.beginTransaction();

      if (name || whatsapp_number) {
        await connection.query(
          `UPDATE stores SET 
            name = COALESCE(?, name),
            whatsapp_number = COALESCE(?, whatsapp_number),
            address = COALESCE(?, address)
           WHERE id = ?`,
          [name || null, whatsapp_number || null, address ?? null, req.storeId],
        );
      }

      await connection.query(
        `UPDATE store_settings SET
          logo_url = COALESCE(?, logo_url),
          banner_desktop_url = COALESCE(?, banner_desktop_url),
          hero_title = COALESCE(?, hero_title),
          hero_subtitle = COALESCE(?, hero_subtitle),
          primary_color = COALESCE(?, primary_color),
          secondary_color = COALESCE(?, secondary_color),
          accent_color = COALESCE(?, accent_color),
          background_color = COALESCE(?, background_color),
          surface_color = COALESCE(?, surface_color),
          text_color = COALESCE(?, text_color),
          font_heading = COALESCE(?, font_heading),
          font_body = COALESCE(?, font_body),
          border_radius = COALESCE(?, border_radius),
          bank_alias = COALESCE(?, bank_alias),
          bank_cbu = COALESCE(?, bank_cbu),
          bank_holder_name = COALESCE(?, bank_holder_name),
          allow_pickup = COALESCE(?, allow_pickup),
          allow_delivery = COALESCE(?, allow_delivery),
          flat_delivery_cost = COALESCE(?, flat_delivery_cost)
         WHERE store_id = ?`,
        [
          logo_url ?? null,
          banner_desktop_url ?? null,
          hero_title ?? null,
          hero_subtitle ?? null,
          primary_color ?? null,
          secondary_color ?? null,
          accent_color ?? null,
          background_color ?? null,
          surface_color ?? null,
          text_color ?? null,
          font_heading ?? null,
          font_body ?? null,
          border_radius ?? null,
          bank_alias ?? null,
          bank_cbu ?? null,
          bank_holder_name ?? null,
          allow_pickup ?? null,
          allow_delivery ?? null,
          flat_delivery_cost ?? null,
          req.storeId,
        ],
      );

      await connection.commit();
      res
        .status(200)
        .json({ success: true, message: "Diseño y configuración guardados" });
    } catch (error) {
      await connection.rollback();
      next(error);
    } finally {
      connection.release();
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

      // 1. Métricas de pedidos del comercio
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

      // 2. Métricas de catálogo y variantes con stock bajo
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
};

module.exports = AdminStoreController;
