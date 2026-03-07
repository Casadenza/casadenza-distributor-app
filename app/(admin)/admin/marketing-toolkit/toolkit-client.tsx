"use client";

import { useMemo, useState } from "react";
import {
  Search,
  RefreshCw,
  X,
  FileUp,
  Trash2,
  ExternalLink,
  Download,
  Image as ImageIcon,
  FileText,
  Video,
  Link as LinkIcon,
  Loader2,
} from "lucide-react";

function cn(...a: Array<string | undefined | null | false>) {
  return a.filter(Boolean).join(" ");
}

const labelCls = "text-[9px] font-bold text-[#A39E93] uppercase tracking-[0.1em] mb-1";

const TYPES = ["ALL", "DOCUMENT", "IMAGE", "VIDEO"] as const;

const CATEGORIES = [
  // Documents (Core)
  "PRODUCT_CATALOGUE_FULL",
  "COLLECTION_CATALOGUE",
  "TECHNICAL_DATA_SHEET",
  "INSTALLATION_GUIDE",
  "MAINTENANCE_GUIDE",
  "FIRE_TEST_CERTIFICATE",
  "BROCHURE_SHORT",
  "COMPANY_PROFILE_PDF",
  "OTHERS_DOCUMENTS",
  // Sales Tools
  "SAMPLE_KIT_GUIDE",
  "PROJECT_REFERENCE_LIST",
  // Images (Projects)
  "PROJECT_HOTEL",
  "PROJECT_VILLA",
  "PROJECT_COMMERCIAL_FACADE",
  "PROJECT_INTERIOR_WALL",
  "PROJECT_BEFORE_AFTER",
  // Videos
  "VIDEO_INSTALLATION",
  "VIDEO_PROJECT_SHOWCASE",
  "VIDEO_PRODUCT_HIGHLIGHT",
  "VIDEO_BRAND_INTRO",
  "VIDEO_PROMO_30S",
  "VIDEO_REELS_SHORT",
];

function niceCat(cat: string) {
  return String(cat).replaceAll("_", " ");
}

function typeIcon(type: string) {
  const t = String(type || "").toUpperCase();
  if (t === "DOCUMENT") return <FileText size={16} className="text-[#A39E93]" />;
  if (t === "IMAGE") return <ImageIcon size={16} className="text-[#A39E93]" />;
  return <Video size={16} className="text-[#A39E93]" />;
}

function typeBadge(type: string) {
  const t = String(type || "").toUpperCase();
  if (t === "DOCUMENT") return "bg-indigo-50 text-indigo-700 border-indigo-100";
  if (t === "IMAGE") return "bg-emerald-50 text-emerald-700 border-emerald-100";
  return "bg-amber-50 text-amber-800 border-amber-100";
}

function formatDate(dt: any) {
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return "—";
  }
}

function isDataUrl(u: string) {
  return String(u || "").startsWith("data:");
}

export default function AdminMarketingToolkitClient({ initialItems }: { initialItems: any[] }) {
  const [items, setItems] = useState<any[]>(initialItems || []);
  const [q, setQ] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number]>("ALL");
  const [category, setCategory] = useState("ALL");
  const [collection, setCollection] = useState("");

  const [uploadMode, setUploadMode] = useState<"UPLOAD" | "VIDEO_LINK">("UPLOAD");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});

  // Upload form
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
    for (const it of items) if (it.collection) set.add(String(it.collection));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      const t = String(it.type || "").toUpperCase();
      const c = String(it.category || "").toUpperCase();
      const hay = `${it.title} ${it.description || ""} ${it.collection || ""} ${it.stoneType || ""} ${t} ${c}`.toLowerCase();

      if (type !== "ALL" && t !== type) return false;
      if (category !== "ALL" && c !== category) return false;
      if (collection && String(it.collection || "").toLowerCase() !== collection.toLowerCase()) return false;
      if (q && !hay.includes(q.toLowerCase())) return false;

      return true;
    });
  }, [items, q, type, category, collection]);

  async function reload() {
    const res = await fetch("/api/admin/marketing", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setItems(data.items || []);
    } else {
      window.location.reload();
    }
  }

  async function createAsset() {
    setBusy(true);
    try {
      if (uploadMode === "VIDEO_LINK") {
        // JSON mode
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
        // Multipart upload
        if (!form.file) throw new Error("Please choose a file.");

        const fd = new FormData();
        fd.append("title", form.title);
        fd.append("type", form.type);
        fd.append("category", form.category);
        if (form.collection) fd.append("collection", form.collection);
        if (form.stoneType) fd.append("stoneType", form.stoneType);
        if (form.description) fd.append("description", form.description);
        fd.append("file", form.file);

        const res = await fetch("/api/admin/marketing", { method: "POST", body: fd });
        if (!res.ok) throw new Error(await res.text());
      }

      // reset form
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

      await reload();
    } catch (e: any) {
      alert(e?.message || "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function deleteAsset(id: string) {
    if (!confirm("Delete this asset?")) return;
    setDeleting((p) => ({ ...p, [id]: true }));
    try {
      const res = await fetch(`/api/admin/marketing/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      await reload();
    } catch (e: any) {
      alert(e?.message || "Delete failed");
    } finally {
      setDeleting((p) => ({ ...p, [id]: false }));
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-[#EEEAE2] shadow-sm">
        <div className="px-4 py-3 flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[180px]">
            <h1 className="text-sm font-serif font-bold uppercase tracking-[0.2em]">Marketing Toolkit</h1>
            <p className="text-[9px] text-[#A39E93] font-bold uppercase">
              Admin Library • {filtered.length} items
            </p>
          </div>

          <div className="w-[210px]">
            <div className={labelCls}>Search</div>
            <div className="relative border-b border-[#EEEAE2]">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full bg-transparent py-1 text-[11px] outline-none"
                placeholder="catalogue, hotel, video..."
              />
              <Search className="absolute right-0 top-1 text-[#A39E93]" size={12} />
            </div>
          </div>

          <div className="w-[150px]">
            <div className={labelCls}>Type</div>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full bg-transparent border-b border-[#EEEAE2] py-1 text-[11px] outline-none"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t === "ALL" ? "All" : t}
                </option>
              ))}
            </select>
          </div>

          <div className="w-[240px]">
            <div className={labelCls}>Category</div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-transparent border-b border-[#EEEAE2] py-1 text-[11px] outline-none"
            >
              <option value="ALL">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {niceCat(c)}
                </option>
              ))}
            </select>
          </div>

          <div className="w-[180px]">
            <div className={labelCls}>Collection (optional)</div>
            <select
              value={collection}
              onChange={(e) => setCollection(e.target.value)}
              className="w-full bg-transparent border-b border-[#EEEAE2] py-1 text-[11px] outline-none"
            >
              <option value="">All Collections</option>
              {collections.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button onClick={reload} className="p-1.5 border border-[#E5E0D8]">
              <RefreshCw size={13} />
            </button>
            <button
              onClick={() => {
                setQ("");
                setType("ALL");
                setCategory("ALL");
                setCollection("");
              }}
              className="p-1.5 border border-[#E5E0D8] bg-black text-white"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Unique segmented mode switch */}
        <div className="px-4 pb-3">
          <div className="inline-flex border border-[#EEEAE2] bg-[#FBF9F6] rounded-full overflow-hidden">
            <button
              onClick={() => setUploadMode("UPLOAD")}
              className={cn(
                "px-4 py-2 text-[10px] font-bold uppercase tracking-widest",
                uploadMode === "UPLOAD" ? "bg-black text-white" : "text-[#6F6A61]"
              )}
            >
              Upload File
            </button>
            <button
              onClick={() => {
                setUploadMode("VIDEO_LINK");
                setForm((p) => ({ ...p, type: "VIDEO", category: "VIDEO_BRAND_INTRO" }));
              }}
              className={cn(
                "px-4 py-2 text-[10px] font-bold uppercase tracking-widest",
                uploadMode === "VIDEO_LINK" ? "bg-black text-white" : "text-[#6F6A61]"
              )}
            >
              Video Link
            </button>
          </div>
        </div>

        {/* Upload Panel */}
        <div className="px-4 pb-4">
          <div className="border border-[#EEEAE2] bg-white rounded-sm">
            <div className="px-4 py-2 border-b border-[#F2EFE9] flex items-center justify-between">
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#A39E93]">
                Create Asset
              </div>
              <div className="text-[10px] text-[#A39E93]">Admin uploads once • all distributors see</div>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
              <div className="md:col-span-2">
                <div className={labelCls}>Title</div>
                <input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full bg-transparent border-b border-[#EEEAE2] py-1 text-[11px] outline-none"
                  placeholder="e.g., Casadenza Product Catalogue 2026"
                />
              </div>

              <div className="md:col-span-1">
                <div className={labelCls}>Type</div>
                <select
                  disabled={uploadMode === "VIDEO_LINK"}
                  value={form.type}
                  onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                  className="w-full bg-transparent border-b border-[#EEEAE2] py-1 text-[11px] outline-none"
                >
                  <option value="DOCUMENT">DOCUMENT</option>
                  <option value="IMAGE">IMAGE</option>
                  <option value="VIDEO">VIDEO</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <div className={labelCls}>Category</div>
                <select
                  value={form.category}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                  className="w-full bg-transparent border-b border-[#EEEAE2] py-1 text-[11px] outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {niceCat(c)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-1">
                <div className={labelCls}>Collection</div>
                <input
                  value={form.collection}
                  onChange={(e) => setForm((p) => ({ ...p, collection: e.target.value }))}
                  className="w-full bg-transparent border-b border-[#EEEAE2] py-1 text-[11px] outline-none"
                  placeholder="Fusion"
                />
              </div>

              <div className="md:col-span-2">
                <div className={labelCls}>Stone Type</div>
                <input
                  value={form.stoneType}
                  onChange={(e) => setForm((p) => ({ ...p, stoneType: e.target.value }))}
                  className="w-full bg-transparent border-b border-[#EEEAE2] py-1 text-[11px] outline-none"
                  placeholder="Slate"
                />
              </div>

              <div className="md:col-span-3">
                <div className={labelCls}>Description (optional)</div>
                <input
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full bg-transparent border-b border-[#EEEAE2] py-1 text-[11px] outline-none"
                  placeholder="Short note for distributors..."
                />
              </div>

              {uploadMode === "VIDEO_LINK" ? (
                <div className="md:col-span-3">
                  <div className={labelCls}>Video URL (YouTube/Vimeo/Drive)</div>
                  <div className="relative border-b border-[#EEEAE2]">
                    <input
                      value={form.externalUrl}
                      onChange={(e) => setForm((p) => ({ ...p, externalUrl: e.target.value }))}
                      className="w-full bg-transparent py-1 text-[11px] outline-none pr-6"
                      placeholder="https://youtube.com/..."
                    />
                    <LinkIcon className="absolute right-0 top-1 text-[#A39E93]" size={12} />
                  </div>
                </div>
              ) : (
                <div className="md:col-span-3">
                  <div className={labelCls}>File</div>
                  <input
                    type="file"
                    accept={
                      form.type === "DOCUMENT"
                        ? "application/pdf"
                        : form.type === "IMAGE"
                        ? "image/*"
                        : "video/mp4,video/webm"
                    }
                    onChange={(e) => setForm((p) => ({ ...p, file: e.target.files?.[0] }))}
                    className="block w-full text-[11px]"
                  />
                  <div className="text-[10px] text-[#A39E93] mt-1">
                    Documents: PDF • Images: JPG/PNG/WEBP • Videos: MP4/WEBM
                  </div>
                </div>
              )}

              <div className="md:col-span-6 flex justify-end">
                <button
                  disabled={busy}
                  onClick={createAsset}
                  className={cn(
                    "h-9 px-5 rounded-lg border border-[#E5E0D8] bg-black text-white text-[11px] font-semibold inline-flex items-center gap-2",
                    busy ? "opacity-70 cursor-not-allowed" : "hover:opacity-95"
                  )}
                >
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />}
                  Publish Asset
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((it) => {
            const t = String(it.type || "").toUpperCase();
            const c = String(it.category || "").toUpperCase();
            const url = it.fileUrl || it.externalUrl || "";
            const canDownload = !!it.fileUrl && !isDataUrl(it.fileUrl);

            return (
              <div key={it.id} className="border border-[#EEEAE2] bg-white rounded-sm overflow-hidden">
                <div className="p-4 border-b border-[#F2EFE9] flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {typeIcon(t)}
                      <div className="text-[11px] font-bold truncate">{it.title}</div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={cn("text-[8px] font-bold border px-1.5 py-0.5 rounded-sm uppercase", typeBadge(t))}>
                        {t}
                      </span>
                      <span className="text-[8px] font-bold border px-1.5 py-0.5 rounded-sm uppercase bg-[#FBF9F6] text-[#6F6A61] border-[#EEEAE2]">
                        {niceCat(c)}
                      </span>
                      {it.collection ? (
                        <span className="text-[8px] font-bold border px-1.5 py-0.5 rounded-sm uppercase bg-white text-[#6F6A61] border-[#EEEAE2]">
                          {it.collection}
                        </span>
                      ) : null}
                      {it.stoneType ? (
                        <span className="text-[8px] font-bold border px-1.5 py-0.5 rounded-sm uppercase bg-white text-[#6F6A61] border-[#EEEAE2]">
                          {it.stoneType}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <button
                    disabled={!!deleting[it.id]}
                    onClick={() => deleteAsset(it.id)}
                    className={cn(
                      "p-2 border border-[#E5E0D8] hover:bg-black hover:text-white transition",
                      deleting[it.id] ? "opacity-70 cursor-not-allowed" : ""
                    )}
                    title="Delete"
                  >
                    {deleting[it.id] ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>

                <div className="p-4">
                  {it.description ? (
                    <div className="text-[11px] text-[#6F6A61] leading-relaxed">{it.description}</div>
                  ) : (
                    <div className="text-[11px] text-[#A39E93]">—</div>
                  )}

                  <div className="mt-3 text-[10px] text-[#A39E93]">
                    Added: {formatDate(it.createdAt)} {it.fileSize ? `• ${(it.fileSize / 1024 / 1024).toFixed(2)} MB` : ""}
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    {url ? (
                      <a
                        href={t === "VIDEO" && it.externalUrl ? it.externalUrl : it.fileUrl}
                        target="_blank"
                        className="text-[10px] px-3 py-1.5 rounded-lg border border-[#E5E0D8] bg-white hover:bg-black hover:text-white transition inline-flex items-center gap-1"
                      >
                        <ExternalLink size={13} />
                        Open
                      </a>
                    ) : null}

                    {canDownload ? (
                      <a
                        href={it.fileUrl}
                        className="text-[10px] px-3 py-1.5 rounded-lg border border-[#E5E0D8] bg-white hover:bg-black hover:text-white transition inline-flex items-center gap-1"
                      >
                        <Download size={13} />
                        Download
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!filtered.length ? (
          <div className="mt-8 text-[11px] text-[#A39E93]">No assets found.</div>
        ) : null}
      </div>
    </div>
  );
}