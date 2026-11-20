import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";

import StoreLayout from "./layouts/StoreLayout.jsx";
import AdminLayout from "./layouts/AdminLayout.jsx";

import StoreHome from "./pages/storefront/StoreHome.jsx";
import CheckoutReturn from "./pages/storefront/CheckoutReturn.jsx";

import AdminLogin from "./pages/admin/Login.jsx";
import Dashboard from "./pages/admin/Dashboard.jsx";
import ThemeSettings from "./pages/admin/ThemeSettings.jsx";
import Products from "./pages/admin/Products.jsx";
import Orders from "./pages/admin/Orders.jsx";
import CouponsManager from "./pages/admin/CouponsManager.jsx";

import SuperAdminDashboard from "./pages/superadmin/SuperAdminDashboard.jsx";

function RequireStoreAdmin({ children }) {
  const auth = useAuth();
  const token = auth?.token || localStorage.getItem("token");
  const user = auth?.user || JSON.parse(localStorage.getItem("user") || "{}");

  if (!token || user?.role !== "store_admin") {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
}

function RequireSuperAdmin({ children }) {
  const auth = useAuth();
  const token = auth?.token || localStorage.getItem("token");
  const user = auth?.user || JSON.parse(localStorage.getItem("user") || "{}");

  if (!token || user?.role !== "superadmin") {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* 1. Tienda Pública Multi-Tenant ("Camaleón") */}
          <Route path="/t/:slug" element={<StoreLayout />}>
            <Route index element={<StoreHome />} />
            <Route path="checkout/:status" element={<CheckoutReturn />} />
          </Route>

          {/* 2. Login Unificado (Comercio + SuperAdmin) */}
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* 3. Panel de Administración del Comercio */}
          <Route
            path="/admin"
            element={
              <RequireStoreAdmin>
                <AdminLayout />
              </RequireStoreAdmin>
            }
          >
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="design" element={<ThemeSettings />} />
            <Route path="products" element={<Products />} />
            <Route path="orders" element={<Orders />} />
            <Route path="coupons" element={<CouponsManager />} />
          </Route>

          {/* 4. Consola Maestra del Dueño del SaaS (SuperAdmin) */}
          <Route
            path="/superadmin"
            element={
              <RequireSuperAdmin>
                <SuperAdminDashboard />
              </RequireSuperAdmin>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/admin/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
