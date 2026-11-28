import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ExternalLink, Store, LogOut, ShieldCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import api from "../../config/api.js";
import {
  Plus,
  ExternalLink,
  Store,
  LogOut,
  ShieldCheck,
  Loader2,
  Package,
  ShoppingBag,
  ArrowUpRight,
} from "lucide-react";

export default function SuperAdminDashboard() {
  const { user, isAuthenticated, logout, startImpersonation } = useAuth();
  const navigate = useNavigate();

  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    slug: "",
    business_category: "general",
    whatsapp_number: "549",
    admin_name: "",
    admin_email: "",
    admin_password: "",
    primary_color: "#0F172A",
    secondary_color: "#2563EB",
    accent_color: "#10B981",
  });

  const loadStores = async () => {
    setLoading(true);
    try {
      const res = await api.get("/superadmin/stores");
      setStores(res.data.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.role === "superadmin") {
      loadStores();
    }
  }, [isAuthenticated, user?.role]);

  const handleNameChange = (value) => {
    const generatedSlug = value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
    setForm((prev) => ({ ...prev, name: value, slug: generatedSlug }));
  };

  const handleCreateStore = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      await api.post("/superadmin/stores", form);
      setShowModal(false);
      setForm({
        name: "",
        slug: "",
        business_category: "general",
        whatsapp_number: "549",
        admin_name: "",
        admin_email: "",
        admin_password: "",
        primary_color: "#0F172A",
        secondary_color: "#2563EB",
        accent_color: "#10B981",
      });
      await loadStores();
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo crear el comercio");
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (storeId, planStatus) => {
    await api.patch(`/superadmin/stores/${storeId}/status`, {
      plan_status: planStatus,
    });
    setStores((prev) =>
      prev.map((s) =>
        s.id === storeId ? { ...s, plan_status: planStatus } : s,
      ),
    );
  };

  const handleImpersonate = async (storeId) => {
    try {
      const res = await api.post(`/superadmin/stores/${storeId}/impersonate`);
      const { token, user: storeUser } = res.data.data;

      if (startImpersonation) {
        startImpersonation(token, storeUser);
      } else {
        localStorage.setItem(
          "superadmin_backup_token",
          localStorage.getItem("token") || "",
        );
        localStorage.setItem(
          "superadmin_backup_user",
          localStorage.getItem("user") || "",
        );
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(storeUser));
      }

      window.location.href = "/admin/dashboard";
    } catch (err) {
      alert(err.response?.data?.message || "No se pudo ingresar a la tienda");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70">
      {/* Topbar SuperAdmin */}
      <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md text-white px-6 py-4 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="font-extrabold text-base tracking-tight leading-tight">
                Control Central SaaS
              </h1>
              <p className="text-xs text-slate-400">
                Consola Maestra Multi-Tenant
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              logout();
              navigate("/admin/login");
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" /> Cerrar sesión
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 sm:p-8 space-y-8">
        {/* Encabezado + Métricas Globales */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Comercios Registrados
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Desplegá nuevas tiendas en 1 clic, controlá suscripciones o
              ingresá en modo soporte.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowModal(!showModal)}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {showModal ? "Cerrar Formulario" : "Nuevo Comercio"}
          </button>
        </div>

        {/* Barra de Resumen SaaS */}
        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Tiendas Totales
                </p>
                <p className="text-2xl font-extrabold text-slate-900 mt-1">
                  {stores.length}
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <Store className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Instancias Activas / Demo
                </p>
                <p className="text-2xl font-extrabold text-emerald-600 mt-1">
                  {stores.filter((s) => s.plan_status !== "suspended").length}
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Pedidos Procesados
                </p>
                <p className="text-2xl font-extrabold text-slate-900 mt-1">
                  {stores.reduce(
                    (acc, s) => acc + Number(s.total_orders || 0),
                    0,
                  )}
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5" />
              </div>
            </div>
          </div>
        )}

        {/* Formulario de Alta de Comercio */}
        {showModal && (
          <form
            onSubmit={handleCreateStore}
            className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-5 text-sm shadow-lg"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-lg text-slate-900">
                  Dar de Alta Nuevo Cliente
                </h3>
                <p className="text-xs text-slate-500">
                  Se creará la instancia, configuración inicial y usuario
                  administrador.
                </p>
              </div>
            </div>

            {error && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                  Nombre del Comercio *
                </label>
                <input
                  required
                  type="text"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-slate-900 outline-none"
                  placeholder="Ej: Vinoteca El Roble"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                  Slug URL (/t/slug) *
                </label>
                <input
                  required
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:bg-white focus:border-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                  WhatsApp Comercio *
                </label>
                <input
                  required
                  type="text"
                  value={form.whatsapp_number}
                  onChange={(e) =>
                    setForm({ ...form, whatsapp_number: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-slate-900 outline-none"
                  placeholder="5493435..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                  Nombre del Dueño *
                </label>
                <input
                  required
                  type="text"
                  value={form.admin_name}
                  onChange={(e) =>
                    setForm({ ...form, admin_name: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                  Email de Acceso Admin *
                </label>
                <input
                  required
                  type="email"
                  value={form.admin_email}
                  onChange={(e) =>
                    setForm({ ...form, admin_email: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                  Contraseña Inicial *
                </label>
                <input
                  required
                  type="text"
                  value={form.admin_password}
                  onChange={(e) =>
                    setForm({ ...form, admin_password: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-slate-900 outline-none"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2.5 border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer disabled:opacity-60 inline-flex items-center gap-2"
              >
                {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                {creating ? "Creando instancia..." : "Crear Tienda y Usuario"}
              </button>
            </div>
          </form>
        )}

        {/* Listado de Tiendas con Spinner de Carga */}
        {loading ? (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-16 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-slate-900 animate-spin" />
            <p className="text-sm font-semibold text-slate-600">
              Cargando comercios registrados...
            </p>
          </div>
        ) : stores.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-14 text-center space-y-2">
            <Store className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-800">
              Todavía no hay comercios creados
            </p>
            <p className="text-xs text-slate-500">
              Hacé clic en &ldquo;Nuevo Comercio&rdquo; para lanzar tu primera
              tienda.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {stores.map((s) => {
              const statusColors = {
                active: "bg-emerald-50 text-emerald-700 border-emerald-200",
                demo: "bg-amber-50 text-amber-700 border-amber-200",
                suspended: "bg-red-50 text-red-700 border-red-200",
              };

              return (
                <div
                  key={s.id}
                  className="bg-white border border-slate-200/90 rounded-2xl p-5 flex flex-col justify-between gap-5 shadow-xs hover:shadow-md transition-shadow"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold shrink-0 shadow-xs"
                          style={{
                            backgroundColor: s.primary_color || "#0F172A",
                          }}
                        >
                          <Store className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-extrabold text-slate-900 truncate">
                            {s.name}
                          </h3>
                          <p className="text-xs font-mono text-slate-500 truncate">
                            /t/{s.slug}
                          </p>
                        </div>
                      </div>

                      <select
                        value={s.plan_status}
                        onChange={(e) =>
                          handleStatusChange(s.id, e.target.value)
                        }
                        className={`text-xs font-bold border rounded-lg px-2.5 py-1 cursor-pointer outline-none ${
                          statusColors[s.plan_status] ||
                          "bg-slate-50 text-slate-700"
                        }`}
                      >
                        <option value="demo">Demo</option>
                        <option value="active">Activo</option>
                        <option value="suspended">Suspendido</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-slate-100">
                      <div className="bg-slate-50 rounded-xl p-2.5 flex items-center gap-2">
                        <Package className="w-4 h-4 text-slate-400" />
                        <div className="text-xs">
                          <span className="text-slate-500 block">
                            Productos
                          </span>
                          <strong className="text-slate-900 text-sm">
                            {s.total_products ?? 0}
                          </strong>
                        </div>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-2.5 flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4 text-slate-400" />
                        <div className="text-xs">
                          <span className="text-slate-500 block">Pedidos</span>
                          <strong className="text-slate-900 text-sm">
                            {s.total_orders ?? 0}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => handleImpersonate(s.id)}
                      className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>Administrar Tienda</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>

                    <a
                      href={`/t/${s.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 hover:bg-slate-50 transition"
                    >
                      <span>Abrir Tienda Pública</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
