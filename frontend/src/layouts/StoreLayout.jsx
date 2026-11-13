import { Outlet, Link } from "react-router-dom";
import { ShoppingBag, Store, MessageCircle } from "lucide-react";
import { useStore } from "../context/StoreContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import CartDrawer from "../components/storefront/CartDrawer.jsx";

export default function StoreLayout() {
  const { slug, store, loading, error } = useStore();
  const { totalCount, setIsOpen } = useCart();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <div
          className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
          style={{
            borderColor: "var(--color-primary)",
            borderTopColor: "transparent",
          }}
        />
        <p className="text-sm font-medium opacity-70">Cargando tienda...</p>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <Store className="w-12 h-12 mb-3 opacity-40" />
        <h1 className="text-xl font-bold mb-1">Tienda no disponible</h1>
        <p className="text-sm opacity-70 max-w-md">
          {error || "Verificá la dirección ingresada."}
        </p>
      </div>
    );
  }

  const whatsappUrl = `https://wa.me/${store.whatsapp_number}?text=${encodeURIComponent(
    `Hola ${store.name}, te escribo desde la tienda online.`,
  )}`;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "var(--color-bg)", color: "var(--color-text)" }}
    >
      {/* Navbar Sticky */}
      <header
        className="sticky top-0 z-30 border-b backdrop-blur-md"
        style={{
          backgroundColor:
            "color-mix(in srgb, var(--color-bg) 90%, transparent)",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to={`/t/${slug}`} className="flex items-center gap-3">
            {store.logo_url ? (
              <img
                src={store.logo_url}
                alt={store.name}
                className="h-10 w-10 object-contain rounded"
              />
            ) : (
              <div
                className="h-10 w-10 flex items-center justify-center text-white font-bold text-lg"
                style={{
                  backgroundColor: "var(--color-primary)",
                  borderRadius: "var(--radius-base)",
                }}
              >
                {store.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="font-heading font-bold text-lg tracking-tight">
              {store.name}
            </span>
          </Link>

          <button
            onClick={() => setIsOpen(true)}
            className="relative flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 cursor-pointer"
            style={{
              backgroundColor: "var(--color-primary)",
              borderRadius: "var(--radius-base)",
            }}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Carrito</span>
            {totalCount > 0 && (
              <span
                className="ml-1 px-2 py-0.5 text-xs font-bold rounded-full text-white"
                style={{ backgroundColor: "var(--color-accent)" }}
              >
                {totalCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Botón Flotante de WhatsApp */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Consultar por WhatsApp"
        className="fixed bottom-5 right-5 z-30 flex items-center justify-center w-14 h-14 rounded-full text-white shadow-lg transition-transform hover:scale-105"
        style={{ backgroundColor: "#25D366" }}
      >
        <MessageCircle className="w-7 h-7" />
      </a>

      {/* Footer */}
      <footer
        className="border-t py-8 mt-12 text-sm"
        style={{ backgroundColor: "var(--color-surface)" }}
      >
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 opacity-80">
          <div>
            <p className="font-heading font-bold">{store.name}</p>
            {store.address && <p className="text-xs mt-0.5">{store.address}</p>}
          </div>
          <p className="text-xs">
            Catálogo Online • Pedidos directos sin registro
          </p>
        </div>
      </footer>

      {/* Drawer Lateral del Carrito + Checkout */}
      <CartDrawer />
    </div>
  );
}
