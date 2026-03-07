import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { Package, ChevronLeft, Ruler, Layers, ArrowRight, ImageIcon } from "lucide-react";
import Link from "next/link";

export default async function ProductDetailsPage({ params }: { params: { id: string } }) {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: {
      variants: {
        where: { isActive: true },
        orderBy: { widthMm: "asc" }
      }
    }
  });

  if (!product) notFound();

  return (
    <div className="min-h-screen bg-white p-3 md:p-6">
      <div className="max-w-[1000px] mx-auto">
        
        {/* Navigation */}
        <div className="mb-4">
          <Link href="/dashboard/products" className="inline-flex items-center text-[9px] font-bold uppercase tracking-widest text-[#BBB] hover:text-[#C5A267] transition-colors">
            <ChevronLeft size={12} className="mr-0.5" /> Back
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: Compact Image Preview */}
          <div className="md:col-span-5 lg:col-span-4">
            <div className="relative aspect-square bg-[#FAFAFA] rounded-[24px] border border-[#F0F0F0] overflow-hidden">
              
              {/* IMAGE DISPLAY */}
              <div className="absolute inset-0 flex items-center justify-center">
                {product.image ? (
                  <img 
                    src={product.image} 
                    alt={product.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <ImageIcon size={32} className="text-[#EEE]" />
                    <span className="text-[10px] text-[#DDD] font-medium uppercase tracking-tighter">No Preview</span>
                  </div>
                )}
              </div>

              {/* ✅ PURANA PACKAGE ICON (SHADOW/WATERMARK) DELETE KAR DIYA HAI */}
            </div>
          </div>

          {/* RIGHT: Details Content */}
          <div className="md:col-span-7 lg:col-span-8 flex flex-col pt-2">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[9px] font-bold text-[#C5A267] uppercase tracking-[0.2em]">{product.collection || "Fusion"}</span>
                <span className="h-1 w-1 rounded-full bg-[#EEE]"></span>
                <span className="text-[9px] font-medium text-[#AAA] uppercase tracking-widest">{product.stoneType || "Natural Stone"}</span>
              </div>
              <h1 className="text-3xl font-serif italic text-[#1A1A1A] leading-tight mb-1">{product.name}</h1>
              <p className="text-[10px] font-mono font-bold text-[#AAA] tracking-tighter uppercase">{product.sku}</p>
            </div>

            {/* Specs */}
            <div className="grid grid-cols-2 gap-3 mb-8">
              <div className="p-3 bg-[#FBFBFB] rounded-2xl border border-[#F5F5F5]">
                <div className="flex items-center gap-2 mb-1 text-[#BBB]">
                  <Ruler size={12} />
                  <span className="text-[8px] font-bold uppercase tracking-wider">Thickness</span>
                </div>
                <p className="text-sm font-medium text-[#1A1A1A]">{product.thicknessMm} <span className="text-[10px] text-[#AAA] ml-0.5">mm</span></p>
              </div>
              <div className="p-3 bg-[#FBFBFB] rounded-2xl border border-[#F5F5F5]">
                <div className="flex items-center gap-2 mb-1 text-[#BBB]">
                  <Layers size={12} />
                  <span className="text-[8px] font-bold uppercase tracking-wider">Options</span>
                </div>
                <p className="text-sm font-medium text-[#1A1A1A]">{product.variants.length} <span className="text-[10px] text-[#AAA] ml-0.5">Sizes</span></p>
              </div>
            </div>

            {/* Dimensions */}
            <div>
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1A1A1A] mb-4 flex items-center gap-2">
                Available Dimensions
                <span className="flex-1 h-[1px] bg-[#F5F5F5]"></span>
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {product.variants.map((v) => (
                  <div key={v.id} className="flex items-center justify-between p-3 bg-white border border-[#F3F3F3] rounded-xl hover:border-[#C5A267]/30 transition-all hover:shadow-sm cursor-pointer group">
                    <div>
                      <h4 className="text-[13px] font-medium text-[#1A1A1A]">
                        {v.widthMm} x {v.heightMm} <span className="text-[10px] text-[#BBB] ml-0.5 font-light">mm</span>
                      </h4>
                      <p className="text-[8px] text-[#AAA] font-light tracking-tighter uppercase">{v.sizeLabel || "Standard"}</p>
                    </div>
                    <ArrowRight size={12} className="text-[#EEE] group-hover:text-[#C5A267] transition-all transform group-hover:translate-x-0.5" />
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#F9F9F9]">
              <p className="text-[8px] leading-tight text-[#BBB] italic">
                * Natural stone surfaces feature unique color and texture variations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}