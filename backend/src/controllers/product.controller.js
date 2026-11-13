const ProductRepository = require("../repositories/product.repository.js");

const ProductController = {
  // Público: catálogo activo filtrado por tienda
  getPublicCatalog: async (req, res, next) => {
    try {
      const { category, search, featured } = req.query;
      const products = await ProductRepository.findAllByStore(req.storeId, {
        onlyActive: true,
        categorySlug: category,
        search,
        featured,
      });
      res.status(200).json({ success: true, data: products });
    } catch (error) {
      next(error);
    }
  },

  // Admin: lista todos (activos y pausados)
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

  // Admin: crea producto + variantes + imágenes
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

  // Admin: subida de imágenes a Cloudinary
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

  // Admin: actualización rápida de stock por variante
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

  // Admin: toggle rápido is_active / is_featured
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
