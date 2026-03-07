import NewProductForm from "./new-product-form";

export const dynamic = "force-dynamic";

export default function NewProductPage() {
  return (
    <div className="max-w-4xl mx-auto pt-6 pb-12 px-4">
      <div className="mb-8 border-b border-[#F0F0F0] pb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-[1px] w-10 bg-[#C5A267]"></div>
          <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#C5A267]">
            Atelier Inventory
          </span>
        </div>
        <h1 className="text-3xl font-serif italic text-[#1A1A1A] tracking-tight">
          Create New Surface
        </h1>
        <p className="mt-2 text-[11px] text-zinc-400 font-medium tracking-wide uppercase max-w-md leading-relaxed">
          Define a unique architectural identity for your premium stone collection.
        </p>
      </div>

      <NewProductForm />
    </div>
  );
}