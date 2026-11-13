const ProductRepository = require("../repositories/product.repository.js");

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

  // 6. Admin: actualización rápida de stock por variante
  updateStock: async (req, res, next) => {
    try {
      const { variantId } = req.params;
      const { stock } = req.body;
      const updated = await ProductRepository.updateVariantStock(
        req.storeId,
        Number(variantId),
        Number(stock),
      );
      if (!updated) {
        return res
          .status(404)
          .json({ success: false, message: "Variante no encontrada" });
      }
      res.status(200).json({ success: true, message: "Stock actualizado" });
    } catch (error) {
      next(error);
    }
  },

  // 7. Admin: toggle rápido de visibilidad (is_active) o destacado (is_featured)
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
