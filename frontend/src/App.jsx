import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { StoreProvider } from "./context/StoreContext.jsx";
import { CartProvider } from "./context/CartContext.jsx";
import StoreLayout from "./layouts/StoreLayout.jsx";
import StoreHome from "./pages/storefront/StoreHome.jsx";

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
    <BrowserRouter>
      <Routes>
        {/* Redirección inicial a la tienda demo */}
        <Route path="/" element={<Navigate to="/t/demo" replace />} />

        {/* Tienda Pública Multi-Tenant */}
        <Route path="/t/:slug" element={<StorefrontWrapper />}>
          <Route index element={<StoreHome />} />
        </Route>

        {/* Rutas Admin y SuperAdmin las sumamos en el siguiente bloque */}
        <Route path="*" element={<Navigate to="/t/demo" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
