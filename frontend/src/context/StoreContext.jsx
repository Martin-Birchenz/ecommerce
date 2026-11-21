import { createContext, useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../config/api.js";

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const { slug } = useParams();
  const [store, setStore] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      setError("Tienda no especificada");
      return;
    }

    const loadStore = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/public/${slug}/bootstrap`);
        const payload = res.data?.data || {};
        const storeData = payload.store || payload;
        const catData = Array.isArray(payload.categories)
          ? payload.categories
          : [];

        setStore(storeData);
        setCategories(catData);

        // Inyectar CSS Variables en :root (Efecto Camaleón)
        const root = document.documentElement;
        if (storeData.primary_color)
          root.style.setProperty("--color-primary", storeData.primary_color);
        if (storeData.secondary_color)
          root.style.setProperty(
            "--color-secondary",
            storeData.secondary_color,
          );
        if (storeData.accent_color)
          root.style.setProperty("--color-accent", storeData.accent_color);
        if (storeData.background_color)
          root.style.setProperty("--color-bg", storeData.background_color);
        if (storeData.surface_color)
          root.style.setProperty("--color-surface", storeData.surface_color);
        if (storeData.text_color)
          root.style.setProperty("--color-text", storeData.text_color);
        root.style.setProperty(
          "--radius-base",
          storeData.border_radius || "0.5rem",
        );
        if (storeData.font_heading)
          root.style.setProperty(
            "--font-heading",
            `'${storeData.font_heading}', sans-serif`,
          );
        if (storeData.font_body)
          root.style.setProperty(
            "--font-body",
            `'${storeData.font_body}', sans-serif`,
          );

        // Cargar fuentes dinámicamente desde Google Fonts
        const fonts = [storeData.font_heading, storeData.font_body]
          .filter(Boolean)
          .map((f) => f.replace(/\s+/g, "+") + ":wght@400;600;700")
          .join("&family=");

        if (fonts) {
          let link = document.getElementById("dynamic-store-fonts");
          if (!link) {
            link = document.createElement("link");
            link.id = "dynamic-store-fonts";
            link.rel = "stylesheet";
            document.head.appendChild(link);
          }
          link.href = `https://fonts.googleapis.com/css2?family=${fonts}&display=swap`;
        }

        if (storeData.name) {
          document.title = storeData.name;
        }
      } catch (err) {
        setError(err.response?.data?.message || "No se pudo cargar la tienda");
      } finally {
        setLoading(false);
      }
    };

    loadStore();
  }, [slug]);

  return (
    <StoreContext.Provider value={{ slug, store, categories, loading, error }}>
      {children}
    </StoreContext.Provider>
  );
}

export const useStore = () => useContext(StoreContext);
export const useTenant = useStore;
