const pool = require("../config/db.js");

const StoreRepository = {
  getBootstrapData: async (storeId) => {
    // 1. Datos de la tienda + configuración visual y operativa (sin tokens privados)
    const [storeRows] = await pool.query(
      `SELECT 
        s.id, s.name, s.slug, s.business_category, s.whatsapp_number, s.email, s.address,
        st.logo_url, st.banner_desktop_url, st.banner_mobile_url,
        st.hero_title, st.hero_subtitle,
        st.primary_color, st.secondary_color, st.accent_color,
        st.background_color, st.surface_color, st.text_color, st.free_shipping_min, st.shipping_zones,
        st.font_heading, st.font_body, st.border_radius,
        st.bank_alias, st.bank_cbu, st.bank_holder_name,
        st.allow_pickup, st.allow_delivery, st.flat_delivery_cost,
        (st.mp_access_token IS NOT NULL AND st.mp_access_token != '') AS has_mercadopago
       FROM stores s
       INNER JOIN store_settings st ON s.id = st.store_id
       WHERE s.id = ? LIMIT 1`,
      [storeId],
    );

    if (storeRows.length === 0) return null;

    // 2. Árbol de categorías y subcategorías activas de esta tienda
    const [catRows] = await pool.query(
      `SELECT 
        c.id AS category_id, c.name AS category_name, c.slug AS category_slug,
        sub.id AS subcategory_id, sub.name AS subcategory_name, sub.slug AS subcategory_slug
       FROM categories c
       LEFT JOIN subcategories sub ON c.id = sub.category_id AND sub.is_active = 1
       WHERE c.store_id = ? AND c.is_active = 1
       ORDER BY c.sort_order ASC, c.name ASC, sub.name ASC`,
      [storeId],
    );

    const categories = catRows.reduce((acc, row) => {
      let cat = acc.find((c) => c.id === row.category_id);
      if (!cat) {
        cat = {
          id: row.category_id,
          name: row.category_name,
          slug: row.category_slug,
          subcategories: [],
        };
        acc.push(cat);
      }
      if (row.subcategory_id) {
        cat.subcategories.push({
          id: row.subcategory_id,
          name: row.subcategory_name,
          slug: row.subcategory_slug,
        });
      }
      return acc;
    }, []);

    return {
      store: storeRows[0],
      categories,
    };
  },
};

module.exports = StoreRepository;
