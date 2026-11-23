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
const AdminStoreController = require("../controllers/adminStore.controller.js");
const CouponController = require("../controllers/coupon.controller.js");

router.use(verifyToken, requireRole("store_admin", "staff"));

// Productos y Variantes
router.get("/products", ProductController.getAdminProducts);
router.post(
  "/products",
  validate(createProductSchema),
  ProductController.createProduct,
);
router.post("/products/bulk-price", ProductController.bulkUpdatePrices);
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

router.get("/settings", AdminStoreController.getSettings);
router.put("/settings", AdminStoreController.updateSettings);
router.get("/categories", AdminStoreController.getCategories);
router.post("/categories", AdminStoreController.createCategory);
router.put(
  "/products/:id",
  validate(createProductSchema),
  ProductController.updateProduct,
);
router.get("/subcategories", AdminStoreController.getSubcategories);
router.post("/subcategories", AdminStoreController.createSubcategory);
router.get("/dashboard", AdminStoreController.getDashboardStats);
router.get("/coupons", CouponController.listAdminCoupons);
router.post("/coupons", CouponController.createCoupon);
router.patch("/coupons/:id/toggle", CouponController.toggleCoupon);
router.put("/categories/:id", AdminStoreController.updateCategory);
router.delete("/categories/:id", AdminStoreController.deleteCategory);
router.delete("/subcategories/:id", AdminStoreController.deleteSubcategory);

module.exports = router;
