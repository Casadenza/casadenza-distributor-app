import Link from "next/link";
import { prisma } from "@/lib/db";
import { 
  ArrowUpRight, Package, Users, BadgeDollarSign, 
  Sparkles, GraduationCap, Palette, 
  Calculator, Files, LifeBuoy, Clock 
} from "lucide-react";

// --- CLASSIC COMPACT METRIC ---
function SlimMetric({ label, value, sub, isGold }: any) {
  return (
    <div className={`px-5 py-4 rounded-xl border ${
      isGold ? 'bg-[#1A1A1A] border-[#1A1A1A] text-white' : 'bg-white border-[#EAE7E2]'
    } flex items-center justify-between`}>
      <div className="flex flex-col gap-0.5">
        <span className={`text-[8px] font-bold uppercase tracking-[0.2em] ${isGold ? 'text-[#C5A267]' : 'text-[#A39E93]'}`}>
          {label}
        </span>
        <div className="text-2xl font-serif italic tracking-tight">{value}</div>
      </div>
      <div className={`text-[8px] font-bold uppercase tracking-widest ${isGold ? 'text-white/40' : 'text-[#C5A267]'}`}>
        {sub}
      </div>
    </div>
  );
}

// --- CLASSIC ACTION CARD ---
function SlimAction({ title, desc, href, icon: Icon }: any) {
  return (
    <Link href={href} className="group flex items-center justify-between p-4 bg-white border border-[#EAE7E2] rounded-2xl transition-all hover:border-[#1A1A1A] hover:bg-[#FAF9F6]">
      <div className="flex items-center gap-4">
        <div className="h-9 w-9 bg-[#FAF9F6] border border-[#F0EDE8] flex items-center justify-center text-[#A39E93] group-hover:bg-[#1A1A1A] group-hover:text-[#C5A267] transition-all duration-300">
          <Icon size={16} strokeWidth={1.5} />
        </div>
        <div>
          <h3 className="text-[13px] font-bold text-[#1A1A1A] tracking-tight">{title}</h3>
          <p className="text-[10px] text-[#A39E93] font-medium leading-none mt-1">{desc}</p>
        </div>
      </div>
      <ArrowUpRight size={14} className="text-[#EAE7E2] group-hover:text-[#1A1A1A] transition-all" />
    </Link>
  );
}

export default async function AdminDashboard() {
  const products = await prisma.product.count().catch(() => 0);
  const distributors = await prisma.user.count({ where: { role: 'DISTRIBUTOR' } }).catch(() => 0);
  const orders = await (prisma as any).order?.count().catch(() => 0) || 0; // New Order Count Logic
  
  const prices = await (prisma as any).priceMatrix?.count().catch(() => 0) 
                 || await (prisma as any).price?.count().catch(() => 0) 
                 || 0;

  return (
    <div className="max-w-[1100px] mx-auto space-y-10">
      
      {/* Classic Header */}
      <div className="border-b border-[#F0EDE8] pb-6">
        <h1 className="text-3xl font-serif italic text-[#1A1A1A] tracking-tight">Atelier Terminal</h1>
        <div className="flex items-center gap-2 mt-1">
          <div className="h-1 w-1 rounded-full bg-[#C5A267]" />
          <p className="text-[9px] font-bold text-[#A39E93] uppercase tracking-[0.4em]">Executive Control</p>
        </div>
      </div>

      {/* Grid: 3 Compact Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SlimMetric label="Inventory" value={products} sub="SKUs" isGold />
        <SlimMetric label="Pipeline" value={orders} sub="Orders" />
        <SlimMetric label="Network" value={distributors} sub="Partners" />
      </div>

      {/* Control Modules Section */}
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <span className="text-[8px] font-extrabold uppercase tracking-[0.4em] text-[#B5B0A4]">System Logic</span>
          <div className="h-[1px] flex-1 bg-[#F0EDE8]" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Main Action Modules */}
          <SlimAction title="Orders Hub" desc="Order Pipeline & Status" href="/admin/orders" icon={Clock} />
          <SlimAction title="Products" desc="Catalog Management" href="/admin/products" icon={Package} />
          <SlimAction title="Price Matrix" desc="Pricing Tiers" href="/admin/prices" icon={BadgeDollarSign} />
          <SlimAction title="Distributors" desc="Partner Accounts" href="/admin/distributors" icon={Users} />
          <SlimAction title="New Arrivals" desc="Sparkle Management" href="/admin/new-arrivals" icon={Sparkles} />
          <SlimAction title="Training" desc="Academy Hub" href="/admin/training" icon={GraduationCap} />
          <SlimAction title="Marketing" desc="Toolkit Assets" href="/admin/marketing-toolkit" icon={Palette} />
          <SlimAction title="Documents" desc="Official Resources" href="/admin/documents" icon={Files} />
          <SlimAction title="Calculator" desc="Packing Engine" href="/admin/packing-calculator" icon={Calculator} />
          <SlimAction title="Support" desc="Help Desk" href="/admin/support" icon={LifeBuoy} />
        </div>
      </div>
    </div>
  );
}