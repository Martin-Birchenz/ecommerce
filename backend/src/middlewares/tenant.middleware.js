const pool = require("../config/db.js");

const resolveTenant = async (req, res, next) => {
  try {
    const slug = req.params.slug || req.headers["x-store-slug"];

    if (!slug) {
      return res.status(400).json({
        success: false,
        message: "Identificador de tienda (slug) no proporcionado",
      });
    }

    const [rows] = await pool.query(
      "SELECT id, name, slug, whatsapp_number, is_active, plan_status FROM stores WHERE slug = ? LIMIT 1",
      [slug.toLowerCase().trim()],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "La tienda solicitada no existe",
      });
    }

    const store = rows[0];

    if (!store.is_active || store.plan_status === "suspended") {
      return res.status(403).json({
        success: false,
        message: "Esta tienda se encuentra temporalmente inactiva",
      });
    }

    // Inyectamos el contexto del comercio en la petición
    req.storeId = store.id;
    req.store = store;

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { resolveTenant };
