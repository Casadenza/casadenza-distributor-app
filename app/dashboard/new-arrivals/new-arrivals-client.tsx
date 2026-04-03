"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  X,
} from "lucide-react";

type Item = {
  id: string;
  sku: string;
  name: string;
  collection: string;
  stoneType: string;
  thicknessMm: number | null;
  updatedAt: string;
  image: string | null;
  images: string[];
  launchDate: string | null;
  description: string | null;
};

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function formatLaunchDate(value?: string | null) {
  if (!value) return "New Launch";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function DistributorNewArrivalsClient() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [collection, setCollection] = useState("ALL");
  const [cardIndexes, setCardIndexes] = useState<Record<string, number>>({});
  const [viewer, setViewer] = useState<{ productId: string; imageIndex: number } | null>(null);
  const [zoom, setZoom] = useState(1);

  async function load() {
    setLoading(true);

    try {
      const res = await fetch("/api/new-arrivals", { cache: "no-store" });
      const json = await res.json();

      if (!res.ok) throw new Error(json?.error || "Failed to load");

      setItems(json.items || []);
    } catch (error: any) {
      alert(error?.message || "Failed to load new arrivals");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const collections = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      const value = (item.collection || "").trim();
      if (value) set.add(value);
    }
    return ["ALL", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const search = q.trim().toLowerCase();
      const inSearch =
        !search ||
        item.name.toLowerCase().includes(search) ||
        item.sku.toLowerCase().includes(search) ||
        item.collection.toLowerCase().includes(search) ||
        (item.description || "").toLowerCase().includes(search);

      const inCollection = collection === "ALL" || item.collection === collection;
      return inSearch && inCollection;
    });
  }, [items, q, collection]);

  const activeProduct = useMemo(() => {
    if (!viewer) return null;
    return items.find((item) => item.id === viewer.productId) || null;
  }, [items, viewer]);

  const activeImage =
    activeProduct && viewer
      ? activeProduct.images[viewer.imageIndex] ?? activeProduct.images[0] ?? null
      : null;

  function changeCardImage(productId: string, direction: "prev" | "next", total: number) {
    setCardIndexes((prev) => {
      const current = prev[productId] ?? 0;
      const next =
        direction === "next"
          ? (current + 1) % total
          : (current - 1 + total) % total;

      return {
        ...prev,
        [productId]: next,
      };
    });
  }

  function openViewer(productId: string, imageIndex: number) {
    setViewer({ productId, imageIndex });
    setZoom(1.8);
  }

  function changeViewerImage(direction: "prev" | "next") {
    if (!activeProduct || !viewer) return;

    const total = activeProduct.images.length;
    const next =
      direction === "next"
        ? (viewer.imageIndex + 1) % total
        : (viewer.imageIndex - 1 + total) % total;

    setViewer({
      productId: viewer.productId,
      imageIndex: next,
    });
    setZoom(1.8);
  }

  function zoomIn() {
    setZoom((prev) => Math.min(prev + 0.45, 5));
  }

  function zoomOut() {
    setZoom((prev) => Math.max(prev - 0.45, 1));
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] p-4 md:p-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-6 border-b border-[#EEE] pb-4">
          <h1 className="text-4xl font-serif italic tracking-tight text-[#1A1A1A]">
            New Arrivals
          </h1>
          <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.3em] text-[#C5A267]">
            Latest Surfaces · Multi Image Preview
          </p>
        </header>

        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-zinc-100 bg-white p-3 shadow-sm md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search SKU, name, collection"
              className="h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-9 pr-3 text-[12px] outline-none transition focus:border-zinc-300 focus:bg-white"
            />
          </div>

          <select
            value={collection}
            onChange={(e) => setCollection(e.target.value)}
            className="h-9 min-w-[220px] rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-[12px] outline-none transition focus:border-zinc-300 focus:bg-white"
          >
            {collections.map((item) => (
              <option key={item} value={item}>
                {item === "ALL" ? "All Collections" : item}
              </option>
            ))}
          </select>

          <div className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-[11px] font-semibold text-zinc-600">
            {filtered.length} Products
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-sm"
              >
                <div className="aspect-[4/3] animate-pulse bg-zinc-100" />
                <div className="space-y-2 p-3">
                  <div className="h-3 w-24 animate-pulse rounded bg-zinc-100" />
                  <div className="h-4 w-32 animate-pulse rounded bg-zinc-100" />
                  <div className="h-3 w-20 animate-pulse rounded bg-zinc-100" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-white px-6 py-16 text-center text-[12px] text-zinc-400">
            No new arrivals available
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filtered.map((item) => {
              const currentIndex = cardIndexes[item.id] ?? 0;
              const currentImage = item.images[currentIndex] ?? item.images[0] ?? null;

              return (
                <div
                  key={item.id}
                  className="overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-sm"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-zinc-50">
                    {currentImage ? (
                      <button
                        type="button"
                        onClick={() => openViewer(item.id, currentIndex)}
                        className="block h-full w-full"
                      >
                        <img
                          src={currentImage}
                          alt={item.name}
                          className="h-full w-full object-cover transition duration-300 hover:scale-[1.08]"
                          referrerPolicy="no-referrer"
                        />
                      </button>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[11px] text-zinc-300">
                        No Image
                      </div>
                    )}

                    {item.images.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() => changeCardImage(item.id, "prev", item.images.length)}
                          className="absolute left-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-white/90 text-zinc-800 shadow-sm backdrop-blur"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => changeCardImage(item.id, "next", item.images.length)}
                          className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-white/90 text-zinc-800 shadow-sm backdrop-blur"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </>
                    )}

                    <div className="absolute left-2 top-2 rounded-full border border-white/70 bg-white/90 px-2 py-1 text-[10px] font-semibold text-zinc-700 backdrop-blur">
                      {formatLaunchDate(item.launchDate)}
                    </div>

                    {item.images.length > 1 && (
                      <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/30 px-2 py-1 backdrop-blur">
                        {item.images.map((_, index) => (
                          <span
                            key={`${item.id}-${index}`}
                            className={cn(
                              "h-1.5 rounded-full transition-all",
                              index === currentIndex ? "w-4 bg-white" : "w-1.5 bg-white/60"
                            )}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 p-3">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#C5A267]">
                        {item.collection || "Collection"}
                      </p>
                      <h3 className="truncate text-[14px] font-semibold tracking-tight text-zinc-900">
                        {item.name}
                      </h3>
                      <p className="mt-0.5 text-[11px] text-zinc-400">{item.sku}</p>
                    </div>

                    {item.description ? (
                      <p className="line-clamp-2 text-[11px] leading-5 text-zinc-500">
                        {item.description}
                      </p>
                    ) : null}

                    <div className="flex items-center justify-between text-[11px] text-zinc-500">
                      <span>{item.images.length} image{item.images.length === 1 ? "" : "s"}</span>
                      <button
                        type="button"
                        onClick={() => openViewer(item.id, currentIndex)}
                        className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 font-medium text-zinc-700 transition hover:bg-zinc-100"
                      >
                        View
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {activeProduct && activeImage && viewer && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/78 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-6xl overflow-hidden rounded-[28px] border border-white/10 bg-[#0B0B0B] shadow-2xl">
            <div className="absolute right-3 top-3 z-20 flex items-center gap-2">
              <button
                type="button"
                onClick={zoomOut}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/45 text-white backdrop-blur transition hover:bg-black/65"
              >
                <ZoomOut size={16} />
              </button>
              <button
                type="button"
                onClick={zoomIn}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/45 text-white backdrop-blur transition hover:bg-black/65"
              >
                <ZoomIn size={16} />
              </button>
              <button
                type="button"
                onClick={() => setViewer(null)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/45 text-white backdrop-blur transition hover:bg-black/65"
              >
                <X size={16} />
              </button>
            </div>

            <div className="relative flex min-h-[420px] items-center justify-center overflow-auto bg-black">
              <img
                src={activeImage}
                alt={activeProduct.name}
                className="max-h-[85vh] w-full object-contain transition-transform duration-300"
                style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
                referrerPolicy="no-referrer"
              />

              {activeProduct.images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => changeViewerImage("prev")}
                    className="absolute left-3 top-1/2 z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/45 text-white backdrop-blur transition hover:bg-black/65"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => changeViewerImage("next")}
                    className="absolute right-3 top-1/2 z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/45 text-white backdrop-blur transition hover:bg-black/65"
                  >
                    <ChevronRight size={18} />
                  </button>
                </>
              )}
            </div>

            <div className="border-t border-white/10 bg-[#0B0B0B] px-4 py-3 text-white">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#D2B27A]">
                    {activeProduct.collection || "Collection"}
                  </div>
                  <h3 className="truncate text-[16px] font-semibold tracking-tight">
                    {activeProduct.name}
                  </h3>
                  <p className="text-[11px] text-white/60">
                    {activeProduct.sku} · {formatLaunchDate(activeProduct.launchDate)}
                  </p>
                  {activeProduct.description ? (
                    <p className="mt-1 max-w-2xl text-[11px] leading-5 text-white/70">
                      {activeProduct.description}
                    </p>
                  ) : null}
                </div>

                <div className="flex items-center gap-1.5">
                  {activeProduct.images.map((_, index) => (
                    <button
                      key={`${activeProduct.id}-${index}`}
                      type="button"
                      onClick={() => {
                        setViewer({ productId: activeProduct.id, imageIndex: index });
                        setZoom(1.8);
                      }}
                      className={cn(
                        "h-2 rounded-full transition-all",
                        index === viewer.imageIndex
                          ? "w-5 bg-white"
                          : "w-2 bg-white/35 hover:bg-white/60"
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}