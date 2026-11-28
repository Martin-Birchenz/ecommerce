import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  ExternalLink,
  Store,
  LogOut,
  ShieldCheck,
  Loader2,
  Search,
  Package,
  ShoppingBag,
  ArrowUpRight,
  X,
} from "lucide-react";
import api from "../../config/api.js";
import { useAuth } from "../../context/AuthContext.jsx";

const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

export default function SuperAdminDashboard() {
  const { logout, impersonateStore } = useAuth();
  const navigate = useNavigate();

  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [impersonatingId, setImpersonatingId] = useState(null);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    slug: "",
    whatsapp_number: "",
    admin_name: "",
    admin_email: "",
    admin_password: "",
  });

  const loadStores = async () => {
    setLoading(true);
    try {
      const res = await api.get("/superadmin/stores");
      setStores(res.data?.data || []);
    } catch (err) {
      console.error("Error cargando tiendas:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStores();
  }, []);

  const handleNameChange = (val) => {
    setForm((prev) => ({
      ...prev,
      name: val,
      slug: slugify(val),
    }));
  };

  const handleCreateStore = async (e) => {
    e.preventDefault();
    setError("");
    setCreating(true);
    try {
      await api.post("/superadmin/stores", form);
      setShowModal(false);
      setForm({
        name: "",
        slug: "",
        whatsapp_number: "",
        admin_name: "",
        admin_email: "",
        admin_password: "",
      });
      await loadStores();
    } catch (err) {
      setError(
        err.response?.data?.message || "No se pudo crear el nuevo comercio",
      );
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (storeId, plan_status) => {
    try {
      await api.patch(`/superadmin/stores/${storeId}/status`, { plan_status });
      setStores((prev) =>
        prev.map((s) => (s.id === storeId ? { ...s, plan_status } : s)),
      );
    } catch (err) {
      alert(err.response?.data?.message || "No se pudo actualizar el estado");
    }
  };

  const handleImpersonate = async (storeId) => {
    setImpersonatingId(storeId);
    try {
      await impersonateStore(storeId);
      navigate("/admin");
    } catch (err) {
      alert(err.response?.data?.message || "No se pudo ingresar a la tienda");
      setImpersonatingId(null);
    }
  };

  const filteredStores = stores.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.slug.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || s.plan_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100">
      {/* Topbar */}
      <header className="sticky top-0 z-30 bg-[#0B0F19]/90 backdrop-blur-md border-b border-white/10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="font-extrabold text-base text-white tracking-tight">
                Control Central SaaS
              </h1>
              <p className="text-xs text-slate-400">
                Administración Multi-Tenant
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              logout();
              navigate("/admin/login");
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" /> Salir
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 sm:p-8 space-y-8">
        {/* Hero Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Ecosistema de Comercios
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Desplegá nuevas instancias en segundos o ingresá en modo soporte.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-emerald-500/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" /> Nuevo Comercio
          </button>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Comercios Totales
              </span>
              <p className="text-3xl font-extrabold text-white mt-1">
                {loading ? "—" : stores.length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-slate-300">
              <Store className="w-6 h-6" />
            </div>
          </div>

          <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Activos / Demo
              </span>
              <p className="text-3xl font-extrabold text-emerald-400 mt-1">
                {loading
                  ? "—"
                  : stores.filter((s) => s.plan_status !== "suspended").length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>

          <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Pedidos Globales
              </span>
              <p className="text-3xl font-extrabold text-white mt-1">
                {loading
                  ? "—"
                  : stores.reduce(
                      (acc, s) => acc + Number(s.total_orders || 0),
                      0,
                    )}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <ShoppingBag className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Barra de Búsqueda y Filtros */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nombre o slug..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-400"
            />
          </div>

          <div className="flex gap-1.5 flex-wrap">
            {[
              { id: "all", label: "Todos" },
              { id: "active", label: "Activos" },
              { id: "demo", label: "Demo" },
              { id: "suspended", label: "Suspendidos" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  statusFilter === tab.id
                    ? "bg-emerald-500 text-slate-950"
                    : "bg-white/5 text-slate-400 hover:text-white border border-white/10"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Modal Alta de Comercio */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <form
              onSubmit={handleCreateStore}
              className="w-full max-w-2xl rounded-3xl bg-slate-900 border border-white/15 p-6 sm:p-8 space-y-5 text-sm shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h3 className="font-extrabold text-lg text-white">
                    Alta de Nuevo Comercio
                  </h3>
                  <p className="text-xs text-slate-400">
                    Creación automática de tienda, tema inicial y administrador.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Nombre Comercio *
                  </label>
                  <input
                    required
                    type="text"
                    value={form.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-emerald-400"
                    placeholder="Ej: Vinoteca El Roble"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Slug (/t/slug) *
                  </label>
                  <input
                    required
                    type="text"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-emerald-300 font-mono text-xs outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    WhatsApp *
                  </label>
                  <input
                    required
                    type="text"
                    value={form.whatsapp_number}
                    onChange={(e) =>
                      setForm({ ...form, whatsapp_number: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-emerald-400"
                    placeholder="5493435..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-white/10">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Nombre Dueño *
                  </label>
                  <input
                    required
                    type="text"
                    value={form.admin_name}
                    onChange={(e) =>
                      setForm({ ...form, admin_name: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Email Admin *
                  </label>
                  <input
                    required
                    type="email"
                    value={form.admin_email}
                    onChange={(e) =>
                      setForm({ ...form, admin_email: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Contraseña *
                  </label>
                  <input
                    required
                    type="text"
                    value={form.admin_password}
                    onChange={(e) =>
                      setForm({ ...form, admin_password: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-emerald-400"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold cursor-pointer disabled:opacity-60 inline-flex items-center gap-2"
                >
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                  {creating ? "Creando tienda..." : "Crear Tienda"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Listado de Tiendas */}
        {loading ? (
          <div className="rounded-3xl bg-white/[0.03] border border-white/10 py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-9 h-9 text-emerald-400 animate-spin" />
            <p className="text-sm font-medium text-slate-400">
              Cargando instancias registradas...
            </p>
          </div>
        ) : filteredStores.length === 0 ? (
          <div className="rounded-3xl bg-white/[0.03] border border-white/10 py-16 text-center space-y-2">
            <Store className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="font-bold text-slate-300">
              No se encontraron comercios con ese filtro
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredStores.map((s) => {
              const isEntering = impersonatingId === s.id;
              return (
                <div
                  key={s.id}
                  className="rounded-2xl bg-white/[0.04] hover:bg-white/[0.06] border border-white/10 p-5 flex flex-col justify-between gap-5 transition"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold shrink-0 shadow-md"
                          style={{
                            backgroundColor: s.primary_color || "#10B981",
                          }}
                        >
                          <Store className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-extrabold text-white truncate">
                            {s.name}
                          </h3>
                          <p className="text-xs font-mono text-slate-400 truncate">
                            /t/{s.slug}
                          </p>
                        </div>
                      </div>

                      <select
                        value={s.plan_status}
                        onChange={(e) =>
                          handleStatusChange(s.id, e.target.value)
                        }
                        className="text-xs font-bold rounded-lg px-2.5 py-1.5 bg-slate-900 border border-white/15 text-slate-200 cursor-pointer outline-none"
                      >
                        <option value="demo">Demo</option>
                        <option value="active">Activo</option>
                        <option value="suspended">Suspendido</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-white/10">
                      <div className="rounded-xl bg-black/30 p-3 flex items-center gap-2.5">
                        <Package className="w-4 h-4 text-slate-400" />
                        <div className="text-xs">
                          <span className="text-slate-400 block">
                            Productos
                          </span>
                          <strong className="text-white text-sm">
                            {s.total_products ?? 0}
                          </strong>
                        </div>
                      </div>

                      <div className="rounded-xl bg-black/30 p-3 flex items-center gap-2.5">
                        <ShoppingBag className="w-4 h-4 text-slate-400" />
                        <div className="text-xs">
                          <span className="text-slate-400 block">Pedidos</span>
                          <strong className="text-white text-sm">
                            {s.total_orders ?? 0}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button
                      type="button"
                      disabled={isEntering}
                      onClick={() => handleImpersonate(s.id)}
                      className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold transition cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5"
                    >
                      {isEntering ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Entrando a la tienda...</span>
                        </>
                      ) : (
                        <>
                          <span>Administrar Tienda</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>

                    <a
                      href={`/t/${s.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
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
