import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Palette,
  Package,
  ShoppingCart,
  Tag,
  ExternalLink,
  LogOut,
  ShieldAlert,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

const navItems = [
  { to: "/admin/dashboard", label: "Inicio", icon: LayoutDashboard },
  { to: "/admin/design", label: "Diseño y Marca", icon: Palette },
  { to: "/admin/products", label: "Productos y Stock", icon: Package },
  { to: "/admin/orders", label: "Pedidos", icon: ShoppingCart },
  { to: "/admin/coupons", label: "Cupones", icon: Tag },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const { user, logout, stopImpersonation } = useAuth() || {};

  const safeUser = user || {};
  const isImpersonating =
    Boolean(safeUser.impersonatedBySuperAdmin) ||
    safeUser.role === "superadmin" ||
    Boolean(localStorage.getItem("superadmin_backup_token"));

  const handleLogout = () => {
    if (logout) logout();
    navigate("/admin/login");
  };

  const handleBackToSuperAdmin = () => {
    if (stopImpersonation) {
      stopImpersonation();
    }
    window.location.href = "/superadmin";
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Banner superior para volver a SuperAdmin */}
      {isImpersonating && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-bold flex items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2 truncate">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span className="truncate">
              MODO SOPORTE SUPERADMIN — Gestionando:{" "}
              {safeUser.storeName || "Tienda"}
            </span>
          </div>
          <button
            type="button"
            onClick={handleBackToSuperAdmin}
            className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3 py-1 rounded-lg text-xs font-semibold shrink-0 cursor-pointer transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver a SuperAdmin
          </button>
        </div>
      )}

      <div className="flex-1 flex flex-col md:flex-row">
        {/* Sidebar */}
        <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col justify-between p-5">
          <div>
            <div className="pb-5 border-b border-slate-800">
              <span className="text-[11px] uppercase tracking-wider text-slate-400">
                Panel de Comercio
              </span>
              <h2 className="font-bold text-lg truncate mt-0.5">
                {safeUser.storeName || "Mi Tienda"}
              </h2>
            </div>

            <nav className="mt-5 space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                        isActive
                          ? "bg-white text-slate-900 font-semibold"
                          : "text-slate-300 hover:bg-slate-800"
                      }`
                    }
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>
          </div>

          <div className="pt-5 border-t border-slate-800 space-y-2 mt-6">
            {safeUser.storeSlug && (
              <a
                href={`/t/${safeUser.storeSlug}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
              >
                Ver mi tienda online
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-red-300 hover:bg-slate-800"
            >
              <LogOut className="w-4 h-4" /> Cerrar sesión
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-5 sm:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
