const { z } = require("zod");

const orderItemInputSchema = z.object({
  variant_id: z.number().int().positive(),
  quantity: z.number().positive("La cantidad debe ser mayor a 0"),
});

const createOrderSchema = z.object({
  customer_name: z.string().min(2, "Ingresá tu nombre").max(120).trim(),
  customer_phone: z
    .string()
    .min(6, "Ingresá un teléfono válido")
    .max(40)
    .trim(),
  customer_email: z.string().email().optional().nullable().or(z.literal("")),
  delivery_method: z
    .enum(["pickup", "local_delivery", "national_shipping"])
    .default("pickup"),
  delivery_address: z.string().max(255).optional().nullable(),
  customer_notes: z.string().max(1000).optional().nullable(),
  payment_method: z
    .enum(["whatsapp", "transfer", "mercadopago"])
    .default("whatsapp"),
  items: z
    .array(orderItemInputSchema)
    .min(1, "El carrito no puede estar vacío"),
});

const updateOrderStatusSchema = z.object({
  status: z.enum(["pending", "paid", "preparing", "completed", "cancelled"]),
});

module.exports = { createOrderSchema, updateOrderStatusSchema };
