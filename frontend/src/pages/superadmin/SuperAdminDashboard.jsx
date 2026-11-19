import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Plus, ExternalLink, Store, LogOut, ShieldCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import api from "../../config/api.js";

export default function SuperAdminDashboard() {
  const { user, isAuthenticated, logout } = useAuth();
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

  if (!isAuthenticated || user?.role !== "superadmin") {
    return <Navigate to="/admin/login" replace />;
  }

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
    loadStores();
  }, []);

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
      const { token, user } = res.data.data;
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      window.location.href = "/admin/dashboard";
    } catch (err) {
      alert(err.response?.data?.message || "No se pudo ingresar a la tienda");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Topbar SuperAdmin */}
      <header className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-6 h-6 text-emerald-400" />
          <div>
            <h1 className="font-bold text-base leading-tight">
              Control Central SaaS
            </h1>
            <p className="text-xs text-slate-400">
              Gestión Multi-Tenant de Comercios
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            logout();
            navigate("/admin/login");
          }}
          className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white cursor-pointer"
        >
          <LogOut className="w-4 h-4" /> Salir
        </button>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Comercios Registrados
            </h2>
            <p className="text-sm text-slate-500">
              Creá nuevas instancias en 1 clic o gestioná el estado de
              suscripción.
            </p>
          </div>

          <button
            onClick={() => setShowModal(!showModal)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Nuevo Comercio
          </button>
        </div>

        {/* Formulario de Alta de Comercio */}
        {showModal && (
          <form
            onSubmit={handleCreateStore}
            className="bg-white border rounded-xl p-6 space-y-4 text-sm shadow-sm"
          >
            <h3 className="font-bold text-base text-slate-900 border-b pb-2">
              Dar de Alta Nuevo Cliente
            </h3>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-xs">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold mb-1">
                  Nombre del Comercio *
                </label>
                <input
                  required
                  type="text"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Ej: Vinoteca El Roble"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">
                  Slug URL (/t/slug) *
                </label>
                <input
                  required
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg font-mono text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">
                  WhatsApp Comercio *
                </label>
                <input
                  required
                  type="text"
                  value={form.whatsapp_number}
                  onChange={(e) =>
                    setForm({ ...form, whatsapp_number: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="5493435..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t">
              <div>
                <label className="block font-semibold mb-1">
                  Nombre del Dueño *
                </label>
                <input
                  required
                  type="text"
                  value={form.admin_name}
                  onChange={(e) =>
                    setForm({ ...form, admin_name: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">
                  Email de Acceso Admin *
                </label>
                <input
                  required
                  type="email"
                  value={form.admin_email}
                  onChange={(e) =>
                    setForm({ ...form, admin_email: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">
                  Contraseña Inicial *
                </label>
                <input
                  required
                  type="text"
                  value={form.admin_password}
                  onChange={(e) =>
                    setForm({ ...form, admin_password: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border rounded-lg font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-semibold cursor-pointer disabled:opacity-50"
              >
                {creating ? "Creando..." : "Crear Tienda y Usuario"}
              </button>
            </div>
          </form>
        )}

        {/* Listado de Tiendas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <p className="text-sm text-slate-500">Cargando comercios...</p>
          ) : (
            stores.map((s) => (
              <div
                key={s.id}
                className="bg-white border rounded-xl p-5 flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold"
                        style={{
                          backgroundColor: s.primary_color || "#0F172A",
                        }}
                      >
                        <Store className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">{s.name}</h3>
                        <p className="text-xs font-mono text-slate-500">
                          /t/{s.slug}
                        </p>
                      </div>
                    </div>

                    <select
                      value={s.plan_status}
                      onChange={(e) => handleStatusChange(s.id, e.target.value)}
                      className="text-xs font-semibold border rounded-lg px-2 py-1 bg-slate-50"
                    >
                      <option value="demo">Demo</option>
                      <option value="active">Activo</option>
                      <option value="suspended">Suspendido</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t text-xs text-slate-600">
                    <div>
                      Productos:{" "}
                      <strong className="text-slate-900">
                        {s.total_products}
                      </strong>
                    </div>
                    <div>
                      Pedidos:{" "}
                      <strong className="text-slate-900">
                        {s.total_orders}
                      </strong>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleImpersonate(store.id)}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
                >
                  Administrar Tienda
                </button>

                <a
                  href={`/t/${s.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 border rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-slate-50"
                >
                  Abrir Tienda Pública <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
