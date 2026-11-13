import { createContext, useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { slug } = useParams();
  const storageKey = `saas_cart_${slug}`;

  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch (e) {
      console.error("Error guardando carrito:", e);
    }
  }, [items, storageKey]);

  const addItem = (product, variant, quantity = 1) => {
    const unitPrice = Number(variant.price_override ?? product.base_price);
    const primaryImg = product.images?.[0]?.image_url || null;

    setItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.variant_id === variant.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        const nextQty = Math.min(
          Number(variant.stock),
          updated[existingIndex].quantity + quantity,
        );
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: nextQty,
        };
        return updated;
      }
      return [
        ...prev,
        {
          product_id: product.id,
          variant_id: variant.id,
          name: product.name,
          variant_label: `${variant.attribute_name}: ${variant.attribute_value}`,
          unit_price: unitPrice,
          unit_type: product.unit_type,
          min_step: Number(product.min_step || 1),
          max_stock: Number(variant.stock),
          image_url: primaryImg,
          quantity: Math.min(Number(variant.stock), quantity),
        },
      ];
    });
    setIsOpen(true);
  };

  const updateQuantity = (variantId, quantity) => {
    if (quantity <= 0) {
      removeItem(variantId);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.variant_id === variantId
          ? { ...item, quantity: Math.min(item.max_stock, quantity) }
          : item,
      ),
    );
  };

  const removeItem = (variantId) => {
    setItems((prev) => prev.filter((item) => item.variant_id !== variantId));
  };

  const clearCart = () => setItems([]);

  const subtotal = items.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0,
  );
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        isOpen,
        setIsOpen,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        subtotal,
        totalCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
