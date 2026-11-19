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

  toggleStoreStatus: async (req, res, next) => {
    try {
      const storeId = Number(req.params.id);
      const { plan_status } = req.body; // 'demo' | 'active' | 'suspended'

      if (!["demo", "active", "suspended"].includes(plan_status)) {
        return res
          .status(400)
          .json({ success: false, message: "Estado de plan inválido" });
      }

      const isActive = plan_status === "suspended" ? 0 : 1;

      await pool.query(
        "UPDATE stores SET plan_status = ?, is_active = ? WHERE id = ?",
        [plan_status, isActive, storeId],
      );

      res
        .status(200)
        .json({ success: true, message: "Estado del comercio actualizado" });
    } catch (error) {
      next(error);
    }
  },

  impersonateStore: async (req, res, next) => {
    try {
      const storeId = Number(req.params.id);

      const [stores] = await pool.query(
        "SELECT id, name, slug FROM stores WHERE id = ? LIMIT 1",
        [storeId],
      );
      if (stores.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Comercio no encontrado" });
      }
      const store = stores[0];

      // Buscamos el admin principal de esa tienda
      const [admins] = await pool.query(
        "SELECT id, name, email FROM users WHERE store_id = ? AND role = 'store_admin' LIMIT 1",
        [storeId],
      );

      const targetUser = admins[0] || {
        id: req.user.userId,
        name: `Soporte (${store.name})`,
        email: "soporte@saas.com",
      };

      const token = jwt.sign(
        {
          userId: targetUser.id,
          storeId: store.id,
          role: "store_admin",
          impersonatedBy: req.user.userId,
        },
        process.env.JWT_SECRET,
        { expiresIn: "4h" },
      );

      res.status(200).json({
        success: true,
        data: {
          token,
          user: {
            id: targetUser.id,
            name: targetUser.name,
            email: targetUser.email,
            role: "store_admin",
            storeId: store.id,
            storeSlug: store.slug,
            storeName: store.name,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = SuperAdminController;
