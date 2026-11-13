const bcrypt = require("bcryptjs");
const pool = require("../config/db.js");

const SuperAdminController = {
  listStores: async (req, res, next) => {
    try {
      const [rows] = await pool.query(
        `SELECT s.*, st.primary_color, st.logo_url,
                (SELECT COUNT(*) FROM products p WHERE p.store_id = s.id) AS total_products,
                (SELECT COUNT(*) FROM orders o WHERE o.store_id = s.id) AS total_orders
         FROM stores s
         LEFT JOIN store_settings st ON s.id = st.store_id
         ORDER BY s.created_at DESC`,
      );
      res.status(200).json({ success: true, data: rows });
    } catch (error) {
      next(error);
    }
  },

  createStore: async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
      const {
        name,
        slug,
        business_category,
        whatsapp_number,
        admin_name,
        admin_email,
        admin_password,
        primary_color,
        secondary_color,
        accent_color,
      } = req.body;

      await connection.beginTransaction();

      // 1. Insertar comercio
      const [storeResult] = await connection.query(
        `INSERT INTO stores (name, slug, business_category, whatsapp_number, plan_status)
         VALUES (?, ?, ?, ?, 'active')`,
        [name, slug, business_category, whatsapp_number],
      );
      const storeId = storeResult.insertId;

      // 2. Insertar configuración visual por defecto
      await connection.query(
        `INSERT INTO store_settings (store_id, hero_title, hero_subtitle, primary_color, secondary_color, accent_color)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          storeId,
          `Bienvenidos a ${name}`,
          "Explorá nuestro catálogo online y hacé tu pedido directo",
          primary_color,
          secondary_color,
          accent_color,
        ],
      );

      // 3. Crear usuario administrador del comercio
      const passwordHash = await bcrypt.hash(admin_password, 10);
      await connection.query(
        `INSERT INTO users (store_id, name, email, password_hash, role)
         VALUES (?, ?, ?, ?, 'store_admin')`,
        [storeId, admin_name, admin_email, passwordHash],
      );

      await connection.commit();

      return res.status(201).json({
        success: true,
        message: "Comercio creado e inicializado correctamente",
        data: { storeId, slug, publicUrl: `/t/${slug}` },
      });
    } catch (error) {
      await connection.rollback();
      next(error);
    } finally {
      connection.release();
    }
  },
};

module.exports = SuperAdminController;
