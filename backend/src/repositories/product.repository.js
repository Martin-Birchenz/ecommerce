const pool = require("../config/db.js");

const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const ProductRepository = {
  findAllByStore: async (
    storeId,
    { onlyActive = true, categorySlug, search, featured } = {},
  ) => {
    let query = `
      SELECT p.*, c.name AS category_name, c.slug AS category_slug,
             sub.name AS subcategory_name, sub.slug AS subcategory_slug
      FROM products p
      INNER JOIN categories c ON p.category_id = c.id
      LEFT JOIN subcategories sub ON p.subcategory_id = sub.id
      WHERE p.store_id = ?
    `;
    const params = [storeId];

    if (onlyActive) {
      query += " AND p.is_active = 1 AND c.is_active = 1";
    }
    if (categorySlug) {
      query += " AND c.slug = ?";
      params.push(categorySlug);
    }
    if (featured === "true") {
      query += " AND p.is_featured = 1";
    }
    if (search) {
      query += " AND (p.name LIKE ? OR p.description LIKE ?)";
      const term = `%${search}%`;
      params.push(term, term);
    }

    query += " ORDER BY p.is_featured DESC, p.created_at DESC";
    const [products] = await pool.query(query, params);

    if (products.length === 0) return [];

    const productIds = products.map((p) => p.id);

    const [variants] = await pool.query(
      `SELECT * FROM product_variants 
       WHERE store_id = ? AND product_id IN (?) ${onlyActive ? "AND is_active = 1" : ""}
       ORDER BY id ASC`,
      [storeId, productIds],
    );

    const [images] = await pool.query(
      `SELECT * FROM product_images 
       WHERE store_id = ? AND product_id IN (?)
       ORDER BY is_primary DESC, sort_order ASC, id ASC`,
      [storeId, productIds],
    );

    return products.map((prod) => ({
      ...prod,
      variants: variants.filter((v) => v.product_id === prod.id),
      images: images.filter((img) => img.product_id === prod.id),
    }));
  },

  createWithRelations: async (storeId, data) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const uniqueSlug = `${slugify(data.name)}-${Date.now().toString().slice(-4)}`;

      const [prodResult] = await connection.query(
        `INSERT INTO products 
         (store_id, category_id, subcategory_id, name, slug, description, base_price, unit_type, min_step, is_featured, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          storeId,
          data.category_id,
          data.subcategory_id || null,
          data.name,
          uniqueSlug,
          data.description || null,
          data.base_price,
          data.unit_type,
          data.min_step,
          data.is_featured ? 1 : 0,
          data.is_active ? 1 : 0,
        ],
      );

      const productId = prodResult.insertId;

      for (const v of data.variants) {
        await connection.query(
          `INSERT INTO product_variants 
           (store_id, product_id, sku, attribute_name, attribute_value, price_override, stock, min_stock_alert, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            storeId,
            productId,
            v.sku || null,
            v.attribute_name,
            v.attribute_value,
            v.price_override ?? null,
            v.stock,
            v.min_stock_alert,
            v.is_active ? 1 : 0,
          ],
        );
      }

      if (data.images && data.images.length > 0) {
        for (let i = 0; i < data.images.length; i++) {
          const img = data.images[i];
          await connection.query(
            `INSERT INTO product_images (store_id, product_id, image_url, public_id, is_primary, sort_order)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              storeId,
              productId,
              img.image_url,
              img.public_id || null,
              i === 0 || img.is_primary ? 1 : 0,
              i,
            ],
          );
        }
      }

      await connection.commit();
      return productId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  updateVariantStock: async (storeId, variantId, newStock) => {
    const [result] = await pool.query(
      "UPDATE product_variants SET stock = ? WHERE id = ? AND store_id = ?",
      [newStock, variantId, storeId],
    );
    return result.affectedRows > 0;
  },

  toggleFlags: async (storeId, productId, field, value) => {
    const allowedFields = ["is_active", "is_featured"];
    if (!allowedFields.includes(field)) throw new Error("Campo no permitido");

    const [result] = await pool.query(
      `UPDATE products SET ${field} = ? WHERE id = ? AND store_id = ?`,
      [value ? 1 : 0, productId, storeId],
    );
    return result.affectedRows > 0;
  },
};

module.exports = ProductRepository;
