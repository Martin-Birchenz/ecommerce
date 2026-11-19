import { useState } from "react";
import { ShoppingBag, Eye } from "lucide-react";
import { useCart } from "../../context/CartContext.jsx";

export default function ProductCard({ product, onOpenDetail }) {
  const { addItem } = useCart();

  const initialVariant =
    product.variants.find((v) => v.stock > 0) || product.variants[0];
  const [selectedVariantId, setSelectedVariantId] = useState(
    initialVariant?.id,
  );

  const activeVariant =
    product.variants.find((v) => v.id === selectedVariantId) || initialVariant;

  const displayPrice =
    activeVariant?.price_override !== null &&
    activeVariant?.price_override !== undefined
      ? Number(activeVariant.price_override)
      : Number(product.base_price);

  const comparePrice = product.compare_at_price
    ? Number(product.compare_at_price)
    : null;
  const hasDiscount = comparePrice && comparePrice > displayPrice;
  const discountPercent = hasDiscount
    ? Math.round(((comparePrice - displayPrice) / comparePrice) * 100)
    : 0;

  const isOutOfStock = !activeVariant || activeVariant.stock <= 0;
  const primaryImage =
    product.images?.[0]?.image_url ||
    "https://placehold.co/500x500?text=Sin+Imagen";

  return (
    <article className="bg-white rounded-xl border border-slate-200/80 overflow-hidden flex flex-col shadow-xs hover:shadow-md transition-shadow group">
      {/* Imagen con trigger de detalle */}
      <div
        onClick={() => onOpenDetail?.(product)}
        className="relative aspect-square bg-slate-100 overflow-hidden cursor-pointer"
      >
        <img
          src={primaryImage}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Badges superiores */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
          {hasDiscount && (
            <span
              className="text-white text-[11px] font-extrabold px-2.5 py-0.5 rounded-full shadow-xs"
              style={{ backgroundColor: "var(--store-accent)" }}
            >
              {discountPercent}% OFF
            </span>
          )}
          {product.is_featured === 1 && !hasDiscount && (
            <span
              className="text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-xs"
              style={{ backgroundColor: "var(--store-primary)" }}
            >
              Destacado
            </span>
          )}
        </div>

        {/* Botón rápido de galería */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetail?.(product);
          }}
          title="Ver galería y descripción"
          className="absolute bottom-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 text-slate-700 hover:text-slate-900 flex items-center justify-center shadow-xs opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
        >
          <Eye className="w-4 h-4" />
        </button>

        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/75 flex items-center justify-center">
            <span className="bg-slate-900 text-white text-xs font-bold px-3 py-1 rounded-full">
              Agotado
            </span>
          </div>
        )}
      </div>

      {/* Contenido */}
      <div className="p-4 flex-1 flex flex-col">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {product.subcategory_name || product.category_name}
        </span>

        <h3
          onClick={() => onOpenDetail?.(product)}
          className="font-bold text-slate-900 text-sm sm:text-base mt-0.5 line-clamp-2 cursor-pointer hover:underline"
        >
          {product.name}
        </h3>

        {product.variants.length > 1 && (
          <div className="mt-2.5">
            <p className="text-[11px] text-slate-500 mb-1">
              {activeVariant?.attribute_name || "Opción"}:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {product.variants.map((v) => {
                const selected = v.id === activeVariant?.id;
                const disabled = v.stock <= 0;
                return (
                  <button
                    key={v.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => setSelectedVariantId(v.id)}
                    className={`px-2 py-0.5 text-xs rounded border transition ${
                      disabled
                        ? "bg-slate-50 text-slate-300 border-slate-200 line-through cursor-not-allowed"
                        : selected
                          ? "text-white border-transparent font-semibold"
                          : "bg-white text-slate-700 border-slate-300 hover:border-slate-500"
                    }`}
                    style={
                      selected && !disabled
                        ? { backgroundColor: "var(--store-primary)" }
                        : undefined
                    }
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
            {hasDiscount && (
              <p className="text-xs text-slate-400 line-through leading-none">
                ${comparePrice.toLocaleString("es-AR")}
              </p>
            )}
            <span
              className="text-lg font-extrabold"
              style={{ color: "var(--store-primary)" }}
            >
              ${displayPrice.toLocaleString("es-AR")}
            </span>
            <span className="text-xs text-slate-400 ml-1">
              /{product.unit_label}
            </span>
          </div>

          <button
            type="button"
            disabled={isOutOfStock}
            onClick={() => addItem(product, activeVariant, 1)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-white transition opacity-95 hover:opacity-100 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
            style={
              !isOutOfStock
                ? { backgroundColor: "var(--store-primary)" }
                : undefined
            }
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            {isOutOfStock ? "Sin stock" : "Agregar"}
          </button>
        </div>
      </div>
    </article>
  );
}
