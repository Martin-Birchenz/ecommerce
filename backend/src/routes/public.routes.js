const express = require("express");
const router = express.Router({ mergeParams: true });
const { resolveTenant } = require("../middlewares/tenant.middleware.js");
const PublicStoreController = require("../controllers/publicStore.controller.js");
const ProductController = require("../controllers/product.controller.js");
const { validate } = require("../middlewares/validate.middleware.js");
const { createOrderSchema } = require("../schemas/order.schema.js");
const OrderController = require("../controllers/order.controller.js");

// Todas las rutas acá adentro pasan primero por resolveTenant
router.use(resolveTenant);

router.get("/bootstrap", PublicStoreController.getBootstrap);
router.get("/products", ProductController.getPublicCatalog);
router.post(
  "/orders",
  validate(createOrderSchema),
  OrderController.createPublicOrder,
);

module.exports = router;
