import PricesTable from "./prices-table";

export const dynamic = "force-dynamic";

export default async function AdminPricesPage() {
  const tierOptions = ["STANDARD", "GOLD", "PLATINUM"];
  const currencyOptions = ["USD", "EUR", "GBP", "INR", "JPY"];
  const unitOptions = ["SHEET", "SQM", "SQFT"];

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto">
      <div className="flex items-end justify-between border-b border-[#F0EDE8] pb-4">
        <div>
          <h1 className="text-3xl font-serif italic text-[#1A1A1A] tracking-tight">Price Matrix</h1>
          <p className="text-[10px] font-bold text-[#C5A267] uppercase tracking-[0.3em] mt-1">Global Catalog & Economics</p>
        </div>
        <div className="hidden md:block text-right">
           <p className="text-[9px] font-bold text-[#A39E93] uppercase tracking-widest leading-none">Database Status</p>
           <div className="flex items-center gap-1.5 justify-end mt-1">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[11px] font-bold text-[#1A1A1A]">Cloud Sync Active</span>
           </div>
        </div>
      </div>

      <PricesTable
        tierOptions={tierOptions}
        currencyOptions={currencyOptions}
        unitOptions={unitOptions}
      />
    </div>
  );
}