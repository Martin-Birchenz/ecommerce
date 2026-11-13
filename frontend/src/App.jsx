import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import { StoreProvider } from "./context/StoreContext.jsx";
import { CartProvider } from "./context/CartContext.jsx";
import StoreLayout from "./layouts/StoreLayout.jsx";
import StoreHome from "./pages/storefront/StoreHome.jsx";
import AdminLayout from "./layouts/AdminLayout.jsx";
import Login from "./pages/admin/Login.jsx";
import ThemeSettings from "./pages/admin/ThemeSettings.jsx";
import Products from "./pages/admin/Products.jsx";
import Orders from "./pages/admin/Orders.jsx";
import SuperAdminDashboard from "./pages/superadmin/SuperAdminDashboard.jsx";
import Dashboard from "./pages/admin/Dashboard.jsx";

function StorefrontWrapper() {
  return (
    <StoreProvider>
      <CartProvider>
        <StoreLayout />
      </CartProvider>
    </StoreProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/superadmin" element={<SuperAdminDashboard />} />
          <Route path="/" element={<Navigate to="/t/demo" replace />} />

          {/* Tienda Pública Multi-Tenant */}
          <Route path="/t/:slug" element={<StorefrontWrapper />}>
            <Route index element={<StoreHome />} />
          </Route>

          {/* Panel Administrativo */}
          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/design" replace />} />
            <Route path="design" element={<ThemeSettings />} />
            <Route path="design" element={<ThemeSettings />} />
            <Route path="products" element={<Products />} />
            <Route path="orders" element={<Orders />} />
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
          </Route>

          <Route path="*" element={<Navigate to="/t/demo" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
