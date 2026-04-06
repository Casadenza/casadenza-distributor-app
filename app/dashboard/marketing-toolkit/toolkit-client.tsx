"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  FileText,
  Image as ImageIcon,
  Video,
  ArrowUpRight,
  Download,
  Play,
  Minus,
  Plus,
  RotateCcw,
  ChevronDown,
} from "lucide-react";

const TYPES = ["IMAGE", "VIDEO", "DOCUMENT"] as const;

function isDataUrl(url?: string | null) {
  return String(url || "").startsWith("data:");
}

function getType(item: any) {
  return String(item?.type || "").toUpperCase();
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

function formatCategory(value: string) {
  return String(value || "")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
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

function AssetPreviewLightbox({
  open,
  item,
  imageScale,
  onClose,
  onZoomIn,
  onZoomOut,
  onReset,
}: {
  open: boolean;
  item: any | null;
  imageScale: number;
  onClose: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}) {
  const type = getType(item);
  const src = item ? getOpenUrl(item) : "";
  const title = item?.title || "Preview";

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (type === "IMAGE") {
        if (e.key === "+" || e.key === "=") onZoomIn();
        if (e.key === "-") onZoomOut();
        if (e.key === "0") onReset();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, onZoomIn, onZoomOut, onReset, type]);

  if (!open || !item || !src) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="asset-lightbox"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] bg-[rgba(7,7,9,0.84)] backdrop-blur-[10px]"
      >
        <div className="absolute inset-0" onClick={onClose} />

        <div className="absolute left-1/2 top-4 z-[91] flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/12 bg-black/45 px-2 py-2 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
          {type === "IMAGE" ? (
            <>
              <button
                type="button"
                onClick={onZoomOut}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              >
                <Minus size={15} />
              </button>

              <div className="min-w-[68px] text-center text-[11px] font-semibold tracking-[0.04em] text-white">
                {Math.round(imageScale * 100)}%
              </div>

              <button
                type="button"
                onClick={onZoomIn}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              >
                <Plus size={15} />
              </button>

              <button
                type="button"
                onClick={onReset}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              >
                <RotateCcw size={15} />
              </button>

              <div className="mx-1 h-5 w-px bg-white/10" />
            </>
          ) : null}

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black transition hover:bg-white/90"
          >
            <X size={16} />
          </button>
        </div>

        <div className="absolute inset-x-0 top-[70px] z-[91] px-5 text-center">
          <div className="mx-auto max-w-[820px] truncate text-[12px] font-medium tracking-[0.02em] text-white/88">
            {title}
          </div>
        </div>

        <div className="absolute inset-0 flex items-center justify-center px-4 pb-6 pt-24">
          <div className="flex h-full w-full items-center justify-center overflow-auto rounded-[28px]">
            {type === "IMAGE" ? (
              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.10),transparent_52%)]" />
                <motion.img
                  src={src}
                  alt={title}
                  initial={{ opacity: 0.94, scale: 0.98 }}
                  animate={{ opacity: 1, scale: imageScale }}
                  transition={{ duration: 0.18 }}
                  className="relative h-auto w-auto max-h-[84vh] max-w-[92vw] rounded-[22px] border border-white/10 object-contain shadow-[0_40px_120px_rgba(0,0,0,0.34)]"
                />
              </div>
            ) : null}

            {type === "DOCUMENT" ? (
              <div className="h-[90vh] w-[min(94vw,1100px)] overflow-hidden rounded-[22px] border border-white/10 bg-white shadow-[0_40px_120px_rgba(0,0,0,0.34)]">
                <iframe
                  src={`${src}#toolbar=0&navpanes=0&view=Fit`}
                  title={title}
                  className="h-full w-full"
                />
              </div>
            ) : null}

            {type === "VIDEO" ? (
              <div className="w-[min(96vw,1400px)] overflow-hidden rounded-[22px] border border-white/10 bg-black shadow-[0_40px_120px_rgba(0,0,0,0.34)]">
                <video
                  src={src}
                  controls
                  autoPlay
                  playsInline
                  poster={getPreviewUrl(item) || undefined}
                  className="max-h-[84vh] w-full bg-black"
                />
              </div>
            ) : null}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function UltraPremiumToolkit({ initialItems }: { initialItems: any[] }) {
  const [items] = useState<any[]>(initialItems || []);
  const [q, setQ] = useState("");
  const [activeType, setActiveType] = useState<string>("IMAGE");
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [lightboxItem, setLightboxItem] = useState<any | null>(null);
  const [zoom, setZoom] = useState(1);

  const isDocumentPreviewOpen = !!lightboxItem && getType(lightboxItem) === "DOCUMENT";

  const categories = useMemo(() => {
    const unique = Array.from(
      new Set(
        items
          .map((item) => String(item?.category || "").toUpperCase())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));

    return ["ALL", ...unique];
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      const t = getType(it);
      const c = String(it?.category || "").toUpperCase();

      const matchSearch = `${it?.title || ""} ${it?.collection || ""} ${it?.category || ""} ${it?.description || ""}`
        .toLowerCase()
        .includes(q.toLowerCase());

      const matchType = t === activeType;
      const matchCategory = activeCategory === "ALL" || c === activeCategory;

      return matchSearch && matchType && matchCategory;
    });
  }, [items, q, activeType, activeCategory]);

  const handleOpenAsset = (item: any) => {
    setLightboxItem(item);
    setZoom(1);
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

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.75));
  const handleZoomReset = () => setZoom(1);

  return (
    <div className="min-h-screen bg-[#FBFBFB] font-sans text-[#1D1D1F] antialiased">
      <div
        className={
          isDocumentPreviewOpen
            ? "relative z-20 border-b border-[#ECECEF] bg-[#FBFBFB]"
            : "sticky top-0 z-30 border-b border-[#ECECEF] bg-[#FBFBFB]/92 backdrop-blur-xl"
        }
      >
        <nav className="flex items-center justify-between px-5 py-3 lg:px-10">
          <div>
            <p className="text-[8px] font-bold uppercase tracking-[0.32em] text-[#86868B]">Resource Hub</p>
            <h1 className="mt-0.5 font-serif text-[20px] font-light tracking-tight italic text-[#111111]">
              Marketing Toolkit.
            </h1>
          </div>

          <div className="text-[9px] font-medium uppercase tracking-[0.22em] text-[#86868B]">
            {items.length} Assets
          </div>
        </nav>

        <div className="px-5 pb-3 lg:px-10">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
              <div className="flex gap-1.5 rounded-full bg-[#F2F2F7] p-1 w-fit">
                {TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveType(t)}
                    className={`px-3.5 py-1.5 rounded-full text-[8px] font-bold uppercase tracking-[0.22em] transition-all ${
                      activeType === t
                        ? "bg-white text-black shadow-[0_2px_10px_rgba(0,0,0,0.05)]"
                        : "text-[#86868B] hover:text-black"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="relative min-w-[190px]">
                <select
                  value={activeCategory}
                  onChange={(e) => setActiveCategory(e.target.value)}
                  className="h-[34px] w-full appearance-none rounded-full border border-[#EDEDF2] bg-white pl-4 pr-10 text-[9px] font-bold uppercase tracking-[0.18em] text-[#4A4A4F] shadow-[0_4px_20px_rgba(0,0,0,0.02)] outline-none transition focus:border-black"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category === "ALL" ? "All Categories" : formatCategory(category)}
                    </option>
                  ))}
                </select>

                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8D8D94]"
                />
              </div>
            </div>

            <div className="relative group w-full max-w-[300px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#86868B]" size={13} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name or collection..."
                className="w-full rounded-full border border-[#EEEEF2] bg-white py-2 pl-10 pr-10 text-[11px] placeholder:text-[#C5C5C7] shadow-[0_4px_20px_rgba(0,0,0,0.02)] outline-none transition-all focus:ring-1 focus:ring-black"
              />
              {q ? (
                <button
                  type="button"
                  onClick={() => setQ("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9A9AA0] transition-colors hover:text-black"
                >
                  <X size={13} />
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <main className="px-5 py-5 lg:px-10">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-[9px] font-medium uppercase tracking-[0.22em] text-[#86868B]">
            {filtered.length} {filtered.length === 1 ? "Result" : "Results"}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          <AnimatePresence mode="popLayout">
            {filtered.map((it) => {
              const type = getType(it);
              const previewUrl = getPreviewUrl(it);
              const openUrl = getOpenUrl(it);
              const isDocument = type === "DOCUMENT";
              const isVideo = type === "VIDEO";
              const isImage = type === "IMAGE";
              const cardAspect = isDocument ? "aspect-[3/2.95]" : "aspect-[3/3.35]";

              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  key={it.id}
                  className="group relative flex flex-col"
                >
                  <button
                    type="button"
                    onClick={() => handleOpenAsset(it)}
                    className={`relative ${cardAspect} overflow-hidden rounded-[16px] border border-[#EFEFF4] bg-[#F4F4F7] text-left shadow-[0_8px_24px_rgba(0,0,0,0.03)] transition-all hover:shadow-[0_14px_34px_rgba(0,0,0,0.06)]`}
                  >
                    {isImage && previewUrl ? (
                      <img
                        src={previewUrl}
                        alt={it?.title || "Asset"}
                        className="h-full w-full object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-[1.04]"
                      />
                    ) : isVideo && previewUrl ? (
                      <>
                        <img
                          src={previewUrl}
                          alt={it?.title || "Video thumbnail"}
                          className="h-full w-full object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-[1.04]"
                        />
                        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.04),rgba(0,0,0,0.22))]" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-black shadow-[0_10px_30px_rgba(0,0,0,0.14)] backdrop-blur-md">
                            <Play size={15} className="ml-0.5" fill="currentColor" />
                          </div>
                        </div>
                      </>
                    ) : isDocument ? (
                      <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(180deg,#FAFAFC_0%,#F1F1F5_100%)] px-4">
                        <div className="flex w-[138px] items-center gap-2.5 rounded-[16px] border border-[#ECECF1] bg-white px-3 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.04)]">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#FFF4F4]">
                            <FileText size={16} strokeWidth={1.8} className="text-[#D12F2F]" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[7px] font-bold uppercase tracking-[0.18em] text-[#D12F2F]">PDF</div>
                            <div className="truncate text-[8px] font-medium text-[#5E5E66]">
                              {it?.title || "Document"}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : isVideo ? (
                      <div className="flex h-full w-full flex-col items-center justify-center bg-[linear-gradient(180deg,#FAFAFC_0%,#F1F1F5_100%)]">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-[0_8px_24px_rgba(0,0,0,0.05)]">
                          <Video size={22} strokeWidth={1.5} className="text-[#7D7D84]" />
                        </div>
                        <div className="mt-2.5 flex items-center gap-1 rounded-full border border-[#E8E8ED] bg-white px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.22em] text-[#5E5E66]">
                          <Play size={9} fill="currentColor" className="text-[#5E5E66]" />
                          Video
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(180deg,#FAFAFC_0%,#F1F1F5_100%)]">
                        <ImageIcon size={26} strokeWidth={1.3} className="text-[#C5C5C7]" />
                      </div>
                    )}

                    <div className="absolute left-2.5 top-2.5 z-10">
                      <span className="rounded-full bg-white/92 px-2 py-1 text-[7px] font-bold uppercase tracking-[0.18em] text-[#111111] shadow-[0_8px_20px_rgba(0,0,0,0.05)] backdrop-blur-md">
                        {it?.collection || "General"}
                      </span>
                    </div>

                    {isDocument ? (
                      <div className="absolute right-2.5 top-2.5 z-10">
                        <span className="rounded-full bg-white/96 px-2 py-1 text-[7px] font-bold uppercase tracking-[0.18em] text-[#D12F2F] shadow-[0_8px_20px_rgba(0,0,0,0.08)] backdrop-blur-md">
                          PDF
                        </span>
                      </div>
                    ) : null}

                    <div className="absolute inset-0 bg-black/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                    <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 opacity-0 translate-y-2 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                      {openUrl ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenAsset(it);
                          }}
                          className="inline-flex h-9 min-w-[44px] items-center justify-center rounded-full bg-white/94 px-3 text-black shadow-[0_10px_24px_rgba(0,0,0,0.12)] backdrop-blur-md transition hover:bg-white"
                        >
                          <ArrowUpRight size={15} />
                        </button>
                      ) : (
                        <div />
                      )}

                      {it?.fileUrl && !isDataUrl(it.fileUrl) ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(it);
                          }}
                          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-black/92 px-4 text-[8px] font-bold uppercase tracking-[0.18em] text-white shadow-[0_10px_24px_rgba(0,0,0,0.18)] backdrop-blur-md transition hover:bg-black"
                        >
                          <Download size={12} />
                          Download
                        </button>
                      ) : null}
                    </div>
                  </button>

                  <div className="mt-2.5 space-y-1 px-0.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-[7px] font-bold uppercase tracking-[0.2em] text-[#86868B]">
                        {type === "DOCUMENT" ? "PDF Document" : type === "VIDEO" ? "Video Asset" : "Image Asset"}
                      </span>
                      <span className="shrink-0 text-[8px] text-[#A1A1A6]">
                        {it?.createdAt ? new Date(it.createdAt).getFullYear() : ""}
                      </span>
                    </div>

                    <h3 className="truncate text-[11px] font-medium tracking-tight text-[#1D1D1F]">
                      {it?.title || "Untitled"}
                    </h3>

                    <div className="flex items-center gap-2 pt-0.5 text-[8px] text-[#A1A1A6]">
                      <span className="uppercase tracking-[0.16em]">
                        {formatCategory(it?.category || "general")}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-28">
            <p className="font-serif text-[24px] italic tracking-tight text-[#86868B]">
              Nothing found in the archives.
            </p>
            <button
              onClick={() => {
                setQ("");
                setActiveType("IMAGE");
                setActiveCategory("ALL");
              }}
              className="mt-4 border-b border-black pb-1 text-[10px] font-bold uppercase tracking-[0.3em]"
            >
              Show everything
            </button>
          </div>
        )}
      </main>

      <AssetPreviewLightbox
        open={!!lightboxItem}
        item={lightboxItem}
        imageScale={zoom}
        onClose={() => setLightboxItem(null)}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={handleZoomReset}
      />
    </div>
  );
}