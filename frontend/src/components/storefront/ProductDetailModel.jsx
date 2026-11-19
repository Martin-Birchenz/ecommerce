import { useState, useEffect } from "react";
import { X, ShoppingBag, Check } from "lucide-react";
import { useCart } from "../../context/CartContext.jsx";

export default function ProductDetailModal({ product, onClose }) {
  const { addItem, setIsCartOpen } = useCart();

  const images =
    product?.images && product.images.length > 0
      ? product.images
      : [
          {
            id: "placeholder",
            image_url: "https://placehold.co/600x600?text=Sin+Imagen",
          },
        ];

  const [selectedImage, setSelectedImage] = useState(images[0].image_url);
  const [selectedVariantId, setSelectedVariantId] = useState(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!product) return;
    setSelectedImage(images[0].image_url);
    const firstAvailable =
      product.variants?.find((v) => v.stock > 0) || product.variants?.[0];
    setSelectedVariantId(firstAvailable?.id || null);
    setQuantity(1);
  }, [product]);

  if (!product) return null;

  const activeVariant =
    product.variants?.find((v) => v.id === selectedVariantId) ||
    product.variants?.[0];

  const unitPrice =
    activeVariant?.price_override !== null &&
    activeVariant?.price_override !== undefined
      ? Number(activeVariant.price_override)
      : Number(product.base_price);

  const comparePrice = product.compare_at_price
    ? Number(product.compare_at_price)
    : null;
  const hasDiscount = comparePrice && comparePrice > unitPrice;
  const discountPercent = hasDiscount
    ? Math.round(((comparePrice - unitPrice) / comparePrice) * 100)
    : 0;

  const maxStock = activeVariant ? Number(activeVariant.stock) : 0;
  const isOutOfStock = maxStock <= 0;

  const handleAdd = () => {
    if (!activeVariant || isOutOfStock) return;
    addItem(product, activeVariant, quantity);
    onClose();
    setIsCartOpen(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl grid grid-cols-1 md:grid-cols-2 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/90 border flex items-center justify-center text-slate-600 hover:text-slate-900 shadow-xs"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Galería */}
        <div className="bg-slate-50 p-4 flex flex-col gap-3">
          <div className="aspect-square rounded-xl overflow-hidden bg-white border relative">
            <img
              src={selectedImage}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            {hasDiscount && (
              <span
                className="absolute top-3 left-3 text-white text-xs font-extrabold px-2.5 py-1 rounded-full shadow-xs"
                style={{ backgroundColor: "var(--store-accent)" }}
              >
                {discountPercent}% OFF
              </span>
            )}
          </div>

          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img, idx) => (
                <button
                  key={img.id || idx}
                  type="button"
                  onClick={() => setSelectedImage(img.image_url)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition ${
                    selectedImage === img.image_url
                      ? "border-slate-900"
                      : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <img
                    src={img.image_url}
                    alt={`${product.name} ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detalles y Selector */}
        <div className="p-6 flex flex-col justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {product.category_name}
              {product.subcategory_name ? ` · ${product.subcategory_name}` : ""}
            </p>
            <h2 className="text-xl font-extrabold text-slate-900 mt-1">
              {product.name}
            </h2>

            {/* Precios */}
            <div className="mt-3 flex items-baseline gap-2.5">
              <span
                className="text-2xl font-extrabold"
                style={{ color: "var(--store-primary)" }}
              >
                ${unitPrice.toLocaleString("es-AR")}
              </span>
              {hasDiscount && (
                <span className="text-sm text-slate-400 line-through">
                  ${comparePrice.toLocaleString("es-AR")}
                </span>
              )}
              <span className="text-xs text-slate-500">
                / {product.unit_label}
              </span>
            </div>

            {/* Descripción completa */}
            {product.description && (
              <p className="mt-4 text-sm text-slate-600 leading-relaxed whitespace-pre-line max-h-36 overflow-y-auto">
                {product.description}
              </p>
            )}

            {/* Variantes */}
            {product.variants && product.variants.length > 0 && (
              <div className="mt-5">
                <label className="block text-xs font-bold uppercase text-slate-500 mb-2">
                  {activeVariant?.attribute_name || "Opción"}
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((v) => {
                    const selected = v.id === activeVariant?.id;
                    const disabled = v.stock <= 0;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          setSelectedVariantId(v.id);
                          setQuantity(1);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                          disabled
                            ? "bg-slate-50 text-slate-300 border-slate-200 line-through cursor-not-allowed"
                            : selected
                              ? "text-white border-transparent shadow-xs"
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

            {/* Stock disponible */}
            <div className="mt-3 text-xs">
              {isOutOfStock ? (
                <span className="text-red-600 font-semibold">
                  Sin stock en esta opción
                </span>
              ) : (
                <span className="text-emerald-700 font-medium inline-flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Stock disponible: {maxStock}{" "}
                  {product.unit_label}
                </span>
              )}
            </div>
          </div>

          {/* Cantidad + Botón Agregar */}
          <div className="mt-6 pt-4 border-t flex items-center gap-3">
            <div className="flex items-center border rounded-xl overflow-hidden bg-slate-50">
              <button
                type="button"
                disabled={isOutOfStock || quantity <= 1}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="px-3 py-2.5 text-sm font-bold text-slate-700 disabled:opacity-30"
              >
                -
              </button>
              <span className="px-3 text-sm font-bold text-slate-900">
                {quantity}
              </span>
              <button
                type="button"
                disabled={isOutOfStock || quantity >= maxStock}
                onClick={() => setQuantity((q) => Math.min(maxStock, q + 1))}
                className="px-3 py-2.5 text-sm font-bold text-slate-700 disabled:opacity-30"
              >
                +
              </button>
            </div>

            <button
              type="button"
              disabled={isOutOfStock}
              onClick={handleAdd}
              className="flex-1 py-3 px-4 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition hover:opacity-95 disabled:bg-slate-200 disabled:text-slate-400"
              style={
                !isOutOfStock
                  ? { backgroundColor: "var(--store-primary)" }
                  : undefined
              }
            >
              <ShoppingBag className="w-4 h-4" />
              {isOutOfStock ? "Sin Stock" : "Agregar al Pedido"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
