const { z } = require("zod");

const orderItemSchema = z.object({
  variant_id: z.coerce.number().int().positive("Variante inválida"),
  quantity: z.coerce.number().int().positive("La cantidad debe ser al menos 1"),
});

const createOrderSchema = z
  .object({
    customer_name: z.string().min(2, "Ingresá tu nombre").max(150).trim(),
    customer_phone: z
      .string()
      .min(6, "Ingresá un teléfono de contacto")
      .max(40)
      .trim(),
    customer_email: z
      .string()
      .email("Email inválido")
      .max(150)
      .trim()
      .optional()
      .nullable()
      .or(z.literal("")),
    delivery_type: z.enum(["pickup", "delivery"]),
    shipping_zone_name: z.string().max(100).trim().optional().nullable(),
    shipping_address: z.string().max(255).trim().optional().nullable(),
    shipping_notes: z.string().max(500).trim().optional().nullable(),
    payment_method: z.enum(["mercadopago", "transfer", "cash_pickup"]),
    coupon_code: z.string().max(40).trim().optional().nullable(),
    items: z.array(orderItemSchema).min(1, "El carrito está vacío"),
  })
  .superRefine((data, ctx) => {
    if (
      data.delivery_type === "delivery" &&
      (!data.shipping_address || data.shipping_address.length < 4)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ingresá la dirección de entrega para el envío a domicilio",
        path: ["shipping_address"],
      });
    }
  });

const updateOrderStatusSchema = z.object({
  status: z.enum(["pending", "paid", "preparing", "completed", "cancelled"]),
});

module.exports = {
  createOrderSchema,
  updateOrderStatusSchema,
};
