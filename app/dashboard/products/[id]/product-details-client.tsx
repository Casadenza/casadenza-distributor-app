"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Ruler,
  Layers,
  ZoomIn,
  ZoomOut,
  X,
  ScanSearch,
  ImageIcon,
} from "lucide-react";

type Variant = {
  id: string;
  sizeLabel: string | null;
  widthMm: number | null;
  heightMm: number | null;
};

type Product = {
  id: string;
  sku: string;
  name: string;
  image: string | null;
  collection: string | null;
  stoneType: string | null;
  thicknessMm: number | null;
  variants: Variant[];
};

function getOptimizedProductImage(
  src?: string | null,
  options?: {
    width?: number;
    height?: number;
    mode?: "fill" | "limit";
    quality?: string;
  }
) {
  if (!src) return "";
  if (!src.includes("/upload/")) return src;

  const width = options?.width;
  const height = options?.height;
  const mode = options?.mode ?? "limit";
  const quality = options?.quality ?? "auto:good";

  const [base, rest] = src.split("/upload/");
  if (!base || !rest) return src;

  const transforms = ["f_auto", `q_${quality}`, "dpr_auto"];

  if (mode === "fill" && width && height) {
    transforms.push("c_fill", "g_auto", `w_${Math.round(width)}`, `h_${Math.round(height)}`);
  } else {
    transforms.push("c_limit");
    if (width) transforms.push(`w_${Math.round(width)}`);
    if (height) transforms.push(`h_${Math.round(height)}`);
  }

  return `${base}/upload/${transforms.join(",")}/${rest}`;
}

export default function ProductDetailsClient({ product }: { product: Product }) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [zoom, setZoom] = useState(1);

  const previewImage = useMemo(
    () =>
      getOptimizedProductImage(product.image, {
        width: 1100,
        height: 1100,
        mode: "limit",
        quality: "auto:good",
      }),
    [product.image]
  );

  const viewerImage = useMemo(
    () =>
      getOptimizedProductImage(product.image, {
        quality: "auto:best",
      }),
    [product.image]
  );

  useEffect(() => {
    if (!viewerOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setViewerOpen(false);
        return;
      }

      if (event.key === "+" || event.key === "=") {
        setZoom((prev) => Math.min(prev + 0.25, 4));
      }

      if (event.key === "-") {
        setZoom((prev) => Math.max(prev - 0.25, 1));
      }

      if (event.key === "0") {
        setZoom(1);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [viewerOpen]);

  function openViewer() {
    if (!viewerImage) return;
    setZoom(1);
    setViewerOpen(true);
  }

  function zoomIn() {
    setZoom((prev) => Math.min(prev + 0.25, 4));
  }

  function zoomOut() {
    setZoom((prev) => Math.max(prev - 0.25, 1));
  }

  return (
    <>
      <div className="min-h-screen bg-white p-3 md:p-6">
        <div className="mx-auto max-w-[1180px]">
          <div className="mb-4">
            <Link
              href="/dashboard/products"
              className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.2em] text-[#A7A093] transition-colors hover:text-[#C5A267]"
            >
              <ChevronLeft size={12} />
              Back to products
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
            <div className="space-y-3">
              <button
                type="button"
                onClick={openViewer}
                className="group relative block aspect-square w-full overflow-hidden rounded-[28px] border border-[#EEE7DB] bg-[#F8F6F2] text-left shadow-[0_12px_38px_rgba(17,17,17,0.04)]"
              >
                {previewImage ? (
                  <img
                    src={previewImage}
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    loading="eager"
                    decoding="async"
                    fetchPriority="high"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-[#D7D0C5]">
                    <ImageIcon size={34} />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">
                      No Preview
                    </span>
                  </div>
                )}

                {previewImage ? (
                  <div className="absolute inset-x-4 bottom-4 flex items-center justify-between rounded-full border border-white/70 bg-white/88 px-3 py-2 text-[10px] font-semibold text-[#4E493F] shadow-sm backdrop-blur">
                    <span className="inline-flex items-center gap-2 uppercase tracking-[0.16em] text-[#A88449]">
                      <ScanSearch size={13} />
                      Click to view full image
                    </span>
                    <span className="text-[#7D7568]">Original view</span>
                  </div>
                ) : null}
              </button>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[22px] border border-[#EEE7DB] bg-[#FBFAF8] p-3.5">
                  <div className="mb-1 flex items-center gap-2 text-[#B3AA9C]">
                    <Ruler size={13} />
                    <span className="text-[8px] font-bold uppercase tracking-[0.18em]">
                      Thickness
                    </span>
                  </div>
                  <p className="text-[15px] font-semibold text-[#1A1A1A]">
                    {product.thicknessMm ?? "-"}
                    {product.thicknessMm != null ? (
                      <span className="ml-1 text-[10px] font-medium text-[#9D968A]">mm</span>
                    ) : null}
                  </p>
                </div>

                <div className="rounded-[22px] border border-[#EEE7DB] bg-[#FBFAF8] p-3.5">
                  <div className="mb-1 flex items-center gap-2 text-[#B3AA9C]">
                    <Layers size={13} />
                    <span className="text-[8px] font-bold uppercase tracking-[0.18em]">
                      Sizes
                    </span>
                  </div>
                  <p className="text-[15px] font-semibold text-[#1A1A1A]">
                    {product.variants.length}
                    <span className="ml-1 text-[10px] font-medium text-[#9D968A]">available</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="min-w-0 rounded-[30px] border border-[#EEE7DB] bg-white p-4 shadow-[0_12px_38px_rgba(17,17,17,0.03)] md:p-6">
              <div className="mb-5 border-b border-[#F3EEE6] pb-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#FAF3E6] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-[#C5A267]">
                    {product.collection || "Fusion"}
                  </span>
                  <span className="rounded-full border border-[#EEE7DB] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#8C8478]">
                    {product.stoneType || "Natural Stone"}
                  </span>
                </div>

                <h1 className="text-[24px] font-serif italic leading-tight tracking-tight text-[#1A1A1A] md:text-[30px]">
                  {product.name}
                </h1>
                <p className="mt-1 text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-[#AAA294]">
                  {product.sku}
                </p>
              </div>

              <div>
                <div className="mb-3 flex items-center gap-2">
                  <h2 className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#1A1A1A]">
                    Available Dimensions
                  </h2>
                  <span className="h-px flex-1 bg-[#F3EEE6]" />
                </div>

                {product.variants.length === 0 ? (
                  <div className="rounded-[22px] border border-dashed border-[#EAE3D9] bg-[#FCFBF9] px-4 py-8 text-center text-[12px] text-[#A29A8E]">
                    No active sizes available.
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-[24px] border border-[#F0EBE3]">
                    <div className="grid grid-cols-[minmax(0,1fr)_120px_28px] border-b border-[#F3EEE6] bg-[#FBFAF8] px-4 py-2 text-[8px] font-bold uppercase tracking-[0.18em] text-[#9A927F]">
                      <div>Size Label</div>
                      <div>Dimensions</div>
                      <div />
                    </div>

                    <div className="divide-y divide-[#F5F1EB]">
                      {product.variants.map((variant) => (
                        <div
                          key={variant.id}
                          className="grid grid-cols-[minmax(0,1fr)_120px_28px] items-center px-4 py-2.5 transition hover:bg-[#FCFBF9]"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-[12px] font-semibold text-[#1A1A1A]">
                              {variant.sizeLabel || "Standard"}
                            </p>
                            <p className="mt-0.5 text-[9px] uppercase tracking-[0.1em] text-[#AAA294]">
                              Premium surface option
                            </p>
                          </div>

                          <div className="text-[11px] font-medium text-[#524C43]">
                            {(variant.widthMm ?? 0).toString().replace(/\.0$/, "")} ×{" "}
                            {(variant.heightMm ?? 0).toString().replace(/\.0$/, "")}
                            <span className="ml-1 text-[9px] text-[#A59D90]">mm</span>
                          </div>

                          <div className="flex justify-end text-[#C5A267]">
                            <ChevronRight size={12} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-5 border-t border-[#F6F1EA] pt-4 text-[10px] leading-5 text-[#9E968A]">
                * Natural stone surfaces may have shade and texture variation across slabs.
              </div>
            </div>
          </div>
        </div>
      </div>

      {viewerOpen && viewerImage ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setViewerOpen(false)}
        >
          <div
            className="relative w-full max-w-[96vw] overflow-hidden rounded-[28px] border border-white/10 bg-[#0B0B0B] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
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
                onClick={() => setZoom(1)}
                className="inline-flex h-9 min-w-[52px] items-center justify-center rounded-full border border-white/10 bg-black/45 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur transition hover:bg-black/65"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setViewerOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/45 text-white backdrop-blur transition hover:bg-black/65"
              >
                <X size={16} />
              </button>
            </div>

            <div className="max-h-[88vh] min-h-[60vh] w-full overflow-auto bg-black px-4 py-12">
              <div className="flex min-h-full min-w-full items-center justify-center">
                <img
                  src={viewerImage}
                  alt={product.name}
                  className="block h-auto w-auto max-h-[78vh] max-w-[88vw] object-contain transition-transform duration-300"
                  style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>

            <div className="border-t border-white/10 bg-[#0B0B0B] px-4 py-3 text-white">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#D2B27A]">
                    {product.collection || "Fusion"}
                  </div>
                  <h3 className="truncate text-[16px] font-semibold tracking-tight">
                    {product.name}
                  </h3>
                  <p className="text-[11px] text-white/60">{product.sku}</p>
                </div>

                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-white/75">
                  <ZoomIn size={14} />
                  View fits screen by default · use + / -
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}