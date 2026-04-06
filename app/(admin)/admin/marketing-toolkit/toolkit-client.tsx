"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  RefreshCw,
  X,
  FileUp,
  Trash2,
  Download,
  Image as ImageIcon,
  FileText,
  Video,
  Link as LinkIcon,
  Loader2,
  Plus,
  Play,
  Eye,
  Minus,
  RotateCcw,
  Layers,
} from "lucide-react";

// --- UTILS ---
function cn(...a: Array<string | undefined | null | false>) {
  return a.filter(Boolean).join(" ");
}

const labelCls = "text-[11px] font-bold text-[#64748b] uppercase tracking-wider mb-2 block";
const inputCls =
  "w-full bg-white border border-[#e2e8f0] rounded-xl px-4 py-3 text-[13px] transition-all focus:ring-2 focus:ring-black/5 focus:border-black outline-none placeholder:text-[#94a3b8] shadow-sm";

const TYPES = ["ALL", "DOCUMENT", "IMAGE", "VIDEO"] as const;

const CATEGORIES = [
  "PRODUCT_CATALOGUE_FULL",
  "COLLECTION_CATALOGUE",
  "TECHNICAL_DATA_SHEET",
  "INSTALLATION_GUIDE",
  "MAINTENANCE_GUIDE",
  "FIRE_TEST_CERTIFICATE",
  "BROCHURE_SHORT",
  "COMPANY_PROFILE_PDF",
  "OTHERS_DOCUMENTS",
  "SAMPLE_KIT_GUIDE",
  "PROJECT_REFERENCE_LIST",
  "PROJECT_HOTEL",
  "PROJECT_VILLA",
  "PROJECT_COMMERCIAL_FACADE",
  "PROJECT_INTERIOR_WALL",
  "PROJECT_BEFORE_AFTER",
  "VIDEO_INSTALLATION",
  "VIDEO_PROJECT_SHOWCASE",
  "VIDEO_PRODUCT_HIGHLIGHT",
  "VIDEO_BRAND_INTRO",
  "VIDEO_PROMO_30S",
  "VIDEO_REELS_SHORT",
];

// --- HELPERS ---
function getType(item: any) {
  return String(item?.type || "").toUpperCase();
}

function isDataUrl(u?: string | null) {
  return String(u || "").startsWith("data:");
}

function getIconForType(type: string) {
  switch (type) {
    case "DOCUMENT":
      return <FileText size={40} strokeWidth={1.5} className="text-red-400" />;
    case "VIDEO":
      return <Play size={40} strokeWidth={1.5} className="text-amber-400" />;
    case "IMAGE":
      return <ImageIcon size={40} strokeWidth={1.5} className="text-emerald-400" />;
    default:
      return <FileUp size={40} strokeWidth={1.5} className="text-slate-300" />;
  }
}

function typeBadge(type: string) {
  const t = String(type || "").toUpperCase();

  if (t === "DOCUMENT") return "bg-red-50 text-red-500 border-red-100";
  if (t === "VIDEO") return "bg-amber-50 text-amber-500 border-amber-100";
  if (t === "IMAGE") return "bg-emerald-50 text-emerald-500 border-emerald-100";

  return "bg-slate-50 text-slate-500 border-slate-100";
}

function niceCat(cat: string) {
  return String(cat || "")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (s) => s.toUpperCase());
}

function getPreviewUrl(item: any) {
  const type = getType(item);

  if (item?.thumbnailUrl && !isDataUrl(item.thumbnailUrl)) return String(item.thumbnailUrl);
  if (type === "IMAGE" && item?.fileUrl && !isDataUrl(item.fileUrl)) return String(item.fileUrl);

  return "";
}

function getOpenUrl(item: any) {
  if (item?.fileUrl) return String(item.fileUrl);
  if (item?.externalUrl) return String(item.externalUrl);
  return "";
}

function formatBytes(bytes?: number | null) {
  if (!bytes || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let idx = 0;

  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }

  return `${value.toFixed(value >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`;
}

function getFileName(item: any) {
  const raw =
    item?.originalFileName ||
    item?.fileName ||
    item?.title ||
    `marketing-asset-${item?.id || Date.now()}`;

  const cleanBase = String(raw)
    .replace(/[<>:"/\\|?*\u0000-\u001F]+/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  const url = String(item?.fileUrl || "");
  const extensionFromUrl = url.split("?")[0].split(".").pop();
  const hasExtension = /\.[a-zA-Z0-9]{2,5}$/.test(cleanBase);

  if (hasExtension) return cleanBase;
  if (extensionFromUrl) return `${cleanBase}.${extensionFromUrl}`;

  const type = getType(item);
  if (type === "DOCUMENT") return `${cleanBase}.pdf`;
  if (type === "VIDEO") return `${cleanBase}.mp4`;
  return `${cleanBase}.jpg`;
}

async function forceDownloadFile(url: string, fileName: string) {
  const response = await fetch(url, { mode: "cors" });
  if (!response.ok) throw new Error("Download failed");

  const blob = await response.blob();
  const blobUrl = window.URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.URL.revokeObjectURL(blobUrl);
}

// --- MODAL COMPONENT ---
function PreviewModal({
  item,
  scale,
  onClose,
  onZoomIn,
  onZoomOut,
  onReset,
}: {
  item: any | null;
  scale: number;
  onClose: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}) {
  useEffect(() => {
    if (!item) return;

    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (getType(item) === "IMAGE") {
        if (e.key === "+" || e.key === "=") onZoomIn();
        if (e.key === "-") onZoomOut();
        if (e.key === "0") onReset();
      }
    };

    window.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [item, onClose, onZoomIn, onZoomOut, onReset]);

  if (!item) return null;

  const type = getType(item);
  const src = getOpenUrl(item);
  const preview = getPreviewUrl(item);

  return (
    <div className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-xl flex flex-col animate-in fade-in duration-300">
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/50">
        <h2 className="text-white text-xs font-bold uppercase tracking-widest px-4 truncate">
          {item.title}
        </h2>

        <div className="flex items-center gap-3">
          {type === "IMAGE" && (
            <div className="flex items-center bg-white/10 rounded-lg p-1">
              <button onClick={onZoomOut} className="p-2 text-white/70 hover:text-white">
                <Minus size={16} />
              </button>
              <span className="text-[10px] text-white w-10 text-center font-mono">
                {Math.round(scale * 100)}%
              </span>
              <button onClick={onZoomIn} className="p-2 text-white/70 hover:text-white">
                <Plus size={16} />
              </button>
              <button
                onClick={onReset}
                className="p-2 text-white/30 hover:text-white ml-1 border-l border-white/10"
              >
                <RotateCcw size={14} />
              </button>
            </div>
          )}

          <button
            onClick={onClose}
            className="p-2.5 bg-white rounded-full hover:scale-110 transition-transform"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 overflow-auto">
        {type === "IMAGE" && (
          <img
            src={src}
            alt={item.title}
            className="max-h-full max-w-[92vw] transition-transform duration-200 shadow-2xl rounded-xl"
            style={{ transform: `scale(${scale})` }}
          />
        )}

        {type === "DOCUMENT" && (
          <iframe
            src={`${src}#toolbar=0&navpanes=0&view=Fit`}
            className="w-full max-w-6xl h-full bg-white rounded-xl shadow-2xl"
            title={item.title}
          />
        )}

        {type === "VIDEO" && (
          <video
            src={src}
            controls
            autoPlay
            playsInline
            poster={preview || undefined}
            className="max-w-5xl w-full rounded-xl shadow-2xl"
          />
        )}
      </div>
    </div>
  );
}

export default function AdminMarketingToolkitClient({ initialItems }: { initialItems: any[] }) {
  const [items, setItems] = useState(initialItems || []);
  const [q, setQ] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number]>("ALL");
  const [category, setCategory] = useState("ALL");
  const [collection, setCollection] = useState("");

  const [uploadMode, setUploadMode] = useState<"UPLOAD" | "VIDEO_LINK">("UPLOAD");
  const [busy, setBusy] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [previewItem, setPreviewItem] = useState<any | null>(null);
  const [zoom, setZoom] = useState(1);
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});

  const [form, setForm] = useState({
    title: "",
    type: "DOCUMENT",
    category: "PRODUCT_CATALOGUE_FULL",
    collection: "",
    stoneType: "",
    description: "",
    file: undefined as File | undefined,
    externalUrl: "",
  });

  const collections = useMemo(() => {
    const set = new Set<string>();
    for (const it of items as any[]) {
      if (it.collection) set.add(String(it.collection));
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filtered = useMemo(() => {
    return (items as any[]).filter((it: any) => {
      const t = getType(it);
      const c = String(it.category || "").toUpperCase();
      const col = String(it.collection || "").toLowerCase();
      const hay = `${it.title || ""} ${it.description || ""} ${it.collection || ""} ${it.stoneType || ""} ${t} ${c}`.toLowerCase();

      const matchSearch = !q || hay.includes(q.toLowerCase());
      const matchType = type === "ALL" || t === type;
      const matchCat = category === "ALL" || c === category;
      const matchCollection = !collection || col === collection.toLowerCase();

      return matchSearch && matchType && matchCat && matchCollection;
    });
  }, [items, q, type, category, collection]);

  const reload = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/marketing", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      } else {
        window.location.reload();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this asset?")) return;
    setDeleting((p) => ({ ...p, [id]: true }));
    try {
      const res = await fetch(`/api/admin/marketing/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      await reload();
    } catch (e: any) {
      alert(e?.message || "Delete failed");
    } finally {
      setDeleting((p) => ({ ...p, [id]: false }));
    }
  };

  const handleCreate = async () => {
    if (!form.title.trim()) return alert("Please enter a title.");
    setBusy(true);

    try {
      if (uploadMode === "VIDEO_LINK") {
        if (!form.externalUrl.trim()) throw new Error("Please enter a video URL.");

        const payload = {
          title: form.title,
          type: "VIDEO",
          category: form.category,
          externalUrl: form.externalUrl,
          collection: form.collection || undefined,
          stoneType: form.stoneType || undefined,
          description: form.description || undefined,
        };

        const res = await fetch("/api/admin/marketing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error(await res.text());
      } else {
        if (!form.file) throw new Error("Please choose a file.");

        const maxSizeMB = form.type === "VIDEO" ? 100 : 10;
        const sizeMB = form.file.size / 1024 / 1024;
        if (sizeMB > maxSizeMB) throw new Error(`File too large. Max: ${maxSizeMB} MB.`);

        const fd = new FormData();
        fd.append("title", form.title);
        fd.append("type", form.type);
        fd.append("category", form.category);
        if (form.collection) fd.append("collection", form.collection);
        if (form.stoneType) fd.append("stoneType", form.stoneType);
        if (form.description) fd.append("description", form.description);
        fd.append("file", form.file);

        const res = await fetch("/api/admin/marketing", {
          method: "POST",
          body: fd,
        });

        if (!res.ok) throw new Error(await res.text());
      }

      setForm({
        title: "",
        type: "DOCUMENT",
        category: "PRODUCT_CATALOGUE_FULL",
        collection: "",
        stoneType: "",
        description: "",
        file: undefined,
        externalUrl: "",
      });

      setIsFormOpen(false);
      await reload();
    } catch (e: any) {
      alert(e?.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = async (item: any) => {
    const fileUrl = String(item?.fileUrl || "");
    if (!fileUrl) return;

    try {
      await forceDownloadFile(fileUrl, getFileName(item));
    } catch {
      const anchor = document.createElement("a");
      anchor.href = fileUrl;
      anchor.download = getFileName(item);
      anchor.rel = "noreferrer";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900">
      <header className="sticky top-0 z-[100] bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-[1800px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-black p-2 rounded-lg text-white shadow-lg">
              <Layers size={20} />
            </div>
            <h1 className="text-lg font-bold tracking-tight">Marketing Library</h1>
          </div>

          <button
            onClick={() => setIsFormOpen((prev) => !prev)}
            className="bg-black text-white px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2"
          >
            {isFormOpen ? <X size={16} /> : <Plus size={16} />}
            {isFormOpen ? "Close" : "Add Asset"}
          </button>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto flex flex-col lg:flex-row min-h-[calc(100vh-80px)]">
        <aside className="w-full lg:w-80 p-6 border-r border-slate-200 space-y-8 bg-white">
          <div>
            <label className={labelCls}>Global Search</label>
            <div className="relative">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className={inputCls}
                placeholder="Search anything..."
              />
              <Search className="absolute right-4 top-3.5 text-slate-400" size={16} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Quick Filter</label>
            <div className="grid grid-cols-2 gap-2">
              {TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={cn(
                    "py-2.5 rounded-xl text-[10px] font-bold border transition-all",
                    type === t ? "bg-black text-white border-black" : "bg-white text-slate-500 border-slate-200"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
              <option value="ALL">All Assets</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {niceCat(c)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Collection</label>
            <select value={collection} onChange={(e) => setCollection(e.target.value)} className={inputCls}>
              <option value="">All Collections</option>
              {collections.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={reload}
            className="w-full py-3 rounded-xl border border-slate-200 text-[10px] font-bold uppercase flex items-center justify-center gap-2 hover:bg-white transition-all"
          >
            <RefreshCw size={14} className={busy ? "animate-spin" : ""} /> Refresh Database
          </button>
        </aside>

        <section className="flex-1 p-8">
          {isFormOpen && (
            <div
              id="admin-marketing-form"
              className="mb-10 bg-white p-8 rounded-3xl border border-slate-200 shadow-2xl shadow-black/[0.03]"
            >
              <div className="flex items-center justify-between mb-10 pb-6 border-b border-[#F2EFE9]">
                <div>
                  <h3 className="text-[12px] font-bold uppercase tracking-[0.3em] text-black">
                    Asset Creation Studio
                  </h3>
                  <p className="text-[10px] text-[#A39E93] mt-1 uppercase font-bold tracking-widest">
                    Add new resources to the distributor library
                  </p>
                </div>

                <div className="flex bg-[#F2EFE9] p-1.5 rounded-2xl">
                  <button
                    onClick={() => setUploadMode("UPLOAD")}
                    className={cn(
                      "px-6 py-2 text-[10px] font-bold uppercase rounded-xl transition-all",
                      uploadMode === "UPLOAD" ? "bg-white shadow-sm text-black" : "text-[#A39E93]"
                    )}
                  >
                    Local File
                  </button>
                  <button
                    onClick={() => {
                      setUploadMode("VIDEO_LINK");
                      setForm((p) => ({ ...p, type: "VIDEO" }));
                    }}
                    className={cn(
                      "px-6 py-2 text-[10px] font-bold uppercase rounded-xl transition-all",
                      uploadMode === "VIDEO_LINK" ? "bg-white shadow-sm text-black" : "text-[#A39E93]"
                    )}
                  >
                    Cloud Link
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-2">
                  <label className={labelCls}>Title</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className={inputCls}
                    placeholder="e.g. Summer Catalogue 2026"
                  />
                </div>

                <div>
                  <label className={labelCls}>Format</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    disabled={uploadMode === "VIDEO_LINK"}
                    className={inputCls}
                  >
                    <option value="DOCUMENT">PDF / Document</option>
                    <option value="IMAGE">Image / Graphic</option>
                    <option value="VIDEO">Video / Motion</option>
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className={inputCls}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {niceCat(c)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Collection</label>
                  <input
                    value={form.collection}
                    onChange={(e) => setForm({ ...form, collection: e.target.value })}
                    className={inputCls}
                    placeholder="Fusion"
                  />
                </div>

                <div>
                  <label className={labelCls}>Stone Type</label>
                  <input
                    value={form.stoneType}
                    onChange={(e) => setForm({ ...form, stoneType: e.target.value })}
                    className={inputCls}
                    placeholder="Slate"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className={labelCls}>Description</label>
                  <input
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className={inputCls}
                    placeholder="Short note for distributors..."
                  />
                </div>

                <div className="md:col-span-4 bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-200 text-center">
                  {uploadMode === "VIDEO_LINK" ? (
                    <div className="relative text-left">
                      <label className={labelCls}>Direct Video URL</label>
                      <input
                        value={form.externalUrl}
                        onChange={(e) => setForm({ ...form, externalUrl: e.target.value })}
                        className={inputCls}
                        placeholder="Paste YouTube / Drive / hosted video link here..."
                      />
                      <LinkIcon className="absolute right-4 top-11 text-[#A39E93]" size={16} />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <input
                        type="file"
                        accept={
                          form.type === "DOCUMENT"
                            ? "application/pdf"
                            : form.type === "IMAGE"
                            ? "image/*"
                            : "video/mp4,video/webm"
                        }
                        onChange={(e) => setForm({ ...form, file: e.target.files?.[0] })}
                        className="w-full text-[11px] file:bg-black file:text-white file:rounded-lg file:px-6 file:py-2 file:border-0 file:mr-4 file:cursor-pointer"
                      />
                      <p className="text-[10px] text-[#A39E93] mt-4 font-bold uppercase tracking-widest">
                        PDF / JPG / PNG (10MB) • MP4 (100MB)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={handleCreate}
                disabled={busy}
                className="mt-8 w-full bg-black text-white py-4 rounded-2xl font-bold uppercase text-xs tracking-[0.2em] shadow-xl hover:shadow-black/20 transition-all"
              >
                {busy ? <Loader2 className="animate-spin mx-auto" /> : "Upload To Server"}
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
            {filtered.map((it: any) => {
              const t = getType(it);
              const preview = getPreviewUrl(it);
              const canDownload = !!it.fileUrl && !isDataUrl(it.fileUrl);

              return (
                <div
                  key={it.id}
                  className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] transition-all duration-500"
                >
                  <div
                    className="relative aspect-[4/2.45] bg-slate-50 flex items-center justify-center cursor-pointer overflow-hidden"
                    onClick={() => {
                      setPreviewItem(it);
                      setZoom(1);
                    }}
                  >
                    {preview ? (
                      <img
                        src={preview}
                        alt={it.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        {getIconForType(t)}
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t}</span>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-[2px]">
                      <div className="bg-white p-3 rounded-full scale-50 group-hover:scale-100 transition-transform duration-300">
                        <Eye className="text-black" size={20} />
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(it.id);
                      }}
                      className="absolute top-3 right-3 p-2.5 bg-white/80 backdrop-blur-md rounded-full text-[#A39E93] hover:text-red-500 transition-all shadow-lg border border-[#EEEAE2]"
                    >
                      {deleting[it.id] ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>

                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <span
                        className={cn(
                          "text-[8px] font-black px-2 py-0.5 rounded border uppercase",
                          typeBadge(t)
                        )}
                      >
                        {t}
                      </span>
                    </div>

                    <h3 className="font-bold text-[13px] leading-tight mb-1 line-clamp-1">{it.title}</h3>
                    <p className="text-[10px] text-slate-400 font-medium mb-3 line-clamp-1">
                      {niceCat(it.category)}
                    </p>

                    <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2 min-h-[36px]">
                      {it.description || "No additional details provided."}
                    </p>

                    <div className="pt-3 mt-3 border-t border-slate-100 flex justify-between items-end gap-3">
                      <div className="text-[9px] font-bold text-slate-300 tracking-tight leading-4">
                        <div>{formatBytes(it.fileSize) || "CLOUD"}</div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setPreviewItem(it);
                            setZoom(1);
                          }}
                          className="p-2 bg-slate-50 rounded-lg hover:bg-black hover:text-white transition-all"
                        >
                          <Eye size={14} />
                        </button>

                        {canDownload ? (
                          <button
                            onClick={() => handleDownload(it)}
                            className="p-2 bg-slate-50 rounded-lg hover:bg-black hover:text-white transition-all"
                          >
                            <Download size={14} />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {!filtered.length && (
            <div className="py-40 flex flex-col items-center opacity-40">
              <Search size={64} strokeWidth={1} className="mb-4" />
              <p className="text-xs font-bold uppercase tracking-widest">No Matching Assets Found</p>
            </div>
          )}
        </section>
      </main>

      <PreviewModal
        item={previewItem}
        scale={zoom}
        onClose={() => setPreviewItem(null)}
        onZoomIn={() => setZoom((z: number) => Math.min(z + 0.25, 3))}
        onZoomOut={() => setZoom((z: number) => Math.max(z - 0.25, 0.5))}
        onReset={() => setZoom(1)}
      />
    </div>
  );
}