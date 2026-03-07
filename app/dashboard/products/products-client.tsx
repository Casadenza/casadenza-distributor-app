"use client";

import { useState, useMemo } from "react";
import { Package, Search, ChevronRight, ImageIcon } from "lucide-react";
import Link from "next/link";

export default function DistributorProductsClient({ products = [] }: { products: any[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [collectionFilter, setCollectionFilter] = useState("Fusion");
  const [stoneFilter, setStoneFilter] = useState("ALL");

  const collections = useMemo(() => {
    const set = new Set(products.map(p => (p.collection || "").trim()).filter(Boolean));
    return ["ALL", ...Array.from(set).sort()];
  }, [products]);

  const stoneTypes = useMemo(() => {
    const set = new Set(products.map(p => (p.stoneType || "").trim()).filter(Boolean));
    return ["ALL", ...Array.from(set).sort()];
  }, [products]);

  const filteredAndSorted = useMemo(() => {
    return products
      .filter((p) => {
        const s = searchQuery.toLowerCase();
        const matchesSearch = p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s);
        const matchesCol = collectionFilter === "ALL" || p.collection === collectionFilter;
        const matchesStone = stoneFilter === "ALL" || p.stoneType === stoneFilter;
        return matchesSearch && matchesCol && matchesStone;
      })
      .sort((a, b) => (a.sku || "").localeCompare((b.sku || ""), undefined, { numeric: true, sensitivity: 'base' }));
  }, [products, searchQuery, collectionFilter, stoneFilter]);

  return (
    <div className="min-h-screen bg-[#FDFDFD] p-4 md:p-8">
      <div className="max-w-[1500px] mx-auto">
        <header className="mb-6">
          <h1 className="text-4xl font-serif italic text-[#1A1A1A] tracking-tight">Veneer Library</h1>
          <p className="text-[#C5A267] text-[9px] font-bold uppercase tracking-[0.3em] mt-1">Exquisite Architectural Surfaces</p>
        </header>

        <div className="flex flex-wrap items-center gap-4 border-b border-[#EEE] pb-6 mb-8">
          <div className="relative flex-1 min-w-[250px] group">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 text-[#AAA]" size={16} />
            <input 
              type="text" 
              placeholder="Search SKU (e.g. CST 01)..." 
              className="w-full pl-7 pr-4 py-2 text-sm outline-none bg-transparent font-light"
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <select className="text-[10px] font-bold uppercase tracking-widest bg-white px-4 py-2 rounded-full border border-[#EEE] outline-none" value={collectionFilter} onChange={(e) => setCollectionFilter(e.target.value)}>
              {collections.map(c => <option key={c} value={c}>{c === "ALL" ? "All Collections" : c}</option>)}
            </select>
            <select className="text-[10px] font-bold uppercase tracking-widest bg-white px-4 py-2 rounded-full border border-[#EEE] outline-none" value={stoneFilter} onChange={(e) => setStoneFilter(e.target.value)}>
              {stoneTypes.map(s => <option key={s} value={s}>{s === "ALL" ? "All Stone Types" : s}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-x-6 gap-y-10">
          {filteredAndSorted.map((p) => (
            <Link href={`/dashboard/products/${p.id}`} key={p.id} className="group flex flex-col no-underline">
              <div className="relative aspect-square bg-white rounded-[24px] border border-[#F0F0F0] overflow-hidden transition-all duration-500 group-hover:shadow-md group-hover:border-[#C5A267]/30 group-hover:-translate-y-1">
                
                {/* SKU ID Tag */}
                <div className="absolute top-3 left-3 z-20">
                   <p className="text-[8px] font-mono font-bold text-[#1A1A1A] bg-white/90 backdrop-blur-md px-2 py-0.5 rounded-full border border-[#EEE] shadow-sm">
                    {p.sku}
                   </p>
                </div>

                {/* ✅ ACTUAL IMAGE LOGIC ADDED HERE */}
                <div className="absolute inset-0 z-10">
                  {p.image ? (
                    <img 
                      src={p.image} 
                      alt={p.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-50">
                      <ImageIcon size={24} className="text-zinc-200" />
                    </div>
                  )}
                </div>

                <div className="absolute inset-0 flex items-center justify-center opacity-[0.05] group-hover:opacity-[0.1] transition-opacity">
                  <Package size={40} strokeWidth={0.5} />
                </div>
              </div>

              <div className="mt-3 px-1">
                <p className="text-[8px] font-bold text-[#C5A267] uppercase tracking-[0.15em] mb-0.5">
                  {p.collection || "Stone"}
                </p>
                <div className="flex justify-between items-center">
                  <h3 className="text-[13px] font-medium text-[#1A1A1A] truncate tracking-tight group-hover:text-[#C5A267] transition-colors">
                    {p.name}
                  </h3>
                  <ChevronRight size={12} className="text-[#DDD] group-hover:text-[#C5A267] transition-all" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {filteredAndSorted.length === 0 && (
          <div className="text-center py-20 text-gray-400 font-serif italic">No products found.</div>
        )}
      </div>
    </div>
  );
}