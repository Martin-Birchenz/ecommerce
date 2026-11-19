import { useState, useEffect } from "react";
import {
  X,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  MessageCircle,
  Tag,
  Truck,
} from "lucide-react";
import { useCart } from "../../context/CartContext.jsx";
import { useTenant } from "../../context/TenantContext.jsx";
import api from "../../config/api.js";

export default function CartDrawer() {
  const {
    items,
    subtotal,
    isCartOpen,
    setIsCartOpen,
    updateQty,
    removeItem,
    clearCart,
  } = useCart();
  const { storeData } = useTenant();
  const { store, settings } = storeData;

  const shippingZones = Array.isArray(settings.shipping_zones)
    ? settings.shipping_zones
    : typeof settings.shipping_zones === "string"
      ? JSON.parse(settings.shipping_zones || "[]")
      : [];

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryType, setDeliveryType] = useState(
    settings.pickup_enabled ? "pickup" : "delivery",
  );
  const [selectedZoneName, setSelectedZoneName] = useState(
    shippingZones[0]?.name || "",
  );
  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingNotes, setShippingNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(
    settings.mp_enabled
      ? "mercadopago"
      : settings.transfer_enabled
        ? "transfer"
        : "cash_pickup",
  );

  // Estado de Cupón
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState("");
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmedOrder, setConfirmedOrder] = useState(null);

  useEffect(() => {
    if (shippingZones.length > 0 && !selectedZoneName) {
      setSelectedZoneName(shippingZones[0].name);
    }
  }, [shippingZones, selectedZoneName]);

  // Recalcular descuento si cambia el subtotal con un cupón aplicado
  useEffect(() => {
    if (!appliedCoupon) return;
    if (subtotal <= 0) {
      setAppliedCoupon(null);
      return;
    }
    const newDiscount =
      appliedCoupon.discount_type === "percentage"
        ? Number(((subtotal * appliedCoupon.discount_value) / 100).toFixed(2))
        : Math.min(subtotal, appliedCoupon.discount_value);
    setAppliedCoupon((prev) => ({ ...prev, discount_amount: newDiscount }));
  }, [subtotal]);

  if (!isCartOpen) return null;

  const discountAmount = appliedCoupon
    ? Number(appliedCoupon.discount_amount)
    : 0;
  const netMerchandise = Math.max(0, subtotal - discountAmount);

  // Cálculo de envío (zona o tarifa plana, y regla de envío gratis)
  const freeShippingMin = settings.free_shipping_min
    ? Number(settings.free_shipping_min)
    : null;
  const qualifiesFreeShipping =
    freeShippingMin && freeShippingMin > 0 && netMerchandise >= freeShippingMin;

  let rawZoneCost = Number(settings.flat_delivery_cost || 0);
  if (shippingZones.length > 0 && selectedZoneName) {
    const found = shippingZones.find((z) => z.name === selectedZoneName);
    if (found) rawZoneCost = Number(found.cost || 0);
  }

  const shippingCost =
    deliveryType === "delivery" ? (qualifiesFreeShipping ? 0 : rawZoneCost) : 0;

  const total = netMerchandise + shippingCost;

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponError("");
    setValidatingCoupon(true);
    try {
      const res = await api.post("/public/coupons/validate", {
        code: couponInput.trim(),
        subtotal,
      });
      setAppliedCoupon(res.data.data);
      setCouponInput("");
    } catch (err) {
      setAppliedCoupon(null);
      setCouponError(err.response?.data?.message || "Cupón inválido");
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const orderRes = await api.post("/public/orders", {
        customer_name: customerName,
        customer_phone: customerPhone,
        delivery_type: deliveryType,
        shipping_zone_name:
          deliveryType === "delivery" && shippingZones.length > 0
            ? selectedZoneName
            : null,
        shipping_address: deliveryType === "delivery" ? shippingAddress : null,
        shipping_notes: shippingNotes || null,
        payment_method: paymentMethod,
        coupon_code: appliedCoupon?.code || null,
        items: items.map((i) => ({
          variant_id: i.variant_id,
          quantity: i.quantity,
        })),
      });

      const createdOrder = orderRes.data.data;

      if (paymentMethod === "mercadopago") {
        const mpRes = await api.post(
          "/public/payments/mercadopago/preference",
          {
            order_id: createdOrder.id,
          },
        );
        clearCart();
        window.location.href = mpRes.data.data.init_point;
        return;
      }

      clearCart();
      setAppliedCoupon(null);
      setConfirmedOrder(createdOrder);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "No se pudo procesar el pedido. Verificá los datos.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const buildWhatsAppLink = (order) => {
    const lines = order.items
      .map(
        (i) =>
          `• ${i.quantity}x ${i.product_name_snapshot} (${i.variant_label_snapshot}) - $${Number(
            i.subtotal,
          ).toLocaleString("es-AR")}`,
      )
      .join("\n");

    const discountLine =
      Number(order.discount_amount) > 0
        ? `\n*Descuento (${order.coupon_code}):* -$${Number(order.discount_amount).toLocaleString("es-AR")}`
        : "";

    const msg = `¡Hola ${store.name}! Hice el pedido *#${order.order_number}* desde la tienda online:\n\n${lines}${discountLine}\n\n*Total:* $${Number(
      order.total_amount,
    ).toLocaleString("es-AR")}\n*Entrega:* ${
      deliveryType === "delivery"
        ? `Envío a ${shippingAddress}`
        : "Retiro en local"
    }\n*Pago:* ${
      paymentMethod === "transfer"
        ? "Transferencia bancaria"
        : "Efectivo al retirar"
    }`;

    const phone = (settings.whatsapp_number || "").replace(/\D/g, "");
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="font-bold text-lg text-slate-900">Tu Pedido</h2>
          <button
            type="button"
            onClick={() => {
              setConfirmedOrder(null);
              setIsCartOpen(false);
            }}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de progreso de Envío Gratis */}
        {!confirmedOrder &&
          items.length > 0 &&
          freeShippingMin &&
          freeShippingMin > 0 && (
            <div className="px-5 py-2.5 bg-emerald-50 border-b border-emerald-100 text-xs text-emerald-900 flex items-center gap-2">
              <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
              {qualifiesFreeShipping ? (
                <span className="font-bold">
                  ¡Tenés ENVÍO GRATIS en este pedido!
                </span>
              ) : (
                <span>
                  Sumá{" "}
                  <strong>
                    $
                    {(freeShippingMin - netMerchandise).toLocaleString("es-AR")}
                  </strong>{" "}
                  más para tener <strong>Envío Gratis</strong>.
                </span>
              )}
            </div>
          )}

        {/* Confirmación */}
        {confirmedOrder ? (
          <div className="p-6 flex-1 overflow-y-auto flex flex-col items-center text-center justify-center">
            <CheckCircle2 className="w-14 h-14 text-emerald-500 mb-3" />
            <h3 className="text-xl font-extrabold text-slate-900">
              ¡Pedido #{confirmedOrder.order_number} registrado!
            </h3>
            <p className="text-sm text-slate-600 mt-2">
              Tu stock ya quedó reservado. Completá el paso final para coordinar
              con <strong>{store.name}</strong>:
            </p>

            {paymentMethod === "transfer" && (
              <div className="w-full mt-5 p-4 rounded-xl bg-slate-50 border text-left text-sm space-y-1">
                <p className="font-bold text-slate-900 mb-1">
                  Datos para transferir:
                </p>
                {settings.transfer_holder && (
                  <p>
                    <span className="text-slate-500">Titular:</span>{" "}
                    {settings.transfer_holder}
                  </p>
                )}
                {settings.transfer_alias && (
                  <p>
                    <span className="text-slate-500">Alias:</span>{" "}
                    <strong className="select-all">
                      {settings.transfer_alias}
                    </strong>
                  </p>
                )}
                {settings.transfer_cbu && (
                  <p>
                    <span className="text-slate-500">CBU/CVU:</span>{" "}
                    <strong className="select-all">
                      {settings.transfer_cbu}
                    </strong>
                  </p>
                )}
                <p className="pt-2 font-bold text-slate-900">
                  Monto a transferir: $
                  {Number(confirmedOrder.total_amount).toLocaleString("es-AR")}
                </p>
              </div>
            )}

            {settings.whatsapp_number && (
              <a
                href={buildWhatsAppLink(confirmedOrder)}
                target="_blank"
                rel="noreferrer"
                className="w-full mt-5 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm inline-flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                {paymentMethod === "transfer"
                  ? "Enviar Comprobante por WhatsApp"
                  : "Confirmar Pedido por WhatsApp"}
              </a>
            )}
          </div>
        ) : items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-6 text-slate-500 text-sm">
            Tu carrito está vacío. Agregá productos del catálogo para comenzar.
          </div>
        ) : (
          <form
            onSubmit={handleCheckout}
            className="flex-1 overflow-y-auto p-5 space-y-5"
          >
            {/* Items */}
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.variant_id}
                  className="flex gap-3 items-center bg-slate-50 p-3 rounded-xl border"
                >
                  <img
                    src={
                      item.image_url || "https://placehold.co/80x80?text=Item"
                    }
                    alt={item.product_name}
                    className="w-14 h-14 rounded-lg object-cover bg-white"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-900 truncate">
                      {item.product_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.variant_label}
                    </p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">
                      $
                      {(item.unit_price * item.quantity).toLocaleString(
                        "es-AR",
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        updateQty(item.variant_id, item.quantity - 1)
                      }
                      className="w-7 h-7 rounded border bg-white flex items-center justify-center"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-bold w-5 text-center">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateQty(item.variant_id, item.quantity + 1)
                      }
                      disabled={item.quantity >= item.max_stock}
                      className="w-7 h-7 rounded border bg-white flex items-center justify-center disabled:opacity-40"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(item.variant_id)}
                      className="p-1.5 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Cupón de Descuento */}
            <div className="border-t pt-4">
              <label className="text-xs font-bold uppercase text-slate-500 flex items-center gap-1 mb-2">
                <Tag className="w-3.5 h-3.5" /> ¿Tenés un cupón de descuento?
              </label>

              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg text-xs">
                  <span className="font-bold text-emerald-800">
                    Cupón {appliedCoupon.code} aplicado (-$
                    {discountAmount.toLocaleString("es-AR")})
                  </span>
                  <button
                    type="button"
                    onClick={() => setAppliedCoupon(null)}
                    className="text-emerald-700 underline font-semibold"
                  >
                    Quitar
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ej: BIENVENIDA10"
                    value={couponInput}
                    onChange={(e) =>
                      setCouponInput(e.target.value.toUpperCase())
                    }
                    className="flex-1 px-3 py-2 border rounded-lg text-xs uppercase"
                  />
                  <button
                    type="button"
                    disabled={validatingCoupon || !couponInput.trim()}
                    onClick={handleApplyCoupon}
                    className="px-3.5 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold disabled:opacity-50"
                  >
                    {validatingCoupon ? "..." : "Aplicar"}
                  </button>
                </div>
              )}
              {couponError && (
                <p className="text-xs text-red-600 mt-1">{couponError}</p>
              )}
            </div>

            {/* Datos del cliente */}
            <div className="space-y-3 border-t pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                1. Tus datos
              </h3>
              <input
                type="text"
                required
                placeholder="Nombre y apellido *"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
              <input
                type="tel"
                required
                placeholder="WhatsApp / Teléfono (ej: 3435123456) *"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>

            {/* Entrega y Zonas */}
            <div className="space-y-2.5 border-t pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                2. Entrega
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {settings.pickup_enabled && (
                  <button
                    type="button"
                    onClick={() => setDeliveryType("pickup")}
                    className={`p-2.5 rounded-lg border text-xs font-semibold text-left ${
                      deliveryType === "pickup"
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "bg-white text-slate-700"
                    }`}
                  >
                    Retiro en local
                    <span className="block text-[11px] opacity-80">Gratis</span>
                  </button>
                )}
                {settings.delivery_enabled && (
                  <button
                    type="button"
                    onClick={() => setDeliveryType("delivery")}
                    className={`p-2.5 rounded-lg border text-xs font-semibold text-left ${
                      deliveryType === "delivery"
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "bg-white text-slate-700"
                    }`}
                  >
                    Envío a domicilio
                    <span className="block text-[11px] opacity-80">
                      {qualifiesFreeShipping
                        ? "Gratis"
                        : shippingZones.length > 0
                          ? "Según zona"
                          : Number(settings.flat_delivery_cost) > 0
                            ? `+$${Number(settings.flat_delivery_cost).toLocaleString("es-AR")}`
                            : "A coordinar"}
                    </span>
                  </button>
                )}
              </div>

              {deliveryType === "delivery" && (
                <div className="space-y-2 pt-1">
                  {shippingZones.length > 0 && (
                    <select
                      value={selectedZoneName}
                      onChange={(e) => setSelectedZoneName(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                    >
                      {shippingZones.map((z, idx) => (
                        <option key={idx} value={z.name}>
                          {z.name} —{" "}
                          {qualifiesFreeShipping
                            ? "Gratis"
                            : `$${Number(z.cost).toLocaleString("es-AR")}`}
                        </option>
                      ))}
                    </select>
                  )}

                  <input
                    type="text"
                    required
                    placeholder="Dirección completa (calle, número, barrio) *"
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              )}

              <input
                type="text"
                placeholder="Notas opcionales (timbre, horario, etc.)"
                value={shippingNotes}
                onChange={(e) => setShippingNotes(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>

            {/* Medio de pago */}
            <div className="space-y-2 border-t pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                3. Medio de pago
              </h3>
              <div className="space-y-2">
                {settings.mp_enabled && (
                  <label className="flex items-center gap-2.5 p-2.5 border rounded-lg cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="mercadopago"
                      checked={paymentMethod === "mercadopago"}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                    <span className="font-medium">
                      Mercado Pago (Tarjetas / Dinero en cuenta)
                    </span>
                  </label>
                )}
                {settings.transfer_enabled && (
                  <label className="flex items-center gap-2.5 p-2.5 border rounded-lg cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="transfer"
                      checked={paymentMethod === "transfer"}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                    <span className="font-medium">Transferencia Bancaria</span>
                  </label>
                )}
                {settings.cash_pickup_enabled && (
                  <label className="flex items-center gap-2.5 p-2.5 border rounded-lg cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cash_pickup"
                      checked={paymentMethod === "cash_pickup"}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                    <span className="font-medium">
                      Efectivo al retirar / recibir
                    </span>
                  </label>
                )}
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs font-medium">
                {error}
              </div>
            )}

            {/* Resumen */}
            <div className="border-t pt-4 space-y-1 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span>${subtotal.toLocaleString("es-AR")}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Descuento ({appliedCoupon.code})</span>
                  <span>-${discountAmount.toLocaleString("es-AR")}</span>
                </div>
              )}
              {deliveryType === "delivery" && (
                <div className="flex justify-between text-slate-500">
                  <span>Envío</span>
                  <span>
                    {shippingCost === 0
                      ? "Gratis"
                      : `$${shippingCost.toLocaleString("es-AR")}`}
                  </span>
                </div>
              )}
              <div className="flex justify-between font-extrabold text-base text-slate-900 pt-1">
                <span>Total</span>
                <span>${total.toLocaleString("es-AR")}</span>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-3 py-3 rounded-xl text-white font-bold text-sm transition opacity-95 hover:opacity-100 disabled:opacity-50"
                style={{ backgroundColor: "var(--store-primary)" }}
              >
                {submitting
                  ? "Procesando..."
                  : paymentMethod === "mercadopago"
                    ? "Ir a pagar con Mercado Pago"
                    : "Confirmar Pedido"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
