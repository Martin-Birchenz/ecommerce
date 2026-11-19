const { z } = require("zod");

const variantSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  sku: z.string().max(80).trim().optional().nullable(),
  attribute_name: z.string().max(60).trim().default("Opción"),
  attribute_value: z
    .string()
    .min(1, "El valor de variante es requerido")
    .max(100)
    .trim(),
  price_override: z.coerce.number().nonnegative().optional().nullable(),
  stock: z.coerce.number().int().nonnegative().default(0),
  min_stock_alert: z.coerce.number().int().nonnegative().default(3),
  is_active: z.boolean().optional().default(true),
});

const createProductSchema = z.object({
  category_id: z.coerce.number().int().positive("Seleccioná una categoría"),
  subcategory_id: z.coerce.number().int().positive().optional().nullable(),
  name: z.string().min(2, "El nombre es obligatorio").max(180).trim(),
  description: z.string().max(2000).trim().optional().nullable(),
  base_price: z.coerce
    .number()
    .nonnegative("El precio debe ser mayor o igual a 0"),
  compare_at_price: z.coerce.number().nonnegative().optional().nullable(),
  unit_label: z.string().max(30).trim().default("Unidad"),
  is_featured: z.boolean().optional().default(false),
  is_active: z.boolean().optional().default(true),
  images: z
    .array(
      z.object({
        image_url: z.string().url("URL de imagen inválida").max(500),
        is_primary: z.boolean().optional().default(false),
      }),
    )
    .optional()
    .default([]),
  variants: z
    .array(variantSchema)
    .min(1, "El producto debe tener al menos una variante o stock inicial"),
});

const updateProductSchema = createProductSchema.partial();

module.exports = {
  createProductSchema,
  updateProductSchema,
};
