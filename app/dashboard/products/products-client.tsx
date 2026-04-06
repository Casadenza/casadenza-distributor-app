"use client";

import { useMemo, useState } from "react";
import { Search, ChevronRight, ImageIcon, SlidersHorizontal } from "lucide-react";
import Link from "next/link";

type Product = {
  id: string;
  sku: string;
  name: string;
  image?: string | null;
  collection?: string | null;
  stoneType?: string | null;
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
  const mode = options?.mode ?? "fill";
  const quality = options?.quality ?? "auto:eco";

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

export default function DistributorProductsClient({ products = [] }: { products: Product[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [collectionFilter, setCollectionFilter] = useState("Fusion");
  const [stoneFilter, setStoneFilter] = useState("ALL");

  const collections = useMemo(() => {
    const values = Array.from(
      new Set(products.map((p) => (p.collection || "").trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));

    const withoutFusion = values.filter((value) => value !== "Fusion");
    const ordered = values.includes("Fusion") ? ["Fusion", ...withoutFusion] : values;

    return ["ALL", ...ordered];
  }, [products]);

  const stoneTypes = useMemo(() => {
    const values = Array.from(
      new Set(products.map((p) => (p.stoneType || "").trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));

    return ["ALL", ...values];
  }, [products]);

  const filteredAndSorted = useMemo(() => {
    return products
      .filter((p) => {
        const search = searchQuery.trim().toLowerCase();

        const matchesSearch =
          !search ||
          (p.name || "").toLowerCase().includes(search) ||
          (p.sku || "").toLowerCase().includes(search) ||
          (p.collection || "").toLowerCase().includes(search) ||
          (p.stoneType || "").toLowerCase().includes(search);

        const matchesCollection =
          collectionFilter === "ALL" || (p.collection || "") === collectionFilter;

        const matchesStone =
          stoneFilter === "ALL" || (p.stoneType || "") === stoneFilter;

        return matchesSearch && matchesCollection && matchesStone;
      })
      .sort((a, b) =>
        (a.sku || "").localeCompare(b.sku || "", undefined, {
          numeric: true,
          sensitivity: "base",
        })
      );
  }, [products, searchQuery, collectionFilter, stoneFilter]);

  return (
    <div className="min-h-screen bg-[#FDFDFD]">
      <div className="mx-auto max-w-[1500px] px-4 pb-6 md:px-8">
        <div className="sticky top-0 z-30 -mx-4 border-b border-[#EEE8DE] bg-[#FDFDFD]/95 px-4 pb-3 pt-2 backdrop-blur md:-mx-8 md:px-8 md:pt-3">
          <header className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-[26px] font-serif italic tracking-tight text-[#1A1A1A] md:text-[32px]">
                Veneer Library
              </h1>
              <p className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.26em] text-[#C5A267]">
                Exquisite Architectural Surfaces
              </p>
            </div>

            <div className="inline-flex h-8 items-center gap-2 self-start rounded-full border border-[#ECE6DB] bg-white px-3 text-[10px] font-semibold text-[#6C655B] shadow-sm">
              <SlidersHorizontal size={12} className="text-[#B79A67]" />
              {filteredAndSorted.length} Products
            </div>
          </header>

          <div className="mt-3 grid grid-cols-1 gap-2.5 lg:grid-cols-[minmax(0,1fr)_190px_190px]">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A9A39A]"
                size={14}
              />
              <input
                type="text"
                value={searchQuery}
                placeholder="Search SKU, product, collection"
                className="h-9 w-full rounded-2xl border border-[#E9E4DB] bg-white pl-9 pr-4 text-[12px] text-[#1A1A1A] outline-none transition placeholder:text-[#B8B2A8] focus:border-[#D4C2A0]"
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <select
              className="h-9 rounded-2xl border border-[#E9E4DB] bg-white px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5E584F] outline-none transition focus:border-[#D4C2A0]"
              value={collectionFilter}
              onChange={(e) => setCollectionFilter(e.target.value)}
            >
              {collections.map((collection) => (
                <option key={collection} value={collection}>
                  {collection === "ALL" ? "All Collections" : collection}
                </option>
              ))}
            </select>

            <select
              className="h-9 rounded-2xl border border-[#E9E4DB] bg-white px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5E584F] outline-none transition focus:border-[#D4C2A0]"
              value={stoneFilter}
              onChange={(e) => setStoneFilter(e.target.value)}
            >
              {stoneTypes.map((stone) => (
                <option key={stone} value={stone}>
                  {stone === "ALL" ? "All Stone Types" : stone}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="pt-5">
          {filteredAndSorted.length === 0 ? (
            <div className="rounded-[26px] border border-dashed border-[#E8E3DA] bg-white px-6 py-16 text-center text-[12px] text-[#9E978C]">
              No products found.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
              {filteredAndSorted.map((product, index) => {
                const image = getOptimizedProductImage(product.image, {
                  width: 520,
                  height: 520,
                  mode: "fill",
                  quality: "auto:eco",
                });

                return (
                  <Link
                    href={`/dashboard/products/${product.id}`}
                    key={product.id}
                    prefetch={false}
                    className="group flex flex-col overflow-hidden rounded-[24px] border border-[#EEE8DE] bg-white shadow-[0_6px_22px_rgba(17,17,17,0.03)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#D7C29B] hover:shadow-[0_14px_35px_rgba(17,17,17,0.06)]"
                  >
                    <div className="relative aspect-square overflow-hidden bg-[#F8F6F2]">
                      <div className="absolute left-3 top-3 z-20 rounded-full border border-white/80 bg-white/95 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.16em] text-[#575149] shadow-sm backdrop-blur">
                        {product.sku}
                      </div>

                      {image ? (
                        <img
                          src={image}
                          alt={product.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                          loading={index < 8 ? "eager" : "lazy"}
                          decoding="async"
                          fetchPriority={index < 4 ? "high" : "auto"}
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-[#FAFAFA] text-[#D8D3CB]">
                          <ImageIcon size={24} />
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5 p-3">
                      <p className="truncate text-[8px] font-bold uppercase tracking-[0.18em] text-[#C5A267]">
                        {product.collection || "Fusion"}
                      </p>

                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="truncate text-[13px] font-semibold tracking-tight text-[#1A1A1A] transition-colors group-hover:text-[#A88449]">
                            {product.name}
                          </h3>
                          <p className="truncate text-[10px] text-[#9A9388]">
                            {product.stoneType || "Natural Stone"}
                          </p>
                        </div>

                        <ChevronRight
                          size={13}
                          className="shrink-0 text-[#C8C1B6] transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-[#A88449]"
                        />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}