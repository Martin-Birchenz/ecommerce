import { useState, useEffect } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { useStore } from "../../context/StoreContext.jsx";
import api from "../../config/api.js";
import ProductCard from "../../components/storefront/ProductCard.jsx";
import ProductDetailModal from "../../components/storefront/ProductDetailModal.jsx";

export default function StoreHome() {
  const { slug, store, categories: ctxCategories } = useStore() || {};
  const settings = store?.settings || store || {};

  const [products, setProducts] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [selectedCat, setSelectedCat] = useState("all");
  const [selectedSub, setSelectedSub] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    if (!slug) return;
    setLoadingProducts(true);
    api
      .get(`/public/${slug}/products`)
      .then((res) => {
        const payload = res.data?.data;
        const list = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.products)
            ? payload.products
            : [];
        setProducts(list);
        if (Array.isArray(payload?.subcategories)) {
          setSubcategories(payload.subcategories);
        }
      })
      .catch(() => setProducts([]))
      .finally(() => setLoadingProducts(false));
  }, [slug]);

  const categories = Array.isArray(ctxCategories) ? ctxCategories : [];

  const visibleSubcategories =
    selectedCat === "all"
      ? []
      : subcategories.filter(
          (s) => String(s.category_id) === String(selectedCat),
        );

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      (p.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.description || "").toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (selectedCat === "all") return true;
    if (String(p.category_id) !== String(selectedCat)) return false;
    if (
      selectedSub !== "all" &&
      String(p.subcategory_id) !== String(selectedSub)
    ) {
      return false;
    }
    return true;
  });

  const handleSelectCat = (catId) => {
    setSelectedCat(catId);
    setSelectedSub("all");
  };

  if (!store) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
      {/* Hero Banner */}
      <section className="relative rounded-2xl overflow-hidden mb-8 bg-slate-900 text-white shadow-sm">
        {settings.banner_url && (
          <img
            src={settings.banner_url}
            alt={settings.hero_title || store.name}
            className="w-full h-56 sm:h-72 object-cover opacity-55"
          />
        )}
        <div
          className={`${
            settings.banner_url ? "absolute inset-0" : "py-12 px-6"
          } flex flex-col justify-center px-6 sm:px-10 max-w-2xl`}
        >
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            {settings.hero_title || `Bienvenidos a ${store.name}`}
          </h1>
          {settings.hero_subtitle && (
            <p className="mt-2 text-sm sm:text-base text-slate-100/90">
              {settings.hero_subtitle}
            </p>
          )}
        </div>
      </section>

      {/* Buscador y Categorías */}
      <section className="mb-6 space-y-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar productos..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => handleSelectCat("all")}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition ${
              selectedCat === "all"
                ? "text-white shadow-xs"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
            style={
              selectedCat === "all"
                ? { backgroundColor: "var(--color-primary, #0f172a)" }
                : undefined
            }
          >
            Todos ({products.length})
          </button>

          {categories.map((cat) => {
            const active = String(selectedCat) === String(cat.id);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleSelectCat(cat.id)}
                className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition ${
                  active
                    ? "text-white shadow-xs"
                    : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                }`}
                style={
                  active
                    ? { backgroundColor: "var(--color-primary, #0f172a)" }
                    : undefined
                }
              >
                {cat.name}
              </button>
            );
          })}
        </div>

        {visibleSubcategories.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="text-xs font-semibold text-slate-400 inline-flex items-center gap-1 mr-1">
              <SlidersHorizontal className="w-3.5 h-3.5" /> Filtrar:
            </span>
            <button
              type="button"
              onClick={() => setSelectedSub("all")}
              className={`px-3 py-1 rounded-md text-xs font-semibold border transition ${
                selectedSub === "all"
                  ? "text-white border-transparent"
                  : "bg-white text-slate-600 border-slate-200"
              }`}
              style={
                selectedSub === "all"
                  ? { backgroundColor: "var(--color-secondary, #2563eb)" }
                  : undefined
              }
            >
              Ver todo
            </button>
            {visibleSubcategories.map((sub) => {
              const active = String(selectedSub) === String(sub.id);
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setSelectedSub(sub.id)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold border transition ${
                    active
                      ? "text-white border-transparent"
                      : "bg-white text-slate-600 border-slate-200"
                  }`}
                  style={
                    active
                      ? { backgroundColor: "var(--color-secondary, #2563eb)" }
                      : undefined
                  }
                >
                  {sub.name}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Grilla */}
      {loadingProducts ? (
        <div className="bg-white rounded-xl border p-12 text-center text-slate-500 text-sm">
          Cargando catálogo...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center text-slate-500">
          No encontramos productos que coincidan con tu búsqueda.
        </div>
      ) : (
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onOpenDetail={setSelectedProduct}
            />
          ))}
        </section>
      )}

      {/* Modal de Galería y Detalle */}
      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
    </div>
  );
}
