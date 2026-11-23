import { useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Upload,
  FolderPlus,
  Percent,
  Minus,
} from "lucide-react";
import api from "../../config/api.js";

const emptyProductForm = {
  id: null,
  category_id: "",
  subcategory_id: "",
  name: "",
  description: "",
  base_price: "",
  compare_at_price: "",
  unit_label: "Unidad",
  is_featured: false,
  is_active: true,
  images: [],
  variants: [
    {
      attribute_name: "Opción",
      attribute_value: "Estándar",
      price_override: "",
      stock: 10,
      min_stock_alert: 3,
      is_active: true,
    },
  ],
};

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados para crear categoría / subcategoría
  const [newCatName, setNewCatName] = useState("");
  const [newSubName, setNewSubName] = useState("");
  const [newSubCatId, setNewSubCatId] = useState("");

  // Estado modal producto
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyProductForm);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [saving, setSaving] = useState(false);

  // Estado modal actualización masiva de precios
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkForm, setBulkForm] = useState({
    adjustment_type: "percentage",
    adjustment_value: "",
    category_id: "",
    subcategory_id: "",
    include_variants: true,
    rounding: "integer",
  });

  // Estado de ajuste rápido de stock en mostrador
  const [updatingVariantId, setUpdatingVariantId] = useState(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes, subRes] = await Promise.all([
        api.get("/admin/products"),
        api.get("/admin/categories"),
        api.get("/admin/subcategories").catch(() => ({ data: { data: [] } })),
      ]);

      const rawProds = prodRes.data?.data;
      const prodList = Array.isArray(rawProds)
        ? rawProds
        : Array.isArray(rawProds?.products)
          ? rawProds.products
          : [];

      const rawCats = catRes.data?.data;
      const catList = Array.isArray(rawCats)
        ? rawCats
        : Array.isArray(rawCats?.categories)
          ? rawCats.categories
          : [];

      const rawSubs = subRes.data?.data;
      const subList = Array.isArray(rawSubs)
        ? rawSubs
        : Array.isArray(rawCats?.subcategories)
          ? rawCats.subcategories
          : [];

      setProducts(prodList);
      setCategories(catList);
      setSubcategories(subList);

      if (catList.length > 0 && !newSubCatId) {
        setNewSubCatId(catList[0].id);
      }
    } catch (err) {
      console.error("Error cargando productos/categorías:", err);
      setProducts([]);
      setCategories([]);
      setSubcategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleQuickStockDelta = async (variantId, delta) => {
    setUpdatingVariantId(variantId);
    try {
      const res = await api.patch(`/admin/variants/${variantId}/stock`, {
        delta,
      });
      const updatedStock = res.data?.data?.stock;
      if (updatedStock !== undefined) {
        setProducts((prev) =>
          prev.map((p) => ({
            ...p,
            variants: Array.isArray(p.variants)
              ? p.variants.map((v) =>
                  v.id === variantId ? { ...v, stock: updatedStock } : v,
                )
              : [],
          })),
        );
      } else {
        await loadAll();
      }
    } catch (err) {
      alert(err.response?.data?.message || "No se pudo ajustar el stock");
    } finally {
      setUpdatingVariantId(null);
    }
  };

  const handleBulkPriceSubmit = async (e) => {
    e.preventDefault();
    const val = Number(bulkForm.adjustment_value);
    if (!val || Number.isNaN(val)) {
      alert("Ingresá un porcentaje o monto distinto de 0");
      return;
    }
    setBulkSaving(true);
    try {
      const res = await api.post("/admin/products/bulk-price", {
        adjustment_type: bulkForm.adjustment_type,
        adjustment_value: val,
        category_id: bulkForm.category_id || null,
        subcategory_id: bulkForm.subcategory_id || null,
        include_variants: Boolean(bulkForm.include_variants),
        rounding: bulkForm.rounding,
      });
      alert(res.data?.message || "Precios actualizados correctamente");
      setShowBulkModal(false);
      setBulkForm((prev) => ({ ...prev, adjustment_value: "" }));
      await loadAll();
    } catch (err) {
      alert(
        err.response?.data?.message ||
          "No se pudieron actualizar los precios masivamente",
      );
    } finally {
      setBulkSaving(false);
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await api.post("/admin/categories", { name: newCatName.trim() });
      setNewCatName("");
      loadAll();
    } catch (err) {
      alert(err.response?.data?.message || "No se pudo crear la categoría");
    }
  };

  const handleDeleteCategory = async (catId, catName) => {
    if (!confirm(`¿Eliminar la categoría "${catName}"?`)) return;
    try {
      await api.delete(`/admin/categories/${catId}`);
      loadAll();
    } catch (err) {
      alert(err.response?.data?.message || "No se pudo eliminar la categoría");
    }
  };

  const handleCreateSubcategory = async (e) => {
    e.preventDefault();
    if (!newSubName.trim() || !newSubCatId) return;
    try {
      await api.post("/admin/subcategories", {
        category_id: Number(newSubCatId),
        name: newSubName.trim(),
      });
      setNewSubName("");
      loadAll();
    } catch (err) {
      alert(err.response?.data?.message || "No se pudo crear la subcategoría");
    }
  };

  const handleDeleteSubcategory = async (subId, subName) => {
    if (!confirm(`¿Eliminar la subcategoría "${subName}"?`)) return;
    try {
      await api.delete(`/admin/subcategories/${subId}`);
      loadAll();
    } catch (err) {
      alert(
        err.response?.data?.message || "No se pudo eliminar la subcategoría",
      );
    }
  };

  const openNewProduct = () => {
    setForm({
      ...emptyProductForm,
      category_id: categories[0]?.id || "",
    });
    setShowModal(true);
  };

  const openEditProduct = (prod) => {
    setForm({
      id: prod.id,
      category_id: prod.category_id,
      subcategory_id: prod.subcategory_id || "",
      name: prod.name,
      description: prod.description || "",
      base_price: prod.base_price,
      compare_at_price: prod.compare_at_price ?? "",
      unit_label: prod.unit_label || "Unidad",
      is_featured: Boolean(prod.is_featured),
      is_active: Boolean(prod.is_active),
      images: Array.isArray(prod.images) ? prod.images : [],
      variants:
        Array.isArray(prod.variants) && prod.variants.length > 0
          ? prod.variants.map((v) => ({
              ...v,
              price_override: v.price_override ?? "",
              is_active: Boolean(v.is_active),
            }))
          : emptyProductForm.variants,
    });
    setShowModal(true);
  };

  const handleProductImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    try {
      const fd = new FormData();
      fd.append("images", file);
      const res = await api.post("/admin/products/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const uploadedUrl = res.data?.data?.[0]?.image_url || res.data?.data?.url;
      if (uploadedUrl) {
        setForm((prev) => ({
          ...prev,
          images: [
            ...prev.images,
            {
              image_url: uploadedUrl,
              is_primary: prev.images.length === 0,
            },
          ],
        }));
      }
    } catch {
      alert("Error al subir imagen");
    } finally {
      setUploadingImg(false);
    }
  };

  const updateVariant = (idx, field, value) => {
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.map((v, i) =>
        i === idx ? { ...v, [field]: value } : v,
      ),
    }));
  };

  const addVariantRow = () => {
    setForm((prev) => ({
      ...prev,
      variants: [
        ...prev.variants,
        {
          attribute_name: prev.variants[0]?.attribute_name || "Opción",
          attribute_value: "",
          price_override: "",
          stock: 0,
          min_stock_alert: 3,
          is_active: true,
        },
      ],
    }));
  };

  const removeVariantRow = (idx) => {
    if (form.variants.length <= 1) return;
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== idx),
    }));
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        category_id: Number(form.category_id),
        subcategory_id: form.subcategory_id
          ? Number(form.subcategory_id)
          : null,
        name: form.name,
        description: form.description || null,
        base_price: Number(form.base_price),
        compare_at_price:
          form.compare_at_price !== "" && form.compare_at_price !== null
            ? Number(form.compare_at_price)
            : null,
        unit_label: form.unit_label || "Unidad",
        is_featured: Boolean(form.is_featured),
        is_active: Boolean(form.is_active),
        images: form.images.map((img, i) => ({
          image_url: img.image_url,
          is_primary: i === 0,
        })),
        variants: form.variants.map((v) => ({
          ...(v.id ? { id: v.id } : {}),
          attribute_name: v.attribute_name || "Opción",
          attribute_value: v.attribute_value,
          price_override:
            v.price_override !== "" && v.price_override !== null
              ? Number(v.price_override)
              : null,
          stock: Number(v.stock),
          min_stock_alert: Number(v.min_stock_alert || 3),
          is_active: v.is_active !== false,
        })),
      };

      if (form.id) {
        await api.put(`/admin/products/${form.id}`, payload);
      } else {
        await api.post("/admin/products", payload);
      }

      setShowModal(false);
      loadAll();
    } catch (err) {
      alert(err.response?.data?.message || "Error al guardar producto");
    } finally {
      setSaving(false);
    }
  };

  const safeCategories = Array.isArray(categories) ? categories : [];
  const safeSubcategories = Array.isArray(subcategories) ? subcategories : [];
  const safeProducts = Array.isArray(products) ? products : [];

  const filteredSubsForModal = safeSubcategories.filter(
    (s) => String(s.category_id) === String(form.category_id),
  );

  const filteredSubsForBulk = safeSubcategories.filter(
    (s) => String(s.category_id) === String(bulkForm.category_id),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Productos y Stock
          </h1>
          <p className="text-sm text-slate-500">
            Administrá categorías, remarcación masiva, variantes e inventario
            sincronizado con mostrador.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowBulkModal(true)}
            disabled={safeProducts.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 text-sm font-semibold hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
          >
            <Percent className="w-4 h-4" /> Remarcar Precios
          </button>

          <button
            type="button"
            onClick={openNewProduct}
            disabled={safeCategories.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Nuevo Producto
          </button>
        </div>
      </div>

      {/* Gestor de Categorías y Subcategorías */}
      <div className="bg-white border rounded-xl p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <form onSubmit={handleCreateCategory} className="flex gap-2">
            <input
              type="text"
              placeholder="Nueva categoría (ej: Vinos Tintos)"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-lg text-sm"
            />
            <button
              type="submit"
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold inline-flex items-center gap-1"
            >
              <FolderPlus className="w-4 h-4" /> Categoría
            </button>
          </form>

          <form onSubmit={handleCreateSubcategory} className="flex gap-2">
            <select
              value={newSubCatId}
              onChange={(e) => setNewSubCatId(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm bg-white"
            >
              {safeCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Subcategoría (ej: Malbec)"
              value={newSubName}
              onChange={(e) => setNewSubName(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-lg text-sm"
            />
            <button
              type="submit"
              disabled={safeCategories.length === 0}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold disabled:opacity-40"
            >
              + Sub
            </button>
          </form>
        </div>

        {/* Chips de Categorías y Subcategorías con borrado */}
        {safeCategories.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {safeCategories.map((cat) => {
              const childSubs = safeSubcategories.filter(
                (s) => String(s.category_id) === String(cat.id),
              );
              return (
                <div
                  key={cat.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border text-xs"
                >
                  <span className="font-bold text-slate-800">{cat.name}</span>
                  {childSubs.length > 0 && (
                    <span className="text-slate-400">
                      (
                      {childSubs.map((s, idx) => (
                        <span key={s.id}>
                          {idx > 0 && ", "}
                          {s.name}
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteSubcategory(s.id, s.name)
                            }
                            title={`Eliminar ${s.name}`}
                            className="ml-0.5 text-red-400 hover:text-red-600 font-bold"
                          >
                            &times;
                          </button>
                        </span>
                      ))}
                      )
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(cat.id, cat.name)}
                    title={`Eliminar categoría ${cat.name}`}
                    className="ml-1 text-slate-400 hover:text-red-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tabla de Productos */}
      {loading ? (
        <p className="text-sm text-slate-500">Cargando catálogo...</p>
      ) : (
        <div className="bg-white border rounded-xl overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Precio</th>
                <th className="px-4 py-3">
                  Variantes y Stock (Ajuste Mostrador)
                </th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {safeProducts.map((p) => {
                const variants = Array.isArray(p.variants) ? p.variants : [];
                const totalStock = variants.reduce(
                  (acc, v) => acc + Number(v.stock || 0),
                  0,
                );
                return (
                  <tr key={p.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 flex items-center gap-3">
                      <img
                        src={
                          p.images?.[0]?.image_url ||
                          "https://placehold.co/60x60?text=Img"
                        }
                        alt={p.name}
                        className="w-10 h-10 rounded-lg object-cover border"
                      />
                      <div>
                        <p className="font-semibold text-slate-900">{p.name}</p>
                        <p className="text-xs text-slate-400">{p.unit_label}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {p.category_name}
                      {p.subcategory_name ? ` / ${p.subcategory_name}` : ""}
                    </td>
                    <td className="px-4 py-3">
                      {p.compare_at_price &&
                        Number(p.compare_at_price) > Number(p.base_price) && (
                          <span className="block text-xs text-slate-400 line-through">
                            $
                            {Number(p.compare_at_price).toLocaleString("es-AR")}
                          </span>
                        )}
                      <span className="font-bold text-slate-900">
                        ${Number(p.base_price).toLocaleString("es-AR")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="flex flex-wrap gap-1.5">
                        {variants.map((v) => {
                          const isBusy = updatingVariantId === v.id;
                          return (
                            <span
                              key={v.id}
                              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border ${
                                v.stock <= v.min_stock_alert
                                  ? "bg-amber-50 border-amber-300 text-amber-900 font-semibold"
                                  : "bg-slate-50 text-slate-700"
                              }`}
                            >
                              <span>{v.attribute_value}:</span>
                              <button
                                type="button"
                                disabled={isBusy || v.stock <= 0}
                                onClick={() => handleQuickStockDelta(v.id, -1)}
                                title="Descontar 1 unidad por venta en mostrador"
                                className="w-5 h-5 rounded bg-white border hover:bg-slate-100 flex items-center justify-center disabled:opacity-40 cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <strong className="min-w-[1.25rem] text-center">
                                {v.stock}
                              </strong>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleQuickStockDelta(v.id, 1)}
                                title="Sumar 1 unidad de ingreso"
                                className="w-5 h-5 rounded bg-white border hover:bg-slate-100 flex items-center justify-center disabled:opacity-40 cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-1">
                        Total: {totalStock} u.
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          p.is_active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {p.is_active ? "Activo" : "Oculto"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openEditProduct(p)}
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {safeProducts.length === 0 && (
                <tr>
                  <td
                    colSpan="6"
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    Todavía no cargaste productos en este comercio.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Actualización Masiva de Precios */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleBulkPriceSubmit}
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl"
          >
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="font-bold text-lg text-slate-900">
                Remarcación Masiva de Precios
              </h2>
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Tipo de Ajuste
                </label>
                <select
                  value={bulkForm.adjustment_type}
                  onChange={(e) =>
                    setBulkForm({
                      ...bulkForm,
                      adjustment_type: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                >
                  <option value="percentage">Porcentaje (%)</option>
                  <option value="fixed">Monto Fijo ($)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Valor (+ aumento / - rebaja) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder={
                    bulkForm.adjustment_type === "percentage"
                      ? "Ej: 15 o -10"
                      : "Ej: 2500"
                  }
                  value={bulkForm.adjustment_value}
                  onChange={(e) =>
                    setBulkForm({
                      ...bulkForm,
                      adjustment_value: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Filtrar Categoría
                </label>
                <select
                  value={bulkForm.category_id}
                  onChange={(e) =>
                    setBulkForm({
                      ...bulkForm,
                      category_id: e.target.value,
                      subcategory_id: "",
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                >
                  <option value="">Todo el catálogo</option>
                  {safeCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Filtrar Subcategoría
                </label>
                <select
                  value={bulkForm.subcategory_id}
                  disabled={!bulkForm.category_id}
                  onChange={(e) =>
                    setBulkForm({
                      ...bulkForm,
                      subcategory_id: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white disabled:opacity-50"
                >
                  <option value="">Todas las subcategorías</option>
                  {filteredSubsForBulk.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                Redondeo de Precios Resultantes
              </label>
              <select
                value={bulkForm.rounding}
                onChange={(e) =>
                  setBulkForm({ ...bulkForm, rounding: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
              >
                <option value="integer">Sin centavos (entero)</option>
                <option value="10">Múltiplo de $10</option>
                <option value="100">Múltiplo de $100</option>
                <option value="none">Exacto con 2 decimales</option>
              </select>
            </div>

            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={bulkForm.include_variants}
                onChange={(e) =>
                  setBulkForm({
                    ...bulkForm,
                    include_variants: e.target.checked,
                  })
                }
              />
              Aplicar también a variantes con precio especial
            </label>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 border rounded-lg text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={bulkSaving}
                className="px-5 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold disabled:opacity-50"
              >
                {bulkSaving ? "Aplicando..." : "Aplicar Remarcación"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Crear/Editar Producto */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveProduct}
            className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="font-bold text-lg">
                {form.id ? "Editar Producto" : "Nuevo Producto"}
              </h2>
              <button type="button" onClick={() => setShowModal(false)}>
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Categoría *
                </label>
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
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                >
                  {safeCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Subcategoría
                </label>
                <select
                  value={form.subcategory_id}
                  onChange={(e) =>
                    setForm({ ...form, subcategory_id: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                >
                  <option value="">-- Ninguna --</option>
                  {filteredSubsForModal.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Precio Venta ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={form.base_price}
                  onChange={(e) =>
                    setForm({ ...form, base_price: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Precio Tachado ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Opcional"
                  value={form.compare_at_price}
                  onChange={(e) =>
                    setForm({ ...form, compare_at_price: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                Descripción
              </label>
              <textarea
                rows="2"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>

            {/* Fotos */}
            <div>
              <label className="block text-xs font-semibold mb-1">
                Imágenes
              </label>
              <div className="flex flex-wrap items-center gap-3">
                {form.images.map((img, idx) => (
                  <div key={idx} className="relative">
                    <img
                      src={img.image_url}
                      alt="Prod"
                      className="w-16 h-16 rounded-lg object-cover border"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          images: prev.images.filter((_, i) => i !== idx),
                        }))
                      }
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600 text-white text-xs flex items-center justify-center"
                    >
                      &times;
                    </button>
                  </div>
                ))}
                <label className="cursor-pointer px-3 py-2 border border-dashed rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-slate-50">
                  <Upload className="w-4 h-4" />
                  {uploadingImg ? "Subiendo..." : "Subir Foto"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleProductImageUpload}
                  />
                </label>
              </div>
            </div>

            {/* Variantes Polimórficas */}
            <div className="border-t pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-500">
                  Variantes y Stock (Talles / Pesos / Presentaciones)
                </span>
                <button
                  type="button"
                  onClick={addVariantRow}
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  + Agregar variante
                </button>
              </div>

              {form.variants.map((v, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Tipo (ej: Talle)"
                    value={v.attribute_name}
                    onChange={(e) =>
                      updateVariant(idx, "attribute_name", e.target.value)
                    }
                    className="col-span-3 px-2.5 py-1.5 border rounded text-xs"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Valor (ej: XL o 500g)"
                    value={v.attribute_value}
                    onChange={(e) =>
                      updateVariant(idx, "attribute_value", e.target.value)
                    }
                    className="col-span-4 px-2.5 py-1.5 border rounded text-xs"
                  />
                  <input
                    type="number"
                    placeholder="Precio esp."
                    value={v.price_override}
                    onChange={(e) =>
                      updateVariant(idx, "price_override", e.target.value)
                    }
                    className="col-span-2 px-2.5 py-1.5 border rounded text-xs"
                  />
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="Stock"
                    value={v.stock}
                    onChange={(e) =>
                      updateVariant(idx, "stock", e.target.value)
                    }
                    className="col-span-2 px-2.5 py-1.5 border rounded text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => removeVariantRow(idx)}
                    className="col-span-1 text-slate-400 hover:text-red-600 flex justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-6 pt-2">
              <label className="flex items-center gap-2 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={form.is_featured}
                  onChange={(e) =>
                    setForm({ ...form, is_featured: e.target.checked })
                  }
                />
                Producto Destacado
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) =>
                    setForm({ ...form, is_active: e.target.checked })
                  }
                />
                Visible en Tienda
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border rounded-lg text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Guardar Producto"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
