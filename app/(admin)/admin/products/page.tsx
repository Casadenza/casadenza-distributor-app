import Link from "next/link";
import { prisma } from "@/lib/db";
import ProductsTable from "./products-table";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: {
      id: true,
      sku: true,
      name: true,
      image: true,
      collection: true,
      stoneType: true,
      thicknessMm: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      variants: { select: { id: true } },
    },
  });

  const rows = products.map((p) => ({
    ...p,
    variantsCount: p.variants.length,
  }));

  return (
    <div className="max-w-[1400px] mx-auto pt-6 pb-20 px-6 space-y-6">
      {/* Refined Dark Banner (Height Reduced) */}
      <div className="relative overflow-hidden bg-[#1A1A1A] rounded-[32px] p-6 flex flex-col md:flex-row items-center justify-between gap-6 border border-white/5 shadow-xl">
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#C5A267]/10 blur-[80px] -mr-24 -mt-24 rounded-full"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-[1px] w-6 bg-[#C5A267]"></div>
            <span className="text-[8px] font-bold uppercase tracking-[0.4em] text-[#C5A267]">Digital Atelier</span>
          </div>
          <h1 className="text-2xl font-serif italic text-white leading-none">Master Inventory</h1>
        </div>

        <div className="relative z-10">
          <Link
            href="/admin/products/new"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#C5A267] text-black text-[10px] font-bold uppercase tracking-widest hover:bg-[#D4B47F] transition-all shadow-lg"
          >
            <Plus size={14} strokeWidth={3} /> Add New Collection
          </Link>
        </div>
      </div>

      <ProductsTable initialRows={rows} />
    </div>
  );
}