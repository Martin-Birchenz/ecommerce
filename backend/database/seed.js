const bcrypt = require("bcryptjs");
const pool = require("../src/config/db.js");
require("dotenv").config();

const seed = async () => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Crear SuperAdmin (vos)
    const superPass = await bcrypt.hash("Admin1234!", 10);
    await connection.query(
      `INSERT IGNORE INTO users (store_id, name, email, password_hash, role)
       VALUES (NULL, 'Martín Birchenz', 'admin@tuplataforma.com', ?, 'superadmin')`,
      [superPass],
    );

    // 2. Crear Tienda Demo
    const [storeRes] = await connection.query(
      `INSERT IGNORE INTO stores (name, slug, business_category, whatsapp_number, plan_status)
       VALUES ('Tienda Demo', 'demo', 'general', '5493435000000', 'demo')`,
    );

    const [stores] = await connection.query(
      "SELECT id FROM stores WHERE slug = 'demo'",
    );
    const demoStoreId = stores[0].id;

    // 3. Configuración visual de la Demo
    await connection.query(
      `INSERT IGNORE INTO store_settings (store_id, hero_title, hero_subtitle, primary_color, secondary_color, accent_color)
       VALUES (?, 'Catálogo Online Demo', 'Pedí fácil por web y recibilo en tu casa', '#0F172A', '#2563EB', '#10B981')`,
      [demoStoreId],
    );

    // 4. Admin de la Tienda Demo
    const demoPass = await bcrypt.hash("Demo1234!", 10);
    await connection.query(
      `INSERT IGNORE INTO users (store_id, name, email, password_hash, role)
       VALUES (?, 'Dueño Demo', 'demo@tienda.com', ?, 'store_admin')`,
      [demoStoreId, demoPass],
    );

    // 5. Categorías y productos de ejemplo
    const [catRes] = await connection.query(
      `INSERT IGNORE INTO categories (store_id, name, slug, sort_order)
       VALUES (?, 'Destacados', 'destacados', 1)`,
      [demoStoreId],
    );
    const [cats] = await connection.query(
      "SELECT id FROM categories WHERE store_id = ? AND slug = 'destacados'",
      [demoStoreId],
    );

    const [prodRes] = await connection.query(
      `INSERT IGNORE INTO products (store_id, category_id, name, slug, description, base_price, unit_type, is_featured)
       VALUES (?, ?, 'Producto Ejemplo Premium', 'producto-ejemplo-premium', 'Producto multi-variante listo para venta online.', 25000.00, 'unidad', 1)`,
      [demoStoreId, cats[0].id],
    );

    if (prodRes.insertId) {
      await connection.query(
        `INSERT INTO product_variants (store_id, product_id, attribute_name, attribute_value, stock)
         VALUES (?, ?, 'Presentación', 'Estándar', 15),
                (?, ?, 'Presentación', 'Edición Especial', 5)`,
        [demoStoreId, prodRes.insertId, demoStoreId, prodRes.insertId],
      );
    }

    await connection.commit();
    console.log("✅ Seed completado:");
    console.log("   SuperAdmin -> admin@tuplataforma.com / Admin1234!");
    console.log("   Admin Demo -> demo@tienda.com / Demo1234!");
    console.log(
      "   Endpoint público -> GET http://localhost:3000/api/public/demo/bootstrap",
    );
  } catch (error) {
    await connection.rollback();
    console.error("❌ Error en seed:", error);
  } finally {
    connection.release();
    process.exit(0);
  }
};

seed();
