"use client";

import { useMemo, useState } from "react";
import { Search, X, FileText, Image as ImageIcon, Video, ExternalLink, Download } from "lucide-react";

function cn(...a: Array<string | undefined | null | false>) {
  return a.filter(Boolean).join(" ");
}

const labelCls = "text-[9px] font-bold text-[#A39E93] uppercase tracking-[0.1em] mb-1";

const TYPES = ["ALL", "DOCUMENT", "IMAGE", "VIDEO"] as const;

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

function isDataUrl(u: string) {
  return String(u || "").startsWith("data:");
}

function formatDate(dt: any) {
  try {
    return new Date(dt).toLocaleDateString();
  } catch {
    return "—";
  }
}

export default function DistributorMarketingToolkitClient({ initialItems }: { initialItems: any[] }) {
  const [items] = useState<any[]>(initialItems || []);
  const [q, setQ] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number]>("ALL");
  const [category, setCategory] = useState("ALL");
  const [collection, setCollection] = useState("");

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) set.add(String(it.category || "").toUpperCase());
    return ["ALL", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [items]);

  const collections = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) if (it.collection) set.add(String(it.collection));
    return ["", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
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

  return (
    <div className="min-h-screen bg-white">
      {/* Unique sticky header */}
      <div className="sticky top-0 z-40 bg-white border-b border-[#EEEAE2] shadow-sm">
        <div className="px-4 py-3 flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <h1 className="text-sm font-serif font-bold uppercase tracking-[0.2em]">Marketing Toolkit</h1>
            <p className="text-[9px] text-[#A39E93] font-bold uppercase">
              Ready-to-use assets • {filtered.length} items
            </p>
          </div>

          <div className="w-[220px]">
            <div className={labelCls}>Search</div>
            <div className="relative border-b border-[#EEEAE2]">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full bg-transparent py-1 text-[11px] outline-none"
                placeholder="catalogue, hotel, installation..."
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

          <div className="w-[260px]">
            <div className={labelCls}>Category</div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-transparent border-b border-[#EEEAE2] py-1 text-[11px] outline-none"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === "ALL" ? "All Categories" : niceCat(c)}
                </option>
              ))}
            </select>
          </div>

          <div className="w-[190px]">
            <div className={labelCls}>Collection</div>
            <select
              value={collection}
              onChange={(e) => setCollection(e.target.value)}
              className="w-full bg-transparent border-b border-[#EEEAE2] py-1 text-[11px] outline-none"
            >
              <option value="">All Collections</option>
              {collections
                .filter(Boolean)
                .map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
            </select>
          </div>

          <button
            onClick={() => {
              setQ("");
              setType("ALL");
              setCategory("ALL");
              setCollection("");
            }}
            className="p-1.5 border border-[#E5E0D8] bg-black text-white"
            title="Clear"
          >
            <X size={13} />
          </button>
        </div>

        {/* unique tiny hint bar */}
        <div className="px-4 pb-3">
          <div className="border border-[#EEEAE2] bg-[#FBF9F6] px-4 py-2 text-[10px] text-[#6F6A61]">
            Use these assets for proposals, client presentations, social posts, and project showcases.
          </div>
        </div>
      </div>

      {/* Card Grid */}
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((it) => {
            const t = String(it.type || "").toUpperCase();
            const c = String(it.category || "").toUpperCase();
            const openUrl = t === "VIDEO" && it.externalUrl ? it.externalUrl : it.fileUrl;
            const canDownload = !!it.fileUrl && !isDataUrl(it.fileUrl);

            return (
              <div key={it.id} className="border border-[#EEEAE2] bg-white rounded-sm overflow-hidden">
                <div className="p-4 border-b border-[#F2EFE9]">
                  <div className="flex items-start justify-between gap-3">
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

                    <div className="text-[10px] text-[#A39E93]">{formatDate(it.createdAt)}</div>
                  </div>
                </div>

                <div className="p-4">
                  {it.description ? (
                    <div className="text-[11px] text-[#6F6A61] leading-relaxed">{it.description}</div>
                  ) : (
                    <div className="text-[11px] text-[#A39E93]">—</div>
                  )}

                  <div className="mt-4 flex items-center gap-2">
                    {openUrl ? (
                      <a
                        href={openUrl}
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

        {!filtered.length ? <div className="mt-8 text-[11px] text-[#A39E93]">No assets found.</div> : null}
      </div>
    </div>
  );
}