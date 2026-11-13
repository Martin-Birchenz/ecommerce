const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Token de autenticación requerido",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      userId: decoded.userId,
      storeId: decoded.storeId, // null si es superadmin
      role: decoded.role,
    };

    // Si es un usuario de comercio, fijamos su storeId obligatorio
    if (decoded.storeId) {
      req.storeId = decoded.storeId;
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Token inválido o expirado",
    });
  }
};

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "No tenés permisos suficientes para realizar esta acción",
      });
    }
    next();
  };
};

module.exports = { verifyToken, requireRole };
