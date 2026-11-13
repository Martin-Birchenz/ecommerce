const express = require("express");
const router = express.Router();
const {
  verifyToken,
  requireRole,
} = require("../middlewares/auth.middleware.js");
const { validate } = require("../middlewares/validate.middleware.js");
const { createProductSchema } = require("../schemas/product.schema.js");
const { upload } = require("../config/cloudinary.js");
const ProductController = require("../controllers/product.controller.js");
const { updateOrderStatusSchema } = require("../schemas/order.schema.js");
const OrderController = require("../controllers/order.controller.js");

router.use(verifyToken, requireRole("store_admin", "staff"));

// Productos y Variantes
router.get("/products", ProductController.getAdminProducts);
router.post(
  "/products",
  validate(createProductSchema),
  ProductController.createProduct,
);
router.post(
  "/products/upload",
  upload.array("images", 5),
  ProductController.uploadImages,
);
router.patch("/variants/:variantId/stock", ProductController.updateStock);
router.patch("/products/:id/toggle", ProductController.toggleFlag);

router.get("/orders", OrderController.getAdminOrders);
router.patch(
  "/orders/:id/status",
  validate(updateOrderStatusSchema),
  OrderController.updateOrderStatus,
);

module.exports = router;
