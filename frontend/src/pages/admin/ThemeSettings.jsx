import { useEffect, useState } from "react";
import { Save, Upload, Plus, Trash2, Truck } from "lucide-react";
import api from "../../config/api.js";

export default function ThemeSettings() {
  const [form, setForm] = useState(null);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api
      .get("/admin/settings")
      .then((res) => {
        const payload = res.data?.data || {};
        const s = payload.settings || payload;

        setForm({
          ...s,
          mp_enabled: Boolean(s.mp_enabled),
          mp_access_token: s.mp_access_token || "",
          transfer_enabled: Boolean(s.transfer_enabled),
          cash_pickup_enabled: Boolean(s.cash_pickup_enabled),
          delivery_enabled: Boolean(s.delivery_enabled),
          pickup_enabled: Boolean(s.pickup_enabled),
          free_shipping_min: s.free_shipping_min ?? "",
          origin_postal_code: s.origin_postal_code || "",
          andreani_enabled: Boolean(s.andreani_enabled),
          andreani_user: s.andreani_user || "",
          andreani_password: s.andreani_password || "",
          andreani_contract: s.andreani_contract || "",
          correo_enabled: Boolean(s.correo_enabled),
          correo_api_key: s.correo_api_key || "",
          correo_agreement: s.correo_agreement || "",
        });

        let parsedZones = [];
        try {
          parsedZones =
            typeof s.shipping_zones === "string"
              ? JSON.parse(s.shipping_zones || "[]")
              : Array.isArray(s.shipping_zones)
                ? s.shipping_zones
                : [];
        } catch {
          parsedZones = [];
        }
        setZones(parsedZones);
      })
      .catch((err) => {
        console.error("Error cargando settings:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleImageUpload = async (e, fieldName) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingField(fieldName);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await api.post("/admin/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setForm((prev) => ({ ...prev, [fieldName]: res.data.data.url }));
    } catch {
      alert("Error al subir la imagen a Cloudinary");
    } finally {
      setUploadingField(null);
    }
  };

  const addZone = () => setZones((prev) => [...prev, { name: "", cost: 0 }]);

  const updateZone = (idx, field, val) =>
    setZones((prev) =>
      prev.map((z, i) => (i === idx ? { ...z, [field]: val } : z)),
    );

  const removeZone = (idx) =>
    setZones((prev) => prev.filter((_, i) => i !== idx));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const cleanZones = zones
        .filter((z) => z.name.trim() !== "")
        .map((z) => ({ name: z.name.trim(), cost: Number(z.cost || 0) }));

      await api.put("/admin/settings", {
        ...form,
        free_shipping_min:
          form.free_shipping_min === "" ? null : Number(form.free_shipping_min),
        shipping_zones: cleanZones,
      });
      setMessage(
        "Cambios guardados. Tu tienda pública ya refleja la nueva identidad y logística.",
      );
    } catch (err) {
      alert(err.response?.data?.message || "Error al guardar configuración");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return <p className="text-sm text-slate-500">Cargando diseño...</p>;
  if (!form)
    return (
      <p className="text-sm text-red-600">
        No se pudo cargar la configuración de la tienda.
      </p>
    );

  return (
    <form onSubmit={handleSave} className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Diseño y Marca</h1>
          <p className="text-sm text-slate-500">
            Personalizá colores, imágenes, logística automatizada y medios de
            cobro.
          </p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? "Guardando..." : "Guardar Cambios"}
        </button>
      </div>

      {message && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium">
          {message}
        </div>
      )}

      {/* Imágenes de Marca */}
      <div className="bg-white border rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-bold uppercase text-slate-500 mb-2">
            Logo del Comercio
          </label>
          <div className="flex items-center gap-4">
            {form.logo_url && (
              <img
                src={form.logo_url}
                alt="Logo"
                className="w-16 h-16 rounded-full object-cover border"
              />
            )}
            <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 border rounded-lg text-xs font-semibold hover:bg-slate-50">
              <Upload className="w-4 h-4" />
              {uploadingField === "logo_url" ? "Subiendo..." : "Subir Logo"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImageUpload(e, "logo_url")}
              />
            </label>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-slate-500 mb-2">
            Banner de Portada (Hero)
          </label>
          <div className="flex items-center gap-4">
            {form.banner_url && (
              <img
                src={form.banner_url}
                alt="Banner"
                className="w-28 h-16 rounded-lg object-cover border"
              />
            )}
            <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 border rounded-lg text-xs font-semibold hover:bg-slate-50">
              <Upload className="w-4 h-4" />
              {uploadingField === "banner_url" ? "Subiendo..." : "Subir Banner"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImageUpload(e, "banner_url")}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Paleta Camaleón */}
      <div className="bg-white border rounded-xl p-5 space-y-4">
        <h2 className="font-bold text-sm text-slate-900">
          Paleta de Colores y Tipografía
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { key: "primary_color", label: "Color Principal" },
            { key: "secondary_color", label: "Color Secundario" },
            { key: "accent_color", label: "Color Acento" },
            { key: "background_color", label: "Fondo Tienda" },
          ].map((c) => (
            <div key={c.key} className="p-3 border rounded-lg">
              <span className="block text-xs text-slate-500 mb-1.5">
                {c.label}
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form[c.key] || "#000000"}
                  onChange={(e) =>
                    setForm({ ...form, [c.key]: e.target.value })
                  }
                  className="w-8 h-8 rounded cursor-pointer border-0"
                />
                <span className="text-xs font-mono text-slate-700">
                  {form[c.key]}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Título de Portada
            </label>
            <input
              type="text"
              value={form.hero_title || ""}
              onChange={(e) => setForm({ ...form, hero_title: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Subtítulo de Portada
            </label>
            <input
              type="text"
              value={form.hero_subtitle || ""}
              onChange={(e) =>
                setForm({ ...form, hero_subtitle: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
        </div>
      </div>

      {/* Contacto y Envíos con Zonas + Correo Argentino / Andreani */}
      <div className="bg-white border rounded-xl p-5 space-y-4">
        <h2 className="font-bold text-sm text-slate-900">
          Contacto, Horarios y Logística
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              WhatsApp de Pedidos (ej: 5493435123456)
            </label>
            <input
              type="text"
              value={form.whatsapp_number || ""}
              onChange={(e) =>
                setForm({ ...form, whatsapp_number: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Dirección del Local
            </label>
            <input
              type="text"
              value={form.address || ""}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Código Postal de Origen (para cotizar envíos)
            </label>
            <input
              type="text"
              placeholder="Ej: 3150"
              value={form.origin_postal_code || ""}
              onChange={(e) =>
                setForm({ ...form, origin_postal_code: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Horarios de Atención
            </label>
            <input
              type="text"
              value={form.business_hours || ""}
              onChange={(e) =>
                setForm({ ...form, business_hours: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Costo Envío Base / Tarifa Plana ($)
            </label>
            <input
              type="number"
              min="0"
              value={form.flat_delivery_cost || 0}
              onChange={(e) =>
                setForm({ ...form, flat_delivery_cost: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Envío Gratis a partir de ($ opcional)
            </label>
            <input
              type="number"
              min="0"
              placeholder="Ej: 35000"
              value={form.free_shipping_min}
              onChange={(e) =>
                setForm({ ...form, free_shipping_min: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-6 pt-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.pickup_enabled}
              onChange={(e) =>
                setForm({ ...form, pickup_enabled: e.target.checked })
              }
            />
            Retiro en local habilitado
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.delivery_enabled}
              onChange={(e) =>
                setForm({ ...form, delivery_enabled: e.target.checked })
              }
            />
            Envío a domicilio habilitado
          </label>
        </div>

        {/* Logística Nacional Automatizada: Andreani y Correo Argentino */}
        {form.delivery_enabled && (
          <div className="border-t pt-4 space-y-4">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-slate-700" />
              <span className="text-xs font-bold uppercase text-slate-600">
                Logística Nacional Automatizada (Cotización por CP y Etiquetas)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Andreani */}
              <div className="p-4 border rounded-xl space-y-2.5 bg-slate-50/50">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <input
                    type="checkbox"
                    checked={form.andreani_enabled}
                    onChange={(e) =>
                      setForm({ ...form, andreani_enabled: e.target.checked })
                    }
                  />
                  Habilitar Andreani
                </label>
                {form.andreani_enabled && (
                  <div className="space-y-2 pt-1">
                    <input
                      type="text"
                      placeholder="Usuario API Andreani (opcional para tarifario)"
                      value={form.andreani_user}
                      onChange={(e) =>
                        setForm({ ...form, andreani_user: e.target.value })
                      }
                      className="w-full px-3 py-1.5 border rounded-lg text-xs bg-white"
                    />
                    <input
                      type="password"
                      placeholder="Contraseña API Andreani"
                      value={form.andreani_password}
                      onChange={(e) =>
                        setForm({ ...form, andreani_password: e.target.value })
                      }
                      className="w-full px-3 py-1.5 border rounded-lg text-xs bg-white"
                    />
                    <input
                      type="text"
                      placeholder="N° de Contrato Andreani"
                      value={form.andreani_contract}
                      onChange={(e) =>
                        setForm({ ...form, andreani_contract: e.target.value })
                      }
                      className="w-full px-3 py-1.5 border rounded-lg text-xs bg-white"
                    />
                  </div>
                )}
              </div>

              {/* Correo Argentino */}
              <div className="p-4 border rounded-xl space-y-2.5 bg-slate-50/50">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <input
                    type="checkbox"
                    checked={form.correo_enabled}
                    onChange={(e) =>
                      setForm({ ...form, correo_enabled: e.target.checked })
                    }
                  />
                  Habilitar Correo Argentino (MiCorreo)
                </label>
                {form.correo_enabled && (
                  <div className="space-y-2 pt-1">
                    <input
                      type="password"
                      placeholder="API Key / Token MiCorreo (opcional para tarifario)"
                      value={form.correo_api_key}
                      onChange={(e) =>
                        setForm({ ...form, correo_api_key: e.target.value })
                      }
                      className="w-full px-3 py-1.5 border rounded-lg text-xs bg-white"
                    />
                    <input
                      type="text"
                      placeholder="ID Cliente / Acuerdo MiCorreo"
                      value={form.correo_agreement}
                      onChange={(e) =>
                        setForm({ ...form, correo_agreement: e.target.value })
                      }
                      className="w-full px-3 py-1.5 border rounded-lg text-xs bg-white"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Zonas de Envío */}
        {form.delivery_enabled && (
          <div className="border-t pt-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-500">
                Zonas de Envío Locales (Opcional)
              </span>
              <button
                type="button"
                onClick={addZone}
                className="text-xs font-semibold text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar Zona
              </button>
            </div>
            {zones.length === 0 ? (
              <p className="text-xs text-slate-400">
                Si no cargás zonas, se usará la Tarifa Plana o la cotización por
                Código Postal.
              </p>
            ) : (
              <div className="space-y-2">
                {zones.map((z, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Ej: Centro / Radio Urbano"
                      value={z.name}
                      onChange={(e) => updateZone(idx, "name", e.target.value)}
                      className="flex-1 px-3 py-1.5 border rounded-lg text-xs"
                    />
                    <input
                      type="number"
                      min="0"
                      placeholder="Costo $"
                      value={z.cost}
                      onChange={(e) => updateZone(idx, "cost", e.target.value)}
                      className="w-28 px-3 py-1.5 border rounded-lg text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => removeZone(idx)}
                      className="p-1.5 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Medios de Cobro */}
      <div className="bg-white border rounded-xl p-5 space-y-4">
        <h2 className="font-bold text-sm text-slate-900">Medios de Cobro</h2>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.transfer_enabled}
              onChange={(e) =>
                setForm({ ...form, transfer_enabled: e.target.checked })
              }
            />
            Transferencia Bancaria
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.cash_pickup_enabled}
              onChange={(e) =>
                setForm({ ...form, cash_pickup_enabled: e.target.checked })
              }
            />
            Efectivo al retirar / recibir
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.mp_enabled}
              onChange={(e) =>
                setForm({ ...form, mp_enabled: e.target.checked })
              }
            />
            Mercado Pago (Checkout Pro)
          </label>
        </div>

        {form.transfer_enabled && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <input
              type="text"
              placeholder="Alias (ej: vinoteca.nogoya.mp)"
              value={form.transfer_alias || ""}
              onChange={(e) =>
                setForm({ ...form, transfer_alias: e.target.value })
              }
              className="px-3 py-2 border rounded-lg text-sm"
            />
            <input
              type="text"
              placeholder="CBU / CVU (22 dígitos)"
              value={form.transfer_cbu || ""}
              onChange={(e) =>
                setForm({ ...form, transfer_cbu: e.target.value })
              }
              className="px-3 py-2 border rounded-lg text-sm"
            />
            <input
              type="text"
              placeholder="Titular de la cuenta"
              value={form.transfer_holder || ""}
              onChange={(e) =>
                setForm({ ...form, transfer_holder: e.target.value })
              }
              className="px-3 py-2 border rounded-lg text-sm"
            />
          </div>
        )}

        {form.mp_enabled && (
          <div className="pt-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Access Token de Producción de Mercado Pago (APP_USR-...)
            </label>
            <input
              type="password"
              placeholder="APP_USR-0000000000000000-..."
              value={form.mp_access_token}
              onChange={(e) =>
                setForm({ ...form, mp_access_token: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Obtenelo desde Mercado Pago Developers &rarr; Tus integraciones
              &rarr; Credenciales de producción.
            </p>
          </div>
        )}
      </div>
    </form>
  );
}
