import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  DollarSign,
  ShoppingBag,
  Clock,
  Package,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import api from "../../config/api.js";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/admin/dashboard")
      .then((res) => setStats(res.data.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <p className="text-sm text-slate-500">Cargando resumen del comercio...</p>
    );
  }

  if (!stats) return null;

  const { orders, products, lowStockItems } = stats;

  const cards = [
    {
      label: "Ingresos Confirmados",
      value: `$${Number(orders.confirmed_revenue).toLocaleString("es-AR")}`,
      icon: DollarSign,
      accent: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "Pedidos Pendientes",
      value: orders.pending_orders,
      icon: Clock,
      accent: "text-amber-600 bg-amber-50",
    },
    {
      label: "Pedidos de Hoy",
      value: orders.today_orders,
      icon: ShoppingBag,
      accent: "text-blue-600 bg-blue-50",
    },
    {
      label: "Productos Activos",
      value: `${products.active_products} / ${products.total_products}`,
      icon: Package,
      accent: "text-slate-700 bg-slate-100",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Resumen del Comercio
        </h1>
        <p className="text-sm text-slate-500">
          Estado operativo de ventas, catálogo y alertas de stock en tiempo
          real.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className="bg-white border rounded-xl p-5 flex items-center gap-4"
            >
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center ${c.accent}`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">{c.label}</p>
                <p className="text-xl font-bold text-slate-900 mt-0.5">
                  {c.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Alertas de Stock Bajo + Accesos Rápidos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h2 className="font-bold text-sm text-slate-900">
                Alertas de Stock Mínimo ({lowStockItems.length})
              </h2>
            </div>
            <Link
              to="/admin/products"
              className="text-xs font-semibold text-blue-600 hover:underline inline-flex items-center gap-1"
            >
              Ir al inventario <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {lowStockItems.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center bg-slate-50 rounded-lg">
              Todo tu inventario está por encima del umbral mínimo configurado.
            </p>
          ) : (
            <div className="divide-y text-sm">
              {lowStockItems.map((item) => (
                <div
                  key={item.variant_id}
                  className="py-2.5 flex items-center justify-between gap-2"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {item.product_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      Variante: {item.attribute_value}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                    Quedan {item.stock}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Accesos Directos */}
        <div className="bg-white border rounded-xl p-5 space-y-3">
          <h2 className="font-bold text-sm text-slate-900 mb-2">
            Accesos Rápidos
          </h2>
          <Link
            to="/admin/orders"
            className="block p-3 border rounded-lg hover:bg-slate-50 transition"
          >
            <p className="font-semibold text-sm text-slate-900">
              Revisar Pedidos
            </p>
            <p className="text-xs text-slate-500">
              Confirmar pagos y preparar entregas
            </p>
          </Link>
          <Link
            to="/admin/products"
            className="block p-3 border rounded-lg hover:bg-slate-50 transition"
          >
            <p className="font-semibold text-sm text-slate-900">
              Cargar Producto
            </p>
            <p className="text-xs text-slate-500">
              Sumar artículos nuevos o actualizar precios
            </p>
          </Link>
          <Link
            to="/admin/design"
            className="block p-3 border rounded-lg hover:bg-slate-50 transition"
          >
            <p className="font-semibold text-sm text-slate-900">
              Personalizar Tienda
            </p>
            <p className="text-xs text-slate-500">
              Cambiar logo, banner, paleta y alias
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
