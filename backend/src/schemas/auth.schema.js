const { z } = require("zod");

const loginSchema = z.object({
  email: z.string().email("Email inválido").toLowerCase().trim(),
  password: z.string().min(4, "Contraseña requerida"),
});

module.exports = { loginSchema };
