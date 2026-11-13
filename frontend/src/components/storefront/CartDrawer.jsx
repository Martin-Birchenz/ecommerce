import { useState } from "react";
import {
  X,
  Trash2,
  Plus,
  Minus,
  Send,
  CreditCard,
  Landmark,
} from "lucide-react";
import { useStore } from "../../context/StoreContext.jsx";
import { useCart } from "../../context/CartContext.jsx";
import api from "../../config/api.js";

export default function CartDrawer() {
  const { slug, store } = useStore();
  const {
    items,
    isOpen,
    setIsOpen,
    updateQuantity,
    removeItem,
    clearCart,
    subtotal,
  } = useCart();

  const [step, setStep] = useState("cart"); // 'cart' | 'checkout' | 'confirmed'
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [confirmedOrder, setConfirmedOrder] = useState(null);

  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    delivery_method: "pickup",
    delivery_address: "",
    customer_notes: "",
    payment_method: "whatsapp",
  });

  if (!isOpen || !store) return null;

  const shippingCost =
    form.delivery_method === "local_delivery"
      ? Number(store.flat_delivery_cost || 0)
      : 0;
  const total = subtotal + shippingCost;

  const buildWhatsAppLink = (orderData) => {
    const lines = [
      `Hola *${store.name}*! Hice el pedido *#${orderData.orderNumber}*:`,
      "",
      ...orderData.items.map(
        (i) =>
          `• ${i.quantity}x ${i.product_name_snapshot} (${i.variant_label_snapshot}) — $${i.subtotal.toLocaleString("es-AR")}`,
      ),
      "",
      `*Entrega:* ${form.delivery_method === "pickup" ? "Retiro en local" : `Envío (${form.delivery_address})`}`,
      `*Pago:* ${form.payment_method === "transfer" ? "Transferencia bancaria" : "Acordar por WhatsApp"}`,
      `*Total:* $${orderData.totalAmount.toLocaleString("es-AR")}`,
      "",
      `Cliente: ${form.customer_name} (${form.customer_phone})`,
    ];
    return `https://wa.me/${store.whatsapp_number}?text=${encodeURIComponent(lines.join("\n"))}`;
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");

    try {
      const payload = {
        ...form,
        items: items.map((i) => ({
          variant_id: i.variant_id,
          quantity: i.quantity,
        })),
      };

      const res = await api.post(`/public/${slug}/orders`, payload);
      const orderData = res.data.data;

      clearCart();

      if (orderData.mpInitPoint) {
        window.location.href = orderData.mpInitPoint;
        return;
      }

      setConfirmedOrder(orderData);
      setStep("confirmed");

      if (form.payment_method === "whatsapp") {
        window.open(buildWhatsAppLink(orderData), "_blank");
      }
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message || "No se pudo procesar el pedido",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    if (step === "confirmed") {
      setStep("cart");
      setConfirmedOrder(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
      <div
        className="w-full max-w-md h-full flex flex-col shadow-2xl"
        style={{
          backgroundColor: "var(--color-bg)",
          color: "var(--color-text)",
        }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="font-heading font-bold text-lg">
            {step === "cart" && "Tu Pedido"}
            {step === "checkout" && "Finalizar Compra"}
            {step === "confirmed" && "¡Pedido Registrado!"}
          </h2>
          <button
            onClick={handleClose}
            className="p-1.5 opacity-70 hover:opacity-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {step === "cart" && (
            <>
              {items.length === 0 ? (
                <div className="text-center py-16 opacity-60 text-sm">
                  Tu carrito está vacío. Agregá productos del catálogo.
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <div
                      key={item.variant_id}
                      className="flex gap-3 p-3 border"
                      style={{
                        borderRadius: "var(--radius-base)",
                        backgroundColor: "var(--color-surface)",
                      }}
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{item.name}</p>
                        <p className="text-xs opacity-70">
                          {item.variant_label}
                        </p>
                        <p className="font-bold text-sm mt-1">
                          $
                          {(item.unit_price * item.quantity).toLocaleString(
                            "es-AR",
                          )}
                        </p>
                      </div>

                      <div className="flex flex-col items-end justify-between">
                        <button
                          onClick={() => removeItem(item.variant_id)}
                          className="text-red-500 opacity-70 hover:opacity-100 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-2 border px-2 py-1 rounded">
                          <button
                            onClick={() =>
                              updateQuantity(
                                item.variant_id,
                                item.quantity - item.min_step,
                              )
                            }
                            className="cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(
                                item.variant_id,
                                item.quantity + item.min_step,
                              )
                            }
                            className="cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {step === "checkout" && (
            <form
              id="checkout-form"
              onSubmit={handleCheckout}
              className="space-y-4 text-sm"
            >
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-xs">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block font-semibold mb-1">Tu Nombre *</label>
                <input
                  required
                  type="text"
                  value={form.customer_name}
                  onChange={(e) =>
                    setForm({ ...form, customer_name: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded"
                  placeholder="Ej: Juan Pérez"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">
                  WhatsApp / Teléfono *
                </label>
                <input
                  required
                  type="tel"
                  value={form.customer_phone}
                  onChange={(e) =>
                    setForm({ ...form, customer_phone: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded"
                  placeholder="Ej: 3435 123456"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">
                  Método de Entrega
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {store.allow_pickup === 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setForm({ ...form, delivery_method: "pickup" })
                      }
                      className="p-2.5 border text-xs font-semibold cursor-pointer"
                      style={{
                        borderRadius: "var(--radius-base)",
                        backgroundColor:
                          form.delivery_method === "pickup"
                            ? "var(--color-primary)"
                            : "transparent",
                        color:
                          form.delivery_method === "pickup"
                            ? "#fff"
                            : "inherit",
                      }}
                    >
                      Retiro en Local (Gratis)
                    </button>
                  )}
                  {store.allow_delivery === 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setForm({ ...form, delivery_method: "local_delivery" })
                      }
                      className="p-2.5 border text-xs font-semibold cursor-pointer"
                      style={{
                        borderRadius: "var(--radius-base)",
                        backgroundColor:
                          form.delivery_method === "local_delivery"
                            ? "var(--color-primary)"
                            : "transparent",
                        color:
                          form.delivery_method === "local_delivery"
                            ? "#fff"
                            : "inherit",
                      }}
                    >
                      Envío ($
                      {Number(store.flat_delivery_cost).toLocaleString("es-AR")}
                      )
                    </button>
                  )}
                </div>
              </div>

              {form.delivery_method === "local_delivery" && (
                <div>
                  <label className="block font-semibold mb-1">
                    Dirección de Entrega *
                  </label>
                  <input
                    required
                    type="text"
                    value={form.delivery_address}
                    onChange={(e) =>
                      setForm({ ...form, delivery_address: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded"
                    placeholder="Calle, número y referencias"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold mb-1">
                  Forma de Pago
                </label>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() =>
                      setForm({ ...form, payment_method: "whatsapp" })
                    }
                    className="w-full p-2.5 border flex items-center gap-2 text-xs font-semibold cursor-pointer"
                    style={{
                      borderRadius: "var(--radius-base)",
                      borderColor:
                        form.payment_method === "whatsapp"
                          ? "var(--color-primary)"
                          : "#d1d5db",
                    }}
                  >
                    <Send className="w-4 h-4" /> Coordinar por WhatsApp /
                    Efectivo
                  </button>

                  {store.bank_alias && (
                    <button
                      type="button"
                      onClick={() =>
                        setForm({ ...form, payment_method: "transfer" })
                      }
                      className="w-full p-2.5 border flex items-center gap-2 text-xs font-semibold cursor-pointer"
                      style={{
                        borderRadius: "var(--radius-base)",
                        borderColor:
                          form.payment_method === "transfer"
                            ? "var(--color-primary)"
                            : "#d1d5db",
                      }}
                    >
                      <Landmark className="w-4 h-4" /> Transferencia Bancaria
                    </button>
                  )}

                  {store.has_mercadopago === 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setForm({ ...form, payment_method: "mercadopago" })
                      }
                      className="w-full p-2.5 border flex items-center gap-2 text-xs font-semibold cursor-pointer"
                      style={{
                        borderRadius: "var(--radius-base)",
                        borderColor:
                          form.payment_method === "mercadopago"
                            ? "var(--color-primary)"
                            : "#d1d5db",
                      }}
                    >
                      <CreditCard className="w-4 h-4" /> Mercado Pago (Tarjetas
                      / Dinero en cuenta)
                    </button>
                  )}
                </div>
              </div>
            </form>
          )}

          {step === "confirmed" && confirmedOrder && (
            <div className="space-y-4 text-sm">
              <div
                className="p-4 border text-center"
                style={{
                  backgroundColor: "var(--color-surface)",
                  borderRadius: "var(--radius-base)",
                }}
              >
                <p className="text-xs opacity-70">Código de Orden</p>
                <p className="font-heading text-2xl font-bold mt-1">
                  {confirmedOrder.orderNumber}
                </p>
                <p className="text-xs mt-2 opacity-80">
                  Stock reservado correctamente en el sistema.
                </p>
              </div>

              {form.payment_method === "transfer" && store.bank_alias && (
                <div className="p-4 border rounded space-y-1 text-xs">
                  <p className="font-bold text-sm">Datos para Transferencia:</p>
                  <p>
                    <strong>Alias:</strong> {store.bank_alias}
                  </p>
                  {store.bank_cbu && (
                    <p>
                      <strong>CBU/CVU:</strong> {store.bank_cbu}
                    </p>
                  )}
                  {store.bank_holder_name && (
                    <p>
                      <strong>Titular:</strong> {store.bank_holder_name}
                    </p>
                  )}
                </div>
              )}

              <a
                href={buildWhatsAppLink(confirmedOrder)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 flex items-center justify-center gap-2 text-white font-semibold text-sm rounded"
                style={{ backgroundColor: "#25D366" }}
              >
                <Send className="w-4 h-4" /> Enviar Comprobante / Detalle por
                WhatsApp
              </a>
            </div>
          )}
        </div>

        {/* Footer del Drawer */}
        {items.length > 0 && step !== "confirmed" && (
          <div
            className="p-5 border-t space-y-3"
            style={{ backgroundColor: "var(--color-surface)" }}
          >
            <div className="flex justify-between text-sm font-bold">
              <span>Total</span>
              <span>${total.toLocaleString("es-AR")}</span>
            </div>

            {step === "cart" ? (
              <button
                onClick={() => setStep("checkout")}
                className="w-full py-3 text-sm font-semibold text-white cursor-pointer"
                style={{
                  backgroundColor: "var(--color-primary)",
                  borderRadius: "var(--radius-base)",
                }}
              >
                Continuar al Checkout
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep("cart")}
                  className="px-4 py-3 text-xs font-semibold border cursor-pointer"
                  style={{ borderRadius: "var(--radius-base)" }}
                >
                  Volver
                </button>
                <button
                  type="submit"
                  form="checkout-form"
                  disabled={submitting}
                  className="flex-1 py-3 text-sm font-semibold text-white cursor-pointer disabled:opacity-50"
                  style={{
                    backgroundColor: "var(--color-accent)",
                    borderRadius: "var(--radius-base)",
                  }}
                >
                  {submitting ? "Procesando..." : "Confirmar Pedido"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
