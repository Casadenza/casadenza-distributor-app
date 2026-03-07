import DistributorsTable from "./distributors-table";

export const dynamic = "force-dynamic";

export default function DistributorsPage() {
  return (
    <div className="space-y-4 max-w-[1400px] mx-auto">
      <div className="flex items-end justify-between border-b border-[#F0EDE8] pb-4">
        <div>
          <h1 className="text-3xl font-serif italic text-[#1A1A1A] tracking-tight">Distributor Network</h1>
          <p className="text-[10px] font-bold text-[#C5A267] uppercase tracking-[0.3em] mt-1">Authorized Global Partners</p>
        </div>
        <div className="hidden md:block text-right">
           <p className="text-[9px] font-bold text-[#A39E93] uppercase tracking-widest leading-none">Access Level</p>
           <div className="flex items-center gap-1.5 justify-end mt-1">
              <span className="text-[11px] font-bold text-[#1A1A1A]">Master Administrative Control</span>
           </div>
        </div>
      </div>
      <DistributorsTable />
    </div>
  );
}