import { useEffect, useState } from "react";
import { Check, Sparkles } from "lucide-react";
import api from "../../config/api.js";

const THEME_PRESETS = [
  {
    name: "Boutique Editorial",
    primary_color: "#7C2D12",
    secondary_color: "#B45309",
    accent_color: "#15803D",
    background_color: "#FAF7F2",
    surface_color: "#F3ECE1",
    text_color: "#1C1917",
    font_heading: "Playfair Display",
    font_body: "Plus Jakarta Sans",
    border_radius: "0.25rem",
  },
  {
    name: "Vinoteca Reserva",
    primary_color: "#4C0519",
    secondary_color: "#881337",
    accent_color: "#CA8A04",
    background_color: "#FFFFFF",
    surface_color: "#FFF1F2",
    text_color: "#18181B",
    font_heading: "Cormorant Garamond",
    font_body: "Inter",
    border_radius: "0.375rem",
  },
  {
    name: "Dietética & Natural",
    primary_color: "#14532D",
    secondary_color: "#3F6212",
    accent_color: "#D97706",
    background_color: "#F7FEE7",
    surface_color: "#ECFCCB",
    text_color: "#1A2E05",
    font_heading: "Outfit",
    font_body: "Inter",
    border_radius: "0.75rem",
  },
  {
    name: "Urbano / Tech Moderno",
    primary_color: "#0F172A",
    secondary_color: "#2563EB",
    accent_color: "#10B981",
    background_color: "#FFFFFF",
    surface_color: "#F1F5F9",
    text_color: "#0F172A",
    font_heading: "Plus Jakarta Sans",
    font_body: "Inter",
    border_radius: "0.5rem",
  },
];

export default function ThemeSettings() {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [uploadingAsset, setUploadingAsset] = useState(null); // 'logo_url' | 'banner_desktop_url'

  const handleAssetUpload = async (e, fieldName) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("images", file);

    setUploadingAsset(fieldName);
    try {
      const res = await api.post("/admin/products/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url = res.data.data?.[0]?.image_url;
      if (url) {
        setForm((prev) => ({ ...prev, [fieldName]: url }));
      }
    } catch (err) {
      alert("Error al subir imagen");
    } finally {
      setUploadingAsset(null);
    }
  };

  useEffect(() => {
    api.get("/admin/settings").then((res) => setForm(res.data.data));
  }, []);

  const applyPreset = (preset) => {
    const { name, ...styles } = preset;
    setForm((prev) => ({ ...prev, ...styles }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put("/admin/settings", form);
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  if (!form)
    return <p className="text-sm text-slate-500">Cargando configuración...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Diseño y Personalización de Marca
        </h1>
        <p className="text-sm text-slate-500">
          Elegí un estilo base o personalizá colores, tipografía y datos de
          cobro.
        </p>
      </div>

      {/* Presets con 1 clic */}
      <div className="bg-white border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <h2 className="font-bold text-sm text-slate-800">
            Plantillas Rápidas por Rubro
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {THEME_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => applyPreset(preset)}
              className="p-3 border rounded-lg text-left hover:border-slate-900 transition cursor-pointer"
            >
              <div className="flex gap-1.5 mb-2">
                <span
                  className="w-5 h-5 rounded-full border"
                  style={{ backgroundColor: preset.primary_color }}
                />
                <span
                  className="w-5 h-5 rounded-full border"
                  style={{ backgroundColor: preset.secondary_color }}
                />
                <span
                  className="w-5 h-5 rounded-full border"
                  style={{ backgroundColor: preset.background_color }}
                />
              </div>
              <p className="font-semibold text-xs text-slate-900">
                {preset.name}
              </p>
              <p className="text-[11px] text-slate-500">
                {preset.font_heading}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Formulario Detallado */}
      <form
        onSubmit={handleSave}
        className="bg-white border rounded-xl p-5 space-y-6 text-sm"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold mb-1">
              Nombre del Comercio
            </label>
            <input
              type="text"
              value={form.name || ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">
              WhatsApp de Pedidos (con 549...)
            </label>
            <input
              type="text"
              value={form.whatsapp_number || ""}
              onChange={(e) =>
                setForm({ ...form, whatsapp_number: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">
              Título Principal (Hero)
            </label>
            <input
              type="text"
              value={form.hero_title || ""}
              onChange={(e) => setForm({ ...form, hero_title: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Subtítulo</label>
            <input
              type="text"
              value={form.hero_subtitle || ""}
              onChange={(e) =>
                setForm({ ...form, hero_subtitle: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>

        {/* Logo y Banner en Cloudinary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
          <div className="border rounded-lg p-3.5 bg-slate-50/50">
            <label className="block font-semibold mb-2">
              Logo del Comercio
            </label>
            <div className="flex items-center gap-3">
              {form.logo_url && (
                <img
                  src={form.logo_url}
                  alt="Logo"
                  className="w-12 h-12 object-contain rounded border bg-white p-1"
                />
              )}
              <label className="px-3.5 py-2 bg-white border rounded-lg text-xs font-semibold cursor-pointer hover:bg-slate-50">
                {uploadingAsset === "logo_url" ? "Subiendo..." : "Subir Logo"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleAssetUpload(e, "logo_url")}
                  className="hidden"
                />
              </label>
              {form.logo_url && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, logo_url: "" })}
                  className="text-xs text-red-600 hover:underline cursor-pointer"
                >
                  Quitar
                </button>
              )}
            </div>
          </div>

          <div className="border rounded-lg p-3.5 bg-slate-50/50">
            <label className="block font-semibold mb-2">
              Imagen de Portada (Banner)
            </label>
            <div className="flex items-center gap-3">
              {form.banner_desktop_url && (
                <img
                  src={form.banner_desktop_url}
                  alt="Banner"
                  className="w-20 h-12 object-cover rounded border bg-white"
                />
              )}
              <label className="px-3.5 py-2 bg-white border rounded-lg text-xs font-semibold cursor-pointer hover:bg-slate-50">
                {uploadingAsset === "banner_desktop_url"
                  ? "Subiendo..."
                  : "Subir Banner"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleAssetUpload(e, "banner_desktop_url")}
                  className="hidden"
                />
              </label>
              {form.banner_desktop_url && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, banner_desktop_url: "" })}
                  className="text-xs text-red-600 hover:underline cursor-pointer"
                >
                  Quitar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Paleta de Colores */}
        <div>
          <h3 className="font-bold text-slate-800 mb-3">Paleta de Colores</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { key: "primary_color", label: "Principal" },
              { key: "secondary_color", label: "Secundario" },
              { key: "accent_color", label: "Acento" },
              { key: "background_color", label: "Fondo" },
              { key: "surface_color", label: "Tarjetas" },
              { key: "text_color", label: "Texto" },
            ].map((item) => (
              <div key={item.key} className="border rounded-lg p-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {item.label}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form[item.key] || "#000000"}
                    onChange={(e) =>
                      setForm({ ...form, [item.key]: e.target.value })
                    }
                    className="w-8 h-8 cursor-pointer border-0 bg-transparent"
                  />
                  <span className="text-xs font-mono uppercase">
                    {form[item.key]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tipografía y Bordes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block font-semibold mb-1">
              Fuente de Títulos
            </label>
            <select
              value={form.font_heading}
              onChange={(e) =>
                setForm({ ...form, font_heading: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="Plus Jakarta Sans">
                Plus Jakarta Sans (Moderna)
              </option>
              <option value="Playfair Display">
                Playfair Display (Editorial)
              </option>
              <option value="Cormorant Garamond">
                Cormorant Garamond (Clásica)
              </option>
              <option value="Outfit">Outfit (Geométrica)</option>
            </select>
          </div>
          <div>
            <label className="block font-semibold mb-1">
              Redondeo de Bordes
            </label>
            <select
              value={form.border_radius}
              onChange={(e) =>
                setForm({ ...form, border_radius: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="0px">Recto (0px)</option>
              <option value="0.25rem">Sutil (4px)</option>
              <option value="0.5rem">Estándar (8px)</option>
              <option value="1rem">Redondeado (16px)</option>
            </select>
          </div>
          <div>
            <label className="block font-semibold mb-1">
              Costo Envío Local ($)
            </label>
            <input
              type="number"
              value={form.flat_delivery_cost || 0}
              onChange={(e) =>
                setForm({ ...form, flat_delivery_cost: Number(e.target.value) })
              }
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>

        {/* Datos Bancarios */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t">
          <div>
            <label className="block font-semibold mb-1">
              Alias Bancario (Transferencias)
            </label>
            <input
              type="text"
              value={form.bank_alias || ""}
              onChange={(e) => setForm({ ...form, bank_alias: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="mi.comercio.mp"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">CBU / CVU</label>
            <input
              type="text"
              value={form.bank_cbu || ""}
              onChange={(e) => setForm({ ...form, bank_cbu: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">
              Titular de Cuenta
            </label>
            <input
              type="text"
              value={form.bank_holder_name || ""}
              onChange={(e) =>
                setForm({ ...form, bank_holder_name: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 cursor-pointer disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar Cambios"}
          </button>
          {savedToast && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg">
              <Check className="w-4 h-4" /> ¡Cambios aplicados! Actualizá la
              tienda para verlos.
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
