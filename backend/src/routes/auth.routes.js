const express = require("express");
const router = express.Router();
const { validate } = require("../middlewares/validate.middleware.js");
const { loginSchema } = require("../schemas/auth.schema.js");
const AuthController = require("../controllers/auth.controller.js");

router.post("/login", validate(loginSchema), AuthController.login);

module.exports = router;
