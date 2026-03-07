"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, Package, Zap, Users, Clock, 
  Files, GraduationCap, Palette, LifeBuoy, 
  Calculator, Sparkles, ChevronRight 
} from "lucide-react";

const NAV = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Products", href: "/admin/products", icon: Package },
  { label: "Price & Schemes", href: "/admin/prices", icon: Zap },
  { label: "Distributors", href: "/admin/distributors", icon: Users },
  { label: "Orders Hub", href: "/admin/orders", icon: Clock },
  { label: "Documents", href: "/admin/documents", icon: Files },
  { label: "Training Hub", href: "/admin/training", icon: GraduationCap },
  { label: "Marketing Tool", href: "/admin/marketing-toolkit", icon: Palette },
  { label: "New Arrivals", href: "/admin/new-arrivals", icon: Sparkles },
  { label: "Calc Settings", href: "/admin/packing-calculator", icon: Calculator },
  { label: "Support Desk", href: "/admin/support", icon: LifeBuoy },
];

export default function AdminSideNav() {
  const pathname = usePathname();

  return (
    <aside className="w-[260px] shrink-0 border-r border-[#EAE7E2] bg-[#FAF9F6] flex flex-col h-screen sticky top-0 overflow-hidden font-sans">
      
      {/* (F) FREEZE SECTION: Brand Section with Path Persistence Fix */}
      <div className="p-6 pb-2 shrink-0">
        <Link href="/admin" className="flex flex-col items-start gap-1.5 group outline-none w-full">
          <div className="h-8 w-full flex items-center">
            <img 
              src="/casadenza-logo.png" 
              alt="Casadenza" 
              className="h-full w-auto object-contain object-left transition-transform group-hover:scale-[1.01]"
              onError={(e) => {
                const target = e.currentTarget;
                if (target.src.includes('casadenza-logo.png')) {
                   target.src = "/brand/casadenza-logo.png";
                }
              }} 
            />
          </div>
          <div className="flex items-center gap-2 mt-1 px-0.5">
            <div className="h-1 w-1 rounded-full bg-[#C5A267]" />
            <span className="text-[9px] font-bold text-[#1A1A1A] uppercase tracking-[0.3em]">Admin Portal</span>
          </div>
        </Link>
        
        {/* Note: Membership Card (X marked area) has been removed from here */}
      </div>

      {/* (S) SCROLL SECTION: Navigation Links */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto pt-4 pb-10 custom-scrollbar">
        {NAV.map((item) => {
          const active = pathname === item.href || (item.href !== "/admin" && pathname?.startsWith(item.href + "/"));
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-[12px] font-medium transition-all duration-300 ${
                active 
                  ? "bg-[#1A1A1A] text-white shadow-md shadow-black/10" 
                  : "text-[#6B665C] hover:bg-white hover:text-[#1A1A1A]"
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon 
                  size={15} 
                  strokeWidth={active ? 2 : 1.5} 
                  className={active ? "text-[#C5A267]" : "text-[#A39E93] group-hover:text-[#C5A267]"} 
                />
                <span className="tracking-tight">{item.label}</span>
              </div>
              {active && <ChevronRight size={12} className="text-[#C5A267]" />}
            </Link>
          );
        })}
      </nav>

      {/* FOOTER: Fixed at bottom like Distributor SideNav */}
      <div className="p-6 border-t border-[#F0EDE8] shrink-0">
        <p className="text-[8px] font-bold text-[#B5B0A4] uppercase tracking-[0.3em] italic">
          © 2026 Casadenza Atelier
        </p>
      </div>
    </aside>
  );
}