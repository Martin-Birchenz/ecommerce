const { z } = require("zod");

const createStoreSchema = z.object({
  name: z.string().min(2).max(120).trim(),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(
      /^[a-z0-9-]+$/,
      "El slug solo puede contener minúsculas, números y guiones",
    )
    .trim(),
  business_category: z.string().max(60).optional().default("general"),
  whatsapp_number: z.string().min(8).max(30).trim(),
  admin_name: z.string().min(2).max(100).trim(),
  admin_email: z.string().email().toLowerCase().trim(),
  admin_password: z.string().min(6),
  // Colores iniciales opcionales
  primary_color: z.string().optional().default("#111827"),
  secondary_color: z.string().optional().default("#4F46E5"),
  accent_color: z.string().optional().default("#10B981"),
});

module.exports = { createStoreSchema };
