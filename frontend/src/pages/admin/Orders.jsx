import { useEffect, useState } from "react";
import { Printer, Truck } from "lucide-react";
import api from "../../config/api.js";

const STATUS_LABELS = {
  pending: { text: "Pendiente", color: "bg-amber-100 text-amber-800" },
  paid: { text: "Pagado", color: "bg-emerald-100 text-emerald-800" },
  preparing: { text: "En Preparación", color: "bg-blue-100 text-blue-800" },
  completed: { text: "Entregado", color: "bg-slate-200 text-slate-800" },
  cancelled: { text: "Cancelado", color: "bg-red-100 text-red-700" },
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [generatingLabelId, setGeneratingLabelId] = useState(null);

  const loadOrders = async (status = filterStatus) => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/orders?status=${status}`);
      setOrders(res.data.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders(filterStatus);
  }, [filterStatus]);

  const handleStatusChange = async (orderId, newStatus) => {
    if (
      newStatus === "cancelled" &&
      !confirm(
        "¿Cancelar este pedido? El stock de los productos volverá a sumarse automáticamente.",
      )
    ) {
      return;
    }
    try {
      await api.patch(`/admin/orders/${orderId}/status`, { status: newStatus });
      loadOrders(filterStatus);
    } catch (err) {
      alert(err.response?.data?.message || "No se pudo actualizar el estado");
    }
  };

  const handleGenerateAndPrintLabel = async (order, carrier = null) => {
    setGeneratingLabelId(order.id);
    try {
      await api.post(`/admin/orders/${order.id}/shipping-label`, {
        carrier,
      });
      await loadOrders(filterStatus);

      const htmlRes = await api.get(
        `/admin/orders/${order.id}/shipping-label/print`,
        { responseType: "text" },
      );
      const win = window.open("", "_blank", "width=460,height=680");
      if (win) {
        win.document.write(htmlRes.data);
        win.document.close();
      }
    } catch (err) {
      alert(
        err.response?.data?.message ||
          "No se pudo generar la etiqueta de envío",
      );
    } finally {
      setGeneratingLabelId(null);
    }
  };

  const printOrderTicket = (order) => {
    const win = window.open("", "_blank", "width=380,height=650");
    if (!win) return;

    const itemsHtml = order.items
      .map(
        (i) => `
        <tr>
          <td style="padding:4px 0;">${i.quantity}x ${i.product_name_snapshot} (${i.variant_label_snapshot})</td>
          <td style="text-align:right;padding:4px 0;">$${Number(i.subtotal).toLocaleString("es-AR")}</td>
        </tr>`,
      )
      .join("");

    win.document.write(`
      <html>
        <head>
          <title>Comanda #${order.order_number}</title>
          <style>
            body { font-family: monospace; width: 300px; margin: 0 auto; padding: 12px; font-size: 12px; color: #000; }
            h2 { margin: 0 0 4px; font-size: 16px; text-align: center; }
            p { margin: 3px 0; }
            hr { border: none; border-top: 1px dashed #000; margin: 8px 0; }
            table { width: 100%; border-collapse: collapse; }
          </style>
        </head>
        <body>
          <h2>COMANDA DE PEDIDO</h2>
          <p style="text-align:center;"><strong>#${order.order_number}</strong></p>
          <p style="text-align:center;">${new Date(order.created_at).toLocaleString("es-AR")}</p>
          <hr/>
          <p><strong>Cliente:</strong> ${order.customer_name}</p>
          <p><strong>Tel:</strong> ${order.customer_phone}</p>
          <p><strong>Entrega:</strong> ${
            order.delivery_type === "delivery"
              ? `Envío: ${order.shipping_address || ""}`
              : "Retiro en local"
          }</p>
          ${order.shipping_tracking_code ? `<p><strong>Tracking:</strong> ${order.shipping_tracking_code}</p>` : ""}
          ${order.shipping_notes ? `<p><strong>Notas:</strong> ${order.shipping_notes}</p>` : ""}
          <p><strong>Pago:</strong> ${order.payment_method.toUpperCase()}</p>
          <hr/>
          <table>${itemsHtml}</table>
          <hr/>
          ${
            Number(order.discount_amount) > 0
              ? `<p style="text-align:right;">Descuento (${order.coupon_code}): -$${Number(
                  order.discount_amount,
                ).toLocaleString("es-AR")}</p>`
              : ""
          }
          ${
            Number(order.shipping_cost) > 0
              ? `<p style="text-align:right;">Envío: $${Number(
                  order.shipping_cost,
                ).toLocaleString("es-AR")}</p>`
              : ""
          }
          <p style="text-align:right;font-size:15px;"><strong>TOTAL: $${Number(
            order.total_amount,
          ).toLocaleString("es-AR")}</strong></p>
          <hr/>
          <p style="text-align:center;">¡Gracias por su compra!</p>
          <script>window.onload = function() { window.print(); window.close(); };</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pedidos</h1>
          <p className="text-sm text-slate-500">
            Confirmá pagos, generá etiquetas de Correo Argentino / Andreani o
            imprimí comandas.
          </p>
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {[
            "all",
            "pending",
            "paid",
            "preparing",
            "completed",
            "cancelled",
          ].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                filterStatus === st
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600"
              }`}
            >
              {st === "all" ? "Todos" : STATUS_LABELS[st].text}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Cargando pedidos...</p>
      ) : orders.length === 0 ? (
        <div className="bg-white border rounded-xl p-10 text-center text-sm text-slate-500">
          No hay pedidos registrados en este estado.
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const badge = STATUS_LABELS[order.status] || STATUS_LABELS.pending;
            const isBusy = generatingLabelId === order.id;

            return (
              <div
                key={order.id}
                className="bg-white border rounded-xl p-5 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-slate-900">
                        #{order.order_number}
                      </span>
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${badge.color}`}
                      >
                        {badge.text}
                      </span>
                      {order.shipping_tracking_code && (
                        <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200">
                          {order.shipping_carrier === "andreani"
                            ? "Andreani"
                            : "Correo Arg."}{" "}
                          · {order.shipping_tracking_code}
                        </span>
                      )}
                      <span className="text-xs text-slate-400">
                        {new Date(order.created_at).toLocaleString("es-AR")}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 mt-1">
                      <strong>{order.customer_name}</strong> · Tel:{" "}
                      {order.customer_phone} ·{" "}
                      {order.delivery_type === "delivery"
                        ? `Envío: ${order.shipping_address}`
                        : "Retiro en local"}
                    </p>
                    {order.shipping_notes && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        Nota: {order.shipping_notes}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {order.delivery_type === "delivery" &&
                      order.status !== "cancelled" && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleGenerateAndPrintLabel(order)}
                          title="Generar e imprimir etiqueta de envío"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          {isBusy
                            ? "Generando..."
                            : order.shipping_tracking_code
                              ? "Reimprimir Etiqueta"
                              : "Etiqueta Envío"}
                        </button>
                      )}

                    <button
                      type="button"
                      onClick={() => printOrderTicket(order)}
                      title="Imprimir Ticket / Comanda"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Printer className="w-3.5 h-3.5" /> Ticket
                    </button>

                    <select
                      value={order.status}
                      onChange={(e) =>
                        handleStatusChange(order.id, e.target.value)
                      }
                      className="px-3 py-1.5 border rounded-lg text-xs font-semibold bg-white"
                    >
                      <option value="pending">Pendiente</option>
                      <option value="paid">Pagado</option>
                      <option value="preparing">En Preparación</option>
                      <option value="completed">Entregado</option>
                      <option value="cancelled">
                        Cancelado (devolver stock)
                      </option>
                    </select>
                  </div>
                </div>

                <div className="text-xs space-y-1 text-slate-600">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between">
                      <span>
                        {item.quantity}x {item.product_name_snapshot} (
                        {item.variant_label_snapshot})
                      </span>
                      <span className="font-semibold">
                        ${Number(item.subtotal).toLocaleString("es-AR")}
                      </span>
                    </div>
                  ))}
                  {Number(order.discount_amount) > 0 && (
                    <div className="flex justify-between text-emerald-700 font-semibold pt-1">
                      <span>Cupón {order.coupon_code}</span>
                      <span>
                        -$
                        {Number(order.discount_amount).toLocaleString("es-AR")}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-sm text-slate-900 pt-2 border-t">
                    <span>Total ({order.payment_method})</span>
                    <span>
                      ${Number(order.total_amount).toLocaleString("es-AR")}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
