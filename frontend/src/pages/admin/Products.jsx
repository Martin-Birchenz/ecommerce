import { useEffect, useState } from "react";
import {
  Plus,
  Upload,
  Star,
  Eye,
  EyeOff,
  AlertTriangle,
  Trash2,
  FolderPlus,
  Pencil,
} from "lucide-react";
import api from "../../config/api.js";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [newCatName, setNewCatName] = useState("");
  const [newSubcatName, setNewSubcatName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const initialForm = {
    category_id: "",
    subcategory_id: "",
    name: "",
    description: "",
    base_price: "",
    unit_type: "unidad",
    min_step: 1,
    is_featured: false,
    images: [],
    variants: [
      {
        attribute_name: "Presentación",
        attribute_value: "Única",
        stock: 10,
        min_stock_alert: 3,
        price_override: null,
      },
    ],
  };

  const [form, setForm] = useState(initialForm);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        api.get("/admin/products"),
        api.get("/admin/categories"),
      ]);
      setProducts(prodRes.data.data || []);
      const cats = catRes.data.data || [];
      setCategories(cats);
      if (cats.length > 0 && !form.category_id) {
        setForm((prev) => ({ ...prev, category_id: cats[0].id }));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Cargar subcategorías cada vez que cambia la categoría seleccionada
  useEffect(() => {
    if (!form.category_id) {
      setSubcategories([]);
      return;
    }
    api
      .get("/admin/subcategories", {
        params: { category_id: form.category_id },
      })
      .then((res) => setSubcategories(res.data.data || []));
  }, [form.category_id]);

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const res = await api.post("/admin/categories", {
      name: newCatName.trim(),
    });
    const created = res.data.data;
    setCategories((prev) => [...prev, created]);
    setForm((prev) => ({
      ...prev,
      category_id: created.id,
      subcategory_id: "",
    }));
    setNewCatName("");
  };

  const handleCreateSubcategory = async (e) => {
    e.preventDefault();
    if (!form.category_id || !newSubcatName.trim()) return;
    const res = await api.post("/admin/subcategories", {
      category_id: Number(form.category_id),
      name: newSubcatName.trim(),
    });
    const created = res.data.data;
    setSubcategories((prev) => [...prev, created]);
    setForm((prev) => ({ ...prev, subcategory_id: created.id }));
    setNewSubcatName("");
  };

  const handleImageUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append("images", file));

    setUploading(true);
    try {
      const res = await api.post("/admin/products/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setForm((prev) => ({
        ...prev,
        images: [...prev.images, ...res.data.data],
      }));
    } catch (err) {
      alert(err.response?.data?.message || "Error subiendo imágenes");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const addVariantRow = () => {
    const defaultAttr = form.variants[0]?.attribute_name || "Talle";
    setForm((prev) => ({
      ...prev,
      variants: [
        ...prev.variants,
        {
          attribute_name: defaultAttr,
          attribute_value: "",
          stock: 5,
          min_stock_alert: 3,
          price_override: null,
        },
      ],
    }));
  };

  const updateVariantRow = (index, field, value) => {
    setForm((prev) => {
      const copy = [...prev.variants];
      copy[index] = { ...copy[index], [field]: value };
      return { ...prev, variants: copy };
    });
  };

  const removeVariantRow = (index) => {
    if (form.variants.length <= 1) return;
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index),
    }));
  };

  const startEditing = (product) => {
    setEditingId(product.id);
    const activeVars = product.variants?.filter((v) => v.is_active === 1) || [];
    setForm({
      category_id: product.category_id,
      subcategory_id: product.subcategory_id || "",
      name: product.name,
      description: product.description || "",
      base_price: product.base_price,
      unit_type: product.unit_type,
      min_step: product.min_step,
      is_featured: product.is_featured === 1,
      images: product.images || [],
      variants:
        activeVars.length > 0
          ? activeVars.map((v) => ({
              id: v.id,
              attribute_name: v.attribute_name,
              attribute_value: v.attribute_value,
              stock: v.stock,
              min_stock_alert: v.min_stock_alert,
              price_override: v.price_override,
            }))
          : initialForm.variants,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...initialForm, category_id: categories[0]?.id || "" });
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        category_id: Number(form.category_id),
        subcategory_id: form.subcategory_id
          ? Number(form.subcategory_id)
          : null,
        base_price: Number(form.base_price),
        min_step: Number(form.min_step),
        variants: form.variants.map((v) => ({
          ...(v.id ? { id: v.id } : {}),
          attribute_name: v.attribute_name,
          attribute_value: v.attribute_value,
          stock: Number(v.stock),
          min_stock_alert: Number(v.min_stock_alert),
          price_override: v.price_override ? Number(v.price_override) : null,
        })),
      };

      if (editingId) {
        await api.put(`/admin/products/${editingId}`, payload);
      } else {
        await api.post("/admin/products", payload);
      }

      handleCloseForm();
      await loadData();
    } catch (err) {
      alert(err.response?.data?.message || "Revisá los datos del producto");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleFlag = async (productId, field, currentValue) => {
    await api.patch(`/admin/products/${productId}/toggle`, {
      field,
      value: !currentValue,
    });
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, [field]: currentValue ? 0 : 1 } : p,
      ),
    );
  };

  const handleQuickStock = async (variantId, newStock) => {
    await api.patch(`/admin/variants/${variantId}/stock`, {
      stock: Number(newStock),
    });
    setProducts((prev) =>
      prev.map((p) => ({
        ...p,
        variants: p.variants.map((v) =>
          v.id === variantId ? { ...v, stock: Number(newStock) } : v,
        ),
      })),
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Productos y Stock
          </h1>
          <p className="text-sm text-slate-500">
            Administrá tu catálogo, categorías, variantes y alertas de
            reposición.
          </p>
        </div>

        <button
          onClick={() => (showForm ? handleCloseForm() : setShowForm(true))}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          {showForm ? "Cerrar Formulario" : "Nuevo Producto"}
        </button>
      </div>

      {/* Alta Rápida de Categorías y Subcategorías */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <form
          onSubmit={handleCreateCategory}
          className="bg-white border rounded-xl p-3.5 flex items-center gap-2 text-sm"
        >
          <FolderPlus className="w-4 h-4 text-slate-500 shrink-0" />
          <input
            type="text"
            placeholder="Nueva categoría madre..."
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            className="flex-1 px-2.5 py-1.5 border rounded-lg text-xs"
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold rounded-lg text-xs cursor-pointer"
          >
            + Categoría
          </button>
        </form>

        <form
          onSubmit={handleCreateSubcategory}
          className="bg-white border rounded-xl p-3.5 flex items-center gap-2 text-sm"
        >
          <input
            type="text"
            placeholder="Nueva subcategoría (para la cat. elegida)..."
            value={newSubcatName}
            onChange={(e) => setNewSubcatName(e.target.value)}
            className="flex-1 px-2.5 py-1.5 border rounded-lg text-xs"
          />
          <button
            type="submit"
            disabled={!form.category_id}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold rounded-lg text-xs cursor-pointer disabled:opacity-40"
          >
            + Subcategoría
          </button>
        </form>
      </div>

      {/* Formulario de Alta / Edición de Producto */}
      {showForm && (
        <form
          onSubmit={handleSaveProduct}
          className="bg-white border rounded-xl p-5 space-y-5 text-sm shadow-sm"
        >
          <h2 className="font-bold text-base text-slate-900 border-b pb-2">
            {editingId ? "Editar Producto" : "Cargar Nuevo Producto"}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-1">Categoría *</label>
              <select
                required
                value={form.category_id}
                onChange={(e) =>
                  setForm({
                    ...form,
                    category_id: e.target.value,
                    subcategory_id: "",
                  })
                }
                className="w-full px-3 py-2 border rounded-lg"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">
                Subcategoría (opcional)
              </label>
              <select
                value={form.subcategory_id}
                onChange={(e) =>
                  setForm({ ...form, subcategory_id: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Sin subcategoría</option>
                {subcategories.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-1">
                Nombre del Producto *
              </label>
              <input
                required
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Ej: Malbec Reserva 750ml"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">
                Precio Base ($) *
              </label>
              <input
                required
                type="number"
                step="0.01"
                value={form.base_price}
                onChange={(e) =>
                  setForm({ ...form, base_price: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="15000"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold mb-1">
                Unidad de Medida
              </label>
              <select
                value={form.unit_type}
                onChange={(e) =>
                  setForm({ ...form, unit_type: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="unidad">Unidad</option>
                <option value="kg">Kilogramo (kg)</option>
                <option value="100g">Cada 100g</option>
                <option value="litro">Litro</option>
                <option value="metro">Metro</option>
                <option value="paquete">Paquete</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">
                Salto Mínimo de Compra
              </label>
              <input
                type="number"
                step="0.001"
                value={form.min_step}
                onChange={(e) => setForm({ ...form, min_step: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            <div className="flex items-end pb-2">
              <label className="inline-flex items-center gap-2 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_featured}
                  onChange={(e) =>
                    setForm({ ...form, is_featured: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                Mostrar como Destacado
              </label>
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1">
              Descripción (opcional)
            </label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          {/* Subida de Imágenes a Cloudinary */}
          <div className="border-t pt-4">
            <label className="block font-semibold mb-2">
              Imágenes del Producto
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 px-4 py-2 border border-dashed rounded-lg cursor-pointer hover:bg-slate-50">
                <Upload className="w-4 h-4" />
                <span>
                  {uploading ? "Subiendo a Cloudinary..." : "Subir Fotos"}
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>

              {form.images.map((img, idx) => (
                <div key={idx} className="relative group">
                  <img
                    src={img.image_url}
                    alt="Preview"
                    className="w-14 h-14 object-cover rounded border"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600 text-white text-xs flex items-center justify-center cursor-pointer"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Variantes Dinámicas */}
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">
                Variantes / Presentaciones y Stock
              </span>
              <button
                type="button"
                onClick={addVariantRow}
                className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
              >
                + Agregar otra variante (talle, color, peso)
              </button>
            </div>

            {form.variants.map((variant, idx) => (
              <div
                key={idx}
                className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-center bg-slate-50 p-2.5 rounded-lg"
              >
                <input
                  type="text"
                  placeholder="Atributo (ej: Talle)"
                  value={variant.attribute_name}
                  onChange={(e) =>
                    updateVariantRow(idx, "attribute_name", e.target.value)
                  }
                  className="px-2.5 py-1.5 border rounded bg-white text-xs"
                />
                <input
                  type="text"
                  placeholder="Valor (ej: XL)"
                  value={variant.attribute_value}
                  onChange={(e) =>
                    updateVariantRow(idx, "attribute_value", e.target.value)
                  }
                  className="px-2.5 py-1.5 border rounded bg-white text-xs"
                />
                <input
                  type="number"
                  step="0.001"
                  placeholder="Stock"
                  value={variant.stock}
                  onChange={(e) =>
                    updateVariantRow(idx, "stock", e.target.value)
                  }
                  className="px-2.5 py-1.5 border rounded bg-white text-xs"
                />
                <input
                  type="number"
                  placeholder="Precio especial (opc.)"
                  value={variant.price_override || ""}
                  onChange={(e) =>
                    updateVariantRow(idx, "price_override", e.target.value)
                  }
                  className="px-2.5 py-1.5 border rounded bg-white text-xs"
                />
                <button
                  type="button"
                  onClick={() => removeVariantRow(idx)}
                  className="text-red-500 text-xs flex items-center justify-center cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleCloseForm}
              className="px-4 py-2 border rounded-lg font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || uploading}
              className="px-6 py-2 bg-slate-900 text-white rounded-lg font-semibold cursor-pointer disabled:opacity-50"
            >
              {submitting
                ? "Guardando..."
                : editingId
                  ? "Actualizar Producto"
                  : "Guardar Producto"}
            </button>
          </div>
        </form>
      )}

      {/* Listado de Productos */}
      <div className="bg-white border rounded-xl overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-slate-500">Cargando catálogo...</p>
        ) : products.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">
            Todavía no hay productos cargados.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b text-xs uppercase text-slate-500">
                <tr>
                  <th className="p-3.5">Producto</th>
                  <th className="p-3.5">Precio</th>
                  <th className="p-3.5">Stock por Variante</th>
                  <th className="p-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {products.map((p) => (
                  <tr
                    key={p.id}
                    className={p.is_active ? "" : "opacity-50 bg-slate-50"}
                  >
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        {p.images?.[0] ? (
                          <img
                            src={p.images[0].image_url}
                            alt={p.name}
                            className="w-11 h-11 rounded object-cover border"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded bg-slate-100 border" />
                        )}
                        <div>
                          <p className="font-bold text-slate-900">{p.name}</p>
                          <p className="text-xs text-slate-500">
                            {p.category_name}
                            {p.subcategory_name
                              ? ` › ${p.subcategory_name}`
                              : ""}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5 font-semibold">
                      ${Number(p.base_price).toLocaleString("es-AR")}
                    </td>

                    <td className="p-3.5">
                      <div className="space-y-1.5">
                        {p.variants
                          ?.filter((v) => v.is_active === 1)
                          .map((v) => {
                            const lowStock =
                              Number(v.stock) <= Number(v.min_stock_alert);
                            return (
                              <div
                                key={v.id}
                                className="flex items-center gap-2 text-xs"
                              >
                                <span className="font-medium text-slate-700 min-w-24">
                                  {v.attribute_value}:
                                </span>
                                <input
                                  type="number"
                                  step="0.001"
                                  defaultValue={v.stock}
                                  onBlur={(e) =>
                                    handleQuickStock(v.id, e.target.value)
                                  }
                                  className={`w-20 px-2 py-1 border rounded font-bold ${
                                    lowStock
                                      ? "border-amber-400 bg-amber-50 text-amber-800"
                                      : ""
                                  }`}
                                />
                                {lowStock && (
                                  <span
                                    title="Stock bajo"
                                    className="text-amber-600 inline-flex items-center"
                                  >
                                    <AlertTriangle className="w-4 h-4" />
                                  </span>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </td>

                    <td className="p-3.5 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => startEditing(p)}
                          title="Editar producto"
                          className="p-2 rounded border text-slate-600 hover:bg-slate-100 cursor-pointer"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            handleToggleFlag(
                              p.id,
                              "is_featured",
                              p.is_featured === 1,
                            )
                          }
                          title="Destacar"
                          className={`p-2 rounded border cursor-pointer ${
                            p.is_featured === 1
                              ? "bg-amber-50 border-amber-300 text-amber-600"
                              : "text-slate-400"
                          }`}
                        >
                          <Star className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            handleToggleFlag(
                              p.id,
                              "is_active",
                              p.is_active === 1,
                            )
                          }
                          title={
                            p.is_active === 1
                              ? "Ocultar de tienda"
                              : "Publicar en tienda"
                          }
                          className="p-2 rounded border text-slate-600 hover:bg-slate-100 cursor-pointer"
                        >
                          {p.is_active === 1 ? (
                            <Eye className="w-4 h-4" />
                          ) : (
                            <EyeOff className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
