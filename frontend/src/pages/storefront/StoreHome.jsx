import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useStore } from "../../context/StoreContext.jsx";
import api from "../../config/api.js";
import ProductCard from "../../components/storefront/ProductCard.jsx";

export default function StoreHome() {
  const { slug, store, categories } = useStore();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [search, setSearch] = useState("");

  const activeCategoryObj = categories.find((c) => c.slug === selectedCategory);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/public/${slug}/products`, {
          params: {
            category: selectedCategory || undefined,
            subcategory: selectedSubcategory || undefined,
            search: search.trim() || undefined,
          },
        });
        setProducts(res.data.data || []);
      } catch (err) {
        console.error("Error cargando catálogo:", err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchProducts, 250);
    return () => clearTimeout(timer);
  }, [slug, selectedCategory, selectedSubcategory, search]);

  const handleSelectCategory = (catSlug) => {
    setSelectedCategory(catSlug);
    setSelectedSubcategory("");
  };

  return (
    <div>
      {/* Hero Banner Dinámico */}
      <section
        className="py-12 sm:py-16 px-4 border-b relative overflow-hidden"
        style={{ backgroundColor: "var(--color-surface)" }}
      >
        {store.banner_desktop_url && (
          <img
            src={store.banner_desktop_url}
            alt={store.name}
            className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
          />
        )}
        <div className="max-w-6xl mx-auto relative z-10 text-center max-w-2xl">
          <h1 className="font-heading text-3xl sm:text-5xl font-extrabold tracking-tight">
            {store.hero_title || store.name}
          </h1>
          {store.hero_subtitle && (
            <p className="mt-3 text-base sm:text-lg opacity-80">
              {store.hero_subtitle}
            </p>
          )}
        </div>
      </section>

      {/* Barra de Búsqueda y Filtros */}
      <section className="max-w-6xl mx-auto px-4 pt-8">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Píldoras de Categorías Madre */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
            <button
              onClick={() => handleSelectCategory("")}
              className="px-4 py-2 text-xs font-semibold whitespace-nowrap border transition cursor-pointer"
              style={{
                borderRadius: "var(--radius-base)",
                backgroundColor:
                  selectedCategory === ""
                    ? "var(--color-primary)"
                    : "transparent",
                color:
                  selectedCategory === "" ? "#ffffff" : "var(--color-text)",
              }}
            >
              Todos
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleSelectCategory(cat.slug)}
                className="px-4 py-2 text-xs font-semibold whitespace-nowrap border transition cursor-pointer"
                style={{
                  borderRadius: "var(--radius-base)",
                  backgroundColor:
                    selectedCategory === cat.slug
                      ? "var(--color-primary)"
                      : "transparent",
                  color:
                    selectedCategory === cat.slug
                      ? "#ffffff"
                      : "var(--color-text)",
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Buscador */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
            <input
              type="text"
              placeholder="Buscar producto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border outline-none"
              style={{
                borderRadius: "var(--radius-base)",
                backgroundColor: "var(--color-bg)",
              }}
            />
          </div>
        </div>

        {/* Fila secundaria de Subcategorías (si la categoría elegida tiene hijas) */}
        {activeCategoryObj?.subcategories?.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto mt-3 pt-3 border-t">
            <button
              onClick={() => setSelectedSubcategory("")}
              className="px-3 py-1.5 text-xs font-medium border transition cursor-pointer"
              style={{
                borderRadius: "var(--radius-base)",
                backgroundColor:
                  selectedSubcategory === ""
                    ? "var(--color-secondary)"
                    : "transparent",
                color:
                  selectedSubcategory === "" ? "#ffffff" : "var(--color-text)",
              }}
            >
              Todas en {activeCategoryObj.name}
            </button>
            {activeCategoryObj.subcategories.map((sub) => (
              <button
                key={sub.id}
                onClick={() => setSelectedSubcategory(sub.slug)}
                className="px-3 py-1.5 text-xs font-medium border transition cursor-pointer"
                style={{
                  borderRadius: "var(--radius-base)",
                  backgroundColor:
                    selectedSubcategory === sub.slug
                      ? "var(--color-secondary)"
                      : "transparent",
                  color:
                    selectedSubcategory === sub.slug
                      ? "#ffffff"
                      : "var(--color-text)",
                }}
              >
                {sub.name}
              </button>
            ))}
          </div>
        )}

        {/* Grilla de Productos */}
        <div className="mt-8">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="h-80 animate-pulse border"
                  style={{
                    backgroundColor: "var(--color-surface)",
                    borderRadius: "var(--radius-base)",
                  }}
                />
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div
              className="text-center py-16 border"
              style={{
                backgroundColor: "var(--color-surface)",
                borderRadius: "var(--radius-base)",
              }}
            >
              <p className="text-sm opacity-70">
                No encontramos productos con esos filtros.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
