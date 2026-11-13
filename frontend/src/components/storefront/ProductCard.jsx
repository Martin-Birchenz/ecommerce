import { useState } from "react";
import { Plus, Check } from "lucide-react";
import { useCart } from "../../context/CartContext.jsx";

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const variants = product.variants || [];
  const [selectedVariantId, setSelectedVariantId] = useState(
    variants[0]?.id || null,
  );
  const [addedFeedback, setAddedFeedback] = useState(false);

  const activeVariant =
    variants.find((v) => v.id === selectedVariantId) || variants[0] || null;

  const displayPrice = Number(
    activeVariant?.price_override ?? product.base_price,
  );
  const hasStock = activeVariant && Number(activeVariant.stock) > 0;
  const primaryImage = product.images?.[0]?.image_url;

  const handleAdd = () => {
    if (!activeVariant || !hasStock) return;
    addItem(product, activeVariant, Number(product.min_step || 1));
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 1200);
  };

  return (
    <div
      className="border flex flex-col overflow-hidden transition-shadow hover:shadow-md"
      style={{
        backgroundColor: "var(--color-bg)",
        borderRadius: "var(--radius-base)",
      }}
    >
      {/* Imagen 1:1 */}
      <div
        className="aspect-square w-full overflow-hidden flex items-center justify-center relative"
        style={{ backgroundColor: "var(--color-surface)" }}
      >
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          />
        ) : (
          <span className="text-xs opacity-40">Sin imagen</span>
        )}
        {product.is_featured === 1 && (
          <span
            className="absolute top-2.5 left-2.5 px-2.5 py-0.5 text-xs font-semibold text-white"
            style={{
              backgroundColor: "var(--color-secondary)",
              borderRadius: "var(--radius-base)",
            }}
          >
            Destacado
          </span>
        )}
      </div>

      {/* Info y Selector de Variantes */}
      <div className="p-4 flex-1 flex flex-col">
        <span className="text-xs opacity-60 uppercase tracking-wider">
          {product.category_name}
        </span>
        <h3 className="font-heading font-bold text-base mt-0.5 line-clamp-2">
          {product.name}
        </h3>

        {product.description && (
          <p className="text-xs opacity-70 mt-1 line-clamp-2">
            {product.description}
          </p>
        )}

        {/* Selector rápido si tiene más de 1 variante */}
        {variants.length > 1 && (
          <div className="mt-3">
            <span className="text-xs font-medium opacity-75 block mb-1.5">
              {variants[0].attribute_name}:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {variants.map((v) => {
                const isSelected = v.id === activeVariant?.id;
                const outOfStock = Number(v.stock) <= 0;
                return (
                  <button
                    key={v.id}
                    type="button"
                    disabled={outOfStock}
                    onClick={() => setSelectedVariantId(v.id)}
                    className={`px-2.5 py-1 text-xs font-medium border transition cursor-pointer ${
                      outOfStock
                        ? "opacity-40 line-through cursor-not-allowed"
                        : ""
                    }`}
                    style={{
                      borderRadius: "var(--radius-base)",
                      backgroundColor: isSelected
                        ? "var(--color-primary)"
                        : "transparent",
                      color: isSelected ? "#ffffff" : "var(--color-text)",
                      borderColor: isSelected
                        ? "var(--color-primary)"
                        : "#d1d5db",
                    }}
                  >
                    {v.attribute_value}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-auto pt-4 flex items-center justify-between gap-2">
          <div>
            <span className="font-heading font-bold text-lg">
              ${displayPrice.toLocaleString("es-AR")}
            </span>
            {product.unit_type !== "unidad" && (
              <span className="text-xs opacity-60 ml-1">
                / {product.unit_type}
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={!hasStock}
            onClick={handleAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: addedFeedback
                ? "var(--color-accent)"
                : "var(--color-primary)",
              borderRadius: "var(--radius-base)",
            }}
          >
            {addedFeedback ? (
              <>
                <Check className="w-4 h-4" /> Agregado
              </>
            ) : hasStock ? (
              <>
                <Plus className="w-4 h-4" /> Sumar
              </>
            ) : (
              "Sin stock"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
