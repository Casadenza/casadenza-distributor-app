"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  RefreshCw,
  Download,
  Upload,
  Edit3,
  Check,
  X,
  ImageIcon,
  ExternalLink,
  Layers,
  Link as LinkIcon,
  Trash2,
  Loader2,
  Plus,
} from "lucide-react";

type Row = {
  id: string;
  sku: string;
  name: string;
  image: string | null;
  collection: string | null;
  stoneType: string | null;
  thicknessMm: number | null;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  variantsCount: number;
};

export default function ProductsTable() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/products");
      const json = await res.json();
      setRows(json.products || []);
    } catch (err) {
      console.error(err);
      alert("Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        !s ||
        (r.sku ?? "").toLowerCase().includes(s) ||
        (r.name ?? "").toLowerCase().includes(s) ||
        (r.collection ?? "").toLowerCase().includes(s) ||
        (r.stoneType ?? "").toLowerCase().includes(s)
    );
  }, [rows, q]);

  async function handleImport(file: File) {
    setLoading(true);
    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/admin/import-products", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();

      if (res.ok) {
        alert(
          `Done! Imported: ${json.imported ?? 0}, Updated: ${json.updated ?? 0}, Skipped: ${json.skipped ?? 0}`
        );
        load();
      } else {
        alert(json.error || "Import failed");
      }
    } catch (err) {
      alert("Upload error");
    } finally {
      setLoading(false);
    }
  }

  async function handleImageUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    productId: string
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingId(productId);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.url) {
        await patchProduct(productId, { image: data.url });
      }
    } catch (err) {
      alert("Upload failed. Check Cloudinary settings.");
    } finally {
      setUploadingId(null);
    }
  }

  async function patchProduct(id: string, payload: Partial<Row>) {
    setSavingId(id);
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Update failed");

      const json = await res.json();
      setRows((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...json.product } : p))
      );
      setEditingId(null);
    } catch (e: any) {
      alert(e.message || "Update failed");
    } finally {
      setSavingId(null);
    }
  }

  async function deleteProduct(id: string) {
    if (!confirm("Are you sure? This will delete the product and its variants.")) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setRows((prev) => prev.filter((p) => p.id !== id));
      } else {
        alert("Delete failed");
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Filter / Search Bar */}
      <div className="bg-[#FAF9F6] border border-[#EAE7E2] rounded-2xl p-3 flex flex-wrap items-center gap-4 shadow-sm">
        <div className="relative flex-1 max-w-[320px]">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A39E93]"
          />
          <input
            className="w-full bg-white border border-[#EAE7E2] rounded-xl pl-9 pr-3 py-2 text-[12px] outline-none focus:border-[#C5A267] font-medium"
            placeholder="Search SKU / Product / Collection..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <button
          onClick={load}
          className="ml-auto p-2 hover:bg-white rounded-xl transition-all border border-transparent hover:border-[#EAE7E2]"
        >
          <RefreshCw
            size={15}
            className={loading ? "animate-spin text-[#C5A267]" : "text-[#A39E93]"}
          />
        </button>
      </div>

      {/* Actions Row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              window.location.href = "/api/admin/products-template";
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#EAE7E2] rounded-lg text-[10px] font-bold text-[#6B665C] hover:bg-[#1A1A1A] hover:text-white transition-all shadow-sm"
          >
            <Download size={12} /> TEMPLATE
          </button>

          <label className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#EAE7E2] rounded-lg text-[10px] font-bold text-[#6B665C] hover:bg-[#C5A267] hover:text-white transition-all shadow-sm cursor-pointer">
            <Upload size={12} /> IMPORT EXCEL
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImport(f);
                e.target.value = "";
              }}
            />
          </label>

          <Link
            href="/admin/products/new"
            className="flex items-center gap-2 px-3 py-1.5 bg-[#1A1A1A] border border-[#1A1A1A] rounded-lg text-[10px] font-bold text-[#C5A267] hover:opacity-90 transition-all shadow-sm"
          >
            <Plus size={12} /> ADD PRODUCT
          </Link>
        </div>

        <div className="text-[10px] font-bold text-[#A39E93] uppercase tracking-wider">
          Total: {filtered.length}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#EAE7E2] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead>
              <tr className="text-left bg-[#FAFAFA] border-b border-[#F0EDE8] text-[9px] font-bold uppercase tracking-[0.2em] text-[#A39E93]">
                <th className="py-4 px-6">Preview</th>
                <th className="py-4 px-4">Product Identity</th>
                <th className="py-4 px-4">Image URL</th>
                <th className="py-4 px-4">Inventory Specs</th>
                <th className="py-4 px-4">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#F8F8F8]">
              {filtered.map((r) => {
                const isEditing = editingId === r.id;
                const isSaving = savingId === r.id;
                const isDeleting = deletingId === r.id;
                const isUploading = uploadingId === r.id;

                return (
                  <tr
                    key={r.id}
                    className={`group hover:bg-[#FCFAF7]/50 transition-colors ${
                      isDeleting ? "opacity-50" : ""
                    }`}
                  >
                    <td className="py-4 px-6">
                      <div className="h-12 w-12 rounded-xl bg-[#F5F5F5] border border-[#EEE] overflow-hidden flex items-center justify-center relative group/img">
                        {isUploading ? (
                          <Loader2
                            size={16}
                            className="animate-spin text-[#C5A267] z-30"
                          />
                        ) : r.image ? (
                          <img
                            src={r.image}
                            alt={r.name}
                            className="h-full w-full object-cover relative z-10"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <ImageIcon size={16} className="text-zinc-300 absolute" />
                        )}

                        <label className="absolute inset-0 z-20 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center cursor-pointer transition-all">
                          <Plus size={14} className="text-white" />
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, r.id)}
                          />
                        </label>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      {isEditing ? (
                        <div className="space-y-1">
                          <input
                            className="w-full border border-[#C5A267]/30 rounded px-2 py-1 text-[10px] font-mono uppercase"
                            value={r.sku}
                            onChange={(e) =>
                              setRows((prev) =>
                                prev.map((x) =>
                                  x.id === r.id ? { ...x, sku: e.target.value } : x
                                )
                              )
                            }
                          />
                          <input
                            className="w-full border border-[#C5A267]/30 rounded px-2 py-1 text-xs font-serif italic"
                            value={r.name}
                            onChange={(e) =>
                              setRows((prev) =>
                                prev.map((x) =>
                                  x.id === r.id ? { ...x, name: e.target.value } : x
                                )
                              )
                            }
                          />
                        </div>
                      ) : (
                        <>
                          <div className="font-mono text-[#C5A267] font-bold text-[9px] tracking-tighter uppercase mb-0.5">
                            {r.sku}
                          </div>
                          <div className="font-serif italic text-base text-[#1A1A1A] leading-tight">
                            {r.name}
                          </div>
                        </>
                      )}
                    </td>

                    <td className="py-4 px-4">
                      {isEditing ? (
                        <div className="relative">
                          <LinkIcon
                            className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-300"
                            size={10}
                          />
                          <input
                            className="w-full border border-[#C5A267]/30 rounded pl-6 pr-2 py-1.5 text-[10px] bg-white text-blue-600 truncate"
                            value={r.image || ""}
                            placeholder="Paste image URL..."
                            onChange={(e) =>
                              setRows((prev) =>
                                prev.map((x) =>
                                  x.id === r.id ? { ...x, image: e.target.value } : x
                                )
                              )
                            }
                          />
                        </div>
                      ) : (
                        <div className="text-[10px] text-zinc-400 truncate max-w-[150px]">
                          {r.image ? "Cloud Link Active" : "No Image"}
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="px-2 py-0.5 bg-zinc-100 text-zinc-500 rounded text-[8px] font-bold uppercase tracking-widest">
                          {r.collection || "Fusion"}
                        </span>
                        <span className="text-zinc-300">|</span>
                        <span className="text-[9px] text-zinc-400 font-medium uppercase">
                          {r.stoneType || "Stone"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[9px] text-zinc-400 font-medium">
                        <span className="flex items-center gap-1">
                          <Layers size={10} /> {r.variantsCount} Variants
                        </span>
                        <span>{r.thicknessMm}mm</span>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <button
                        onClick={() =>
                          patchProduct(r.id, { isActive: !r.isActive })
                        }
                        className={`px-3 py-1 rounded-full text-[8px] font-bold uppercase border transition-all ${
                          r.isActive
                            ? "bg-emerald-50 border-emerald-100 text-emerald-600"
                            : "bg-zinc-50 border-zinc-100 text-zinc-400"
                        }`}
                      >
                        {r.isActive ? "Online" : "Hidden"}
                      </button>
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() =>
                                patchProduct(r.id, {
                                  sku: r.sku,
                                  name: r.name,
                                  image: r.image,
                                })
                              }
                              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                              disabled={isSaving}
                            >
                              {isSaving ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Check size={14} />
                              )}
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-2 text-zinc-400 hover:bg-zinc-50 rounded-lg"
                            >
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => setEditingId(r.id)}
                              className="p-2 text-zinc-400 hover:text-[#C5A267] hover:bg-[#FCFAF7] rounded-lg transition-all"
                            >
                              <Edit3 size={14} />
                            </button>
                            <a
                              href={`/admin/products/${r.id}/variants`}
                              className="p-2 text-zinc-400 hover:text-black hover:bg-zinc-50 rounded-lg transition-all"
                            >
                              <ExternalLink size={14} />
                            </a>
                            <button
                              onClick={() => deleteProduct(r.id)}
                              className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            >
                              {isDeleting ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Trash2 size={14} />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-10 px-6 text-center text-[12px] text-[#A39E93] font-medium"
                  >
                    {loading ? "Loading products..." : "No products found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}