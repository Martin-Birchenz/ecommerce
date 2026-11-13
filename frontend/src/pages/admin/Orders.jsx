import { useEffect, useState } from "react";
import { MessageCircle, RefreshCw } from "lucide-react";
import api from "../../config/api.js";

const STATUS_LABELS = {
  pending: { label: "Pendiente", color: "bg-amber-100 text-amber-800" },
  paid: { label: "Pagado", color: "bg-emerald-100 text-emerald-800" },
  preparing: { label: "En preparación", color: "bg-blue-100 text-blue-800" },
  completed: { label: "Entregado", color: "bg-slate-200 text-slate-800" },
  cancelled: { label: "Cancelado", color: "bg-red-100 text-red-800" },
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/orders");
      setOrders(res.data.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleStatusChange = async (orderId, newStatus) => {
    await api.patch(`/admin/orders/${orderId}/status`, { status: newStatus });
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)),
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Pedidos Entrantes
          </h1>
          <p className="text-sm text-slate-500">
            Controlá estados de pago, entregas y contacto con clientes.
          </p>
        </div>

        <button
          onClick={loadOrders}
          className="inline-flex items-center gap-2 px-3.5 py-2 border bg-white rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" /> Actualizar
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Cargando pedidos...</p>
      ) : orders.length === 0 ? (
        <div className="bg-white border rounded-xl p-10 text-center text-sm text-slate-500">
          Aún no recibiste pedidos en esta tienda.
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const badge = STATUS_LABELS[order.status] || STATUS_LABELS.pending;
            const cleanPhone = order.customer_phone.replace(/\D/g, "");
            return (
              <div
                key={order.id}
                className="bg-white border rounded-xl p-5 space-y-4 text-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-base text-slate-900">
                        {order.order_number}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${badge.color}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Cliente: <strong>{order.customer_name}</strong> (
                      {order.customer_phone}) •{" "}
                      {order.delivery_method === "pickup"
                        ? "Retiro en local"
                        : `Envío: ${order.delivery_address || ""}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`https://wa.me/${cleanPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                    </a>

                    <select
                      value={order.status}
                      onChange={(e) =>
                        handleStatusChange(order.id, e.target.value)
                      }
                      className="px-3 py-1.5 border rounded-lg text-xs font-semibold bg-slate-50"
                    >
                      <option value="pending">Pendiente</option>
                      <option value="paid">Pagado</option>
                      <option value="preparing">En preparación</option>
                      <option value="completed">Entregado</option>
                      <option value="cancelled">
                        Cancelado (repone stock)
                      </option>
                    </select>
                  </div>
                </div>

                {/* Ítems del Pedido */}
                <div className="space-y-1.5">
                  {order.items?.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between text-xs text-slate-700"
                    >
                      <span>
                        <strong>{item.quantity}x</strong>{" "}
                        {item.product_name_snapshot} (
                        {item.variant_label_snapshot})
                      </span>
                      <span className="font-semibold">
                        ${Number(item.subtotal).toLocaleString("es-AR")}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-2 border-t font-bold text-slate-900">
                  <span className="text-xs uppercase text-slate-500">
                    Pago: {order.payment_method}
                  </span>
                  <span className="text-base">
                    Total: ${Number(order.total_amount).toLocaleString("es-AR")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
