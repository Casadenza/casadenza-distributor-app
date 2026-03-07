"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, Package, BadgeDollarSign, FileUp, 
  ShoppingCart, FileText, GraduationCap, Palette, 
  Users, LifeBuoy, ExternalLink, ChevronRight 
} from "lucide-react";

function NavItem({ href, title, desc, icon: Icon }: { href: string; title: string; desc: string; icon: any }) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`group flex items-start gap-3 px-4 py-3 rounded-2xl transition-all duration-300 ${
        isActive 
          ? "bg-[#1A1A1A] text-white shadow-lg shadow-zinc-200" 
          : "hover:bg-[#F8F8F8] text-zinc-600 hover:text-black"
      }`}
    >
      <div className={`mt-0.5 p-1.5 rounded-lg ${isActive ? "text-[#C5A267]" : "text-zinc-400 group-hover:text-[#C5A267] transition-colors"}`}>
        <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-[13px] font-bold tracking-tight ${isActive ? "text-white" : "text-zinc-800"}`}>
          {title}
        </div>
        <div className={`text-[10px] truncate leading-tight mt-0.5 ${isActive ? "text-zinc-400" : "text-zinc-400"}`}>
          {desc}
        </div>
      </div>
      {isActive && <ChevronRight size={14} className="text-[#C5A267] mt-2 animate-in slide-in-from-left-2" />}
    </Link>
  );
}

export default function AdminSideNav() {
  return (
    <aside className="w-[300px] border-r border-[#EEE] bg-white min-h-screen sticky top-0 flex flex-col">
      <div className="p-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="h-[1px] w-6 bg-[#C5A267]"></div>
          <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-[#C5A267]">Atelier</span>
        </div>
        <div className="text-xl font-serif italic text-[#1A1A1A] tracking-tight">Casadenza</div>
        <div className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest mt-1">Management Portal</div>
      </div>

      <div className="flex-1 px-4 pb-8 space-y-8 overflow-y-auto custom-scrollbar">
        <div className="space-y-1.5">
          <NavItem href="/dashboard/admin" title="Dashboard" desc="System overview & alerts" icon={LayoutDashboard} />
        </div>

        <div className="space-y-3">
          <div className="px-4 text-[9px] font-bold text-zinc-300 uppercase tracking-[0.2em]">Inventory & Pricing</div>
          <div className="space-y-1">
            <NavItem href="/dashboard/admin/products" title="Products" desc="Master catalog & variants" icon={Package} />
            <NavItem href="/dashboard/admin/prices" title="Price Matrix" desc="Tiered pricing control" icon={BadgeDollarSign} />
            <NavItem href="/dashboard/admin/import-prices" title="Bulk Import" desc="Excel synchronization" icon={FileUp} />
          </div>
        </div>

        <div className="space-y-3">
          <div className="px-4 text-[9px] font-bold text-zinc-300 uppercase tracking-[0.2em]">Operations</div>
          <div className="space-y-1">
            <NavItem href="/dashboard/admin/orders" title="Orders" desc="Track & approve requests" icon={ShoppingCart} />
            <NavItem href="/dashboard/admin/documents" title="Resources" desc="PDFs, specs & catalogs" icon={FileText} />
            <NavItem href="/dashboard/admin/training" title="Academy" desc="Educational modules" icon={GraduationCap} />
            <NavItem href="/dashboard/admin/marketing-toolkit" title="Marketing" desc="Digital assets & creatives" icon={Palette} />
          </div>
        </div>

        <div className="space-y-3">
          <div className="px-4 text-[9px] font-bold text-zinc-300 uppercase tracking-[0.2em]">Partnerships</div>
          <div className="space-y-1">
            <NavItem href="/dashboard/admin/distributors" title="Distributors" desc="Manage partner network" icon={Users} />
            <NavItem href="/dashboard/admin/support" title="Support Desk" desc="SLA & ticket management" icon={LifeBuoy} />
          </div>
        </div>
      </div>

      <div className="p-4 mt-auto border-t border-[#F5F5F5]">
        <Link href="/dashboard" className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-zinc-50 text-zinc-500 hover:text-black hover:bg-zinc-100 transition-all text-[10px] font-bold uppercase tracking-widest border border-[#EEE]">
          <ExternalLink size={14} />
          Distributor View
        </Link>
      </div>
    </aside>
  );
}