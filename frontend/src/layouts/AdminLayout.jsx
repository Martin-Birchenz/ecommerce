import { Outlet, NavLink, Navigate, useNavigate } from "react-router-dom";
import {
  Palette,
  Package,
  ShoppingCart,
  ExternalLink,
  LogOut,
  LayoutDashboard,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

export default function AdminLayout() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate("/admin/login");
  };

  const navItems = [
    { to: "/admin/dashboard", label: "Inicio", icon: LayoutDashboard },
    { to: "/admin/design", label: "Diseño y Marca", icon: Palette },
    { to: "/admin/products", label: "Productos y Stock", icon: Package },
    { to: "/admin/orders", label: "Pedidos", icon: ShoppingCart },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r flex flex-col">
        <div className="p-4 border-b flex items-center justify-between md:block">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Admin Tienda
            </p>
            <h2 className="font-bold text-slate-900 truncate">
              {user.storeName || "Mi Comercio"}
            </h2>
          </div>
          {user.storeSlug && (
            <a
              href={`/t/${user.storeSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-0 md:mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:underline"
            >
              Ver tienda en vivo <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        <nav className="flex md:flex-col gap-1 p-3 overflow-x-auto flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                    isActive
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 border-t hidden md:block">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
          >
            <LogOut className="w-4 h-4" /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Área Principal */}
      <main className="flex-1 p-4 md:p-8 max-w-6xl">
        <Outlet />
      </main>
    </div>
  );
}
