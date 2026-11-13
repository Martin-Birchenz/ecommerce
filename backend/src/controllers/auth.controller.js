const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db.js");

const AuthController = {
  login: async (req, res, next) => {
    try {
      const { email, password } = req.body;

      const [rows] = await pool.query(
        `SELECT u.id, u.store_id, u.name, u.email, u.password_hash, u.role, u.is_active,
                s.slug AS store_slug, s.name AS store_name
         FROM users u
         LEFT JOIN stores s ON u.store_id = s.id
         WHERE u.email = ? LIMIT 1`,
        [email],
      );

      if (rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: "Credenciales incorrectas",
        });
      }

      const user = rows[0];

      if (!user.is_active) {
        return res.status(403).json({
          success: false,
          message: "Usuario deshabilitado",
        });
      }

      const isValidPassword = await bcrypt.compare(
        password,
        user.password_hash,
      );
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: "Credenciales incorrectas",
        });
      }

      const token = jwt.sign(
        {
          userId: user.id,
          storeId: user.store_id,
          role: user.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" },
      );

      return res.status(200).json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            storeId: user.store_id,
            storeSlug: user.store_slug,
            storeName: user.store_name,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = AuthController;
