import { useEffect, useState } from "react";
import { Plus, Tag } from "lucide-react";
import api from "../../config/api.js";

export default function CouponsManager() {
  const [coupons, setCoupons] = useState([]);
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [minOrderAmount, setMinOrderAmount] = useState("");
  const [usageLimit, setUsageLimit] = useState("");

  const loadCoupons = async () => {
    const res = await api.get("/admin/coupons");
    setCoupons(res.data.data);
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin/coupons", {
        code,
        discount_type: discountType,
        discount_value: Number(discountValue),
        min_order_amount: Number(minOrderAmount || 0),
        usage_limit: usageLimit ? Number(usageLimit) : null,
      });
      setCode("");
      setDiscountValue("");
      setMinOrderAmount("");
      setUsageLimit("");
      loadCoupons();
    } catch (err) {
      alert(err.response?.data?.message || "No se pudo crear el cupón");
    }
  };

  const handleToggle = async (id) => {
    await api.patch(`/admin/coupons/${id}/toggle`);
    loadCoupons();
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Cupones y Promociones
        </h1>
        <p className="text-sm text-slate-500">
          Creá códigos de descuento porcentual o monto fijo para campañas en
          redes.
        </p>
      </div>

      {/* Formulario Nuevo Cupón */}
      <form
        onSubmit={handleCreate}
        className="bg-white border rounded-xl p-5 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end"
      >
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Código *
          </label>
          <input
            type="text"
            required
            placeholder="BIENVENIDA15"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="w-full px-3 py-2 border rounded-lg text-sm uppercase"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Tipo
          </label>
          <select
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
          >
            <option value="percentage">% Porcentaje</option>
            <option value="fixed">$ Monto Fijo</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Valor *
          </label>
          <input
            type="number"
            required
            min="1"
            placeholder={discountType === "percentage" ? "15" : "5000"}
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Compra Mínima ($)
          </label>
          <input
            type="number"
            min="0"
            placeholder="0"
            value={minOrderAmount}
            onChange={(e) => setMinOrderAmount(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
        </div>

        <button
          type="submit"
          className="py-2 px-4 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 inline-flex items-center justify-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Crear Cupón
        </button>
      </form>

      {/* Tabla de Cupones */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Descuento</th>
              <th className="px-4 py-3">Compra Mín.</th>
              <th className="px-4 py-3">Usos</th>
              <th className="px-4 py-3 text-right">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {coupons.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-bold text-slate-900 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-slate-400" /> {c.code}
                </td>
                <td className="px-4 py-3 font-semibold text-emerald-700">
                  {c.discount_type === "percentage"
                    ? `${Number(c.discount_value)}% OFF`
                    : `$${Number(c.discount_value).toLocaleString("es-AR")}`}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  ${Number(c.min_order_amount).toLocaleString("es-AR")}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {c.used_count} {c.usage_limit ? `/ ${c.usage_limit}` : ""}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleToggle(c.id)}
                    className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      c.is_active
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {c.is_active ? "Activo" : "Pausado"}
                  </button>
                </td>
              </tr>
            ))}
            {coupons.length === 0 && (
              <tr>
                <td
                  colSpan="5"
                  className="px-4 py-8 text-center text-slate-500"
                >
                  Todavía no creaste cupones de descuento.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
