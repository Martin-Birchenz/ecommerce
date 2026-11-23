const pool = require("../config/db.js");
const ProductRepository = require("../repositories/product.repository.js");

const applyRounding = (value, rounding) => {
  const num = Math.max(0, Number(value));
  if (rounding === "integer") return Math.round(num);
  if (rounding === "10") return Math.round(num / 10) * 10;
  if (rounding === "100") return Math.round(num / 100) * 100;
  return Number(num.toFixed(2));
};

const ProductController = {
  // 1. Público: catálogo activo filtrado por tienda, categoría, subcategoría o búsqueda
  getPublicCatalog: async (req, res, next) => {
    try {
      const { category, subcategory, search, featured } = req.query;
      const products = await ProductRepository.findAllByStore(req.storeId, {
        onlyActive: true,
        categorySlug: category,
        subcategorySlug: subcategory,
        search,
        featured,
      });
      res.status(200).json({ success: true, data: products });
    } catch (error) {
      next(error);
    }
  },

  // 2. Admin: lista todos los productos de la tienda (activos y ocultos)
  getAdminProducts: async (req, res, next) => {
    try {
      const products = await ProductRepository.findAllByStore(req.storeId, {
        onlyActive: false,
      });
      res.status(200).json({ success: true, data: products });
    } catch (error) {
      next(error);
    }
  },

  // 3. Admin: crea producto + variantes + imágenes
  createProduct: async (req, res, next) => {
    try {
      const productId = await ProductRepository.createWithRelations(
        req.storeId,
        req.body,
      );
      res.status(201).json({
        success: true,
        message: "Producto creado correctamente",
        data: { id: productId },
      });
    } catch (error) {
      next(error);
    }
  },

  // 4. Admin: actualiza producto + variantes + imágenes de forma integral
  updateProduct: async (req, res, next) => {
    try {
      const productId = Number(req.params.id);
      await ProductRepository.updateWithRelations(
        req.storeId,
        productId,
        req.body,
      );
      res.status(200).json({
        success: true,
        message: "Producto actualizado correctamente",
      });
    } catch (error) {
      next(error);
    }
  },

  // 5. Admin: subida de imágenes a Cloudinary
  uploadImages: async (req, res, next) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "No se recibieron imágenes" });
      }
      const uploaded = req.files.map((file) => ({
        image_url: file.path,
        public_id: file.filename,
      }));
      res.status(200).json({ success: true, data: uploaded });
    } catch (error) {
      next(error);
    }
  },

  // 6. Admin: actualización atómica de stock (soporta { stock } absoluto o { delta } para mostrador físico)
  updateStock: async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
      const variantId = Number(req.params.variantId);
      const { stock, delta } = req.body;

      await connection.beginTransaction();

      const [rows] = await connection.query(
        "SELECT id, stock FROM product_variants WHERE id = ? AND store_id = ? FOR UPDATE",
        [variantId, req.storeId],
      );

      if (rows.length === 0) {
        await connection.rollback();
        return res
          .status(404)
          .json({ success: false, message: "Variante no encontrada" });
      }

      const currentStock = Number(rows[0].stock);
      let newStock = currentStock;

      if (delta !== undefined && delta !== null) {
        newStock = currentStock + Number(delta);
        if (newStock < 0) {
          await connection.rollback();
          return res.status(409).json({
            success: false,
            message: `Stock insuficiente en mostrador (disponible: ${currentStock})`,
          });
        }
      } else if (stock !== undefined && stock !== null) {
        newStock = Math.max(0, Number(stock));
      }

      await connection.query(
        "UPDATE product_variants SET stock = ? WHERE id = ? AND store_id = ?",
        [newStock, variantId, req.storeId],
      );

      await connection.commit();
      res.status(200).json({
        success: true,
        message: "Stock actualizado",
        data: { variant_id: variantId, stock: newStock },
      });
    } catch (error) {
      await connection.rollback();
      next(error);
    } finally {
      connection.release();
    }
  },

  // 7. Admin: actualización masiva de precios (porcentaje o monto fijo, filtrado por categoría/subcategoría)
  bulkUpdatePrices: async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
      const {
        adjustment_type, // 'percentage' | 'fixed'
        adjustment_value, // número (positivo para aumentar, negativo para rebajar)
        category_id, // opcional
        subcategory_id, // opcional
        include_variants = true,
        rounding = "none", // 'none' | 'integer' | '10' | '100'
      } = req.body;

      const numericValue = Number(adjustment_value);
      if (
        !["percentage", "fixed"].includes(adjustment_type) ||
        Number.isNaN(numericValue) ||
        numericValue === 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Indicá un tipo y valor de ajuste válido distinto de 0",
        });
      }

      await connection.beginTransaction();

      let whereSql = "WHERE store_id = ?";
      const params = [req.storeId];

      if (category_id) {
        whereSql += " AND category_id = ?";
        params.push(Number(category_id));
      }
      if (subcategory_id) {
        whereSql += " AND subcategory_id = ?";
        params.push(Number(subcategory_id));
      }

      const [products] = await connection.query(
        `SELECT id, base_price, compare_at_price FROM products ${whereSql} FOR UPDATE`,
        params,
      );

      if (products.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: "No hay productos en el filtro seleccionado",
        });
      }

      const calcNewPrice = (oldPrice) => {
        const base = Number(oldPrice);
        const raw =
          adjustment_type === "percentage"
            ? base * (1 + numericValue / 100)
            : base + numericValue;
        return applyRounding(raw, rounding);
      };

      for (const prod of products) {
        const nextBase = calcNewPrice(prod.base_price);
        const nextCompare =
          prod.compare_at_price !== null
            ? calcNewPrice(prod.compare_at_price)
            : null;

        await connection.query(
          "UPDATE products SET base_price = ?, compare_at_price = ? WHERE id = ? AND store_id = ?",
          [nextBase, nextCompare, prod.id, req.storeId],
        );
      }

      if (include_variants) {
        const productIds = products.map((p) => p.id);
        const placeholders = productIds.map(() => "?").join(",");
        const [variants] = await connection.query(
          `SELECT id, price_override FROM product_variants
           WHERE store_id = ? AND product_id IN (${placeholders}) AND price_override IS NOT NULL
           FOR UPDATE`,
          [req.storeId, ...productIds],
        );

        for (const v of variants) {
          const nextOverride = calcNewPrice(v.price_override);
          await connection.query(
            "UPDATE product_variants SET price_override = ? WHERE id = ? AND store_id = ?",
            [nextOverride, v.id, req.storeId],
          );
        }
      }

      await connection.commit();
      res.status(200).json({
        success: true,
        message: `Precios actualizados en ${products.length} producto(s)`,
        data: { updated_count: products.length },
      });
    } catch (error) {
      await connection.rollback();
      next(error);
    } finally {
      connection.release();
    }
  },

  // 8. Admin: toggle rápido de visibilidad (is_active) o destacado (is_featured)
  toggleFlag: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { field, value } = req.body;
      const updated = await ProductRepository.toggleFlags(
        req.storeId,
        Number(id),
        field,
        value,
      );
      if (!updated) {
        return res
          .status(404)
          .json({ success: false, message: "Producto no encontrado" });
      }
      res.status(200).json({ success: true, message: "Estado actualizado" });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = ProductController;
