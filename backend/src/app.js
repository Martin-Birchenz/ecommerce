const express = require("express");
const cors = require("cors");
require("dotenv").config();

const publicRoutes = require("./routes/public.routes.js");
const authRoutes = require("./routes/auth.routes.js");
const superadminRoutes = require("./routes/superadmin.routes.js");
const adminRoutes = require("./routes/admin.routes.js");
const OrderController = require("./controllers/order.controller.js");

const app = express();

// CORS configurado sin barras finales
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((url) => url.trim().replace(/\/$/, ""));

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

app.use(express.json({ limit: "5mb" }));

// Health check para Render / monitoreo
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Rutas públicas multi-tenant (/api/public/:slug/...)
app.use("/api/public/:slug", publicRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/superadmin", superadminRoutes);
app.use("/api/admin", adminRoutes);
app.post(
  "/api/webhooks/mercadopago/:storeId",
  OrderController.mercadoPagoWebhook,
);

// Manejador global de errores
app.use((err, req, res, next) => {
  console.error("[ERROR]:", err);

  if (err.code === "ER_DUP_ENTRY") {
    return res.status(409).json({
      success: false,
      message: "Ya existe un registro con ese identificador único (slug/email)",
    });
  }

  return res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Error interno del servidor",
  });
});

module.exports = app;
