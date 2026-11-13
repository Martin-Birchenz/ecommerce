const { z } = require("zod");

const variantSchema = z.object({
  id: z.number().int().positive().optional(),
  sku: z.string().max(60).optional().nullable(),
  attribute_name: z.string().min(1).max(50).default("Presentación"),
  attribute_value: z.string().min(1).max(80).default("Única"),
  price_override: z.coerce.number().nonnegative().optional().nullable(),
  stock: z.coerce.number().nonnegative().default(0),
  min_stock_alert: z.coerce.number().nonnegative().default(3),
  is_active: z.boolean().optional().default(true),
});

const createProductSchema = z.object({
  category_id: z.coerce.number().int().positive("La categoría es obligatoria"),
  subcategory_id: z.coerce.number().int().positive().optional().nullable(),
  name: z.string().min(2, "El nombre es muy corto").max(180).trim(),
  description: z.string().max(2000).optional().nullable(),
  base_price: z.coerce.number().nonnegative("El precio no puede ser negativo"),
  unit_type: z
    .enum(["unidad", "kg", "100g", "litro", "metro", "paquete"])
    .default("unidad"),
  min_step: z.coerce.number().positive().default(1),
  is_featured: z.boolean().optional().default(false),
  is_active: z.boolean().optional().default(true),
  variants: z.array(variantSchema).min(1, "Debe incluir al menos una variante"),
  images: z
    .array(
      z.object({
        image_url: z.string().url(),
        public_id: z.string().optional().nullable(),
        is_primary: z.boolean().optional().default(false),
      }),
    )
    .optional()
    .default([]),
});

module.exports = { createProductSchema };
