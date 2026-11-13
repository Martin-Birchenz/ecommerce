const express = require("express");
const router = express.Router();
const {
  verifyToken,
  requireRole,
} = require("../middlewares/auth.middleware.js");
const { validate } = require("../middlewares/validate.middleware.js");
const { createStoreSchema } = require("../schemas/superadmin.schema.js");
const SuperAdminController = require("../controllers/superadmin.controller.js");

router.use(verifyToken, requireRole("superadmin"));

router.get("/stores", SuperAdminController.listStores);
router.post(
  "/stores",
  validate(createStoreSchema),
  SuperAdminController.createStore,
);

module.exports = router;
