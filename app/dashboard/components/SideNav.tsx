"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Home,
  Layers,
  Zap,
  PlusCircle,
  Clock,
  Files,
  GraduationCap,
  Palette,
  Calculator,
  Sparkles,
  ChevronRight,
} from "lucide-react";

const NAV = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Products", href: "/dashboard/products", icon: Layers },
  { label: "Price & Schemes", href: "/dashboard/price-schemes", icon: Zap },
  { label: "Place Order", href: "/dashboard/place-order", icon: PlusCircle },
  { label: "My Orders", href: "/dashboard/my-orders", icon: Clock },
  { label: "New Arrivals", href: "/dashboard/new-arrivals", icon: Sparkles },
  { label: "Documents", href: "/dashboard/documents", icon: Files },
  { label: "Training", href: "/dashboard/training", icon: GraduationCap },
  { label: "Marketing Toolkit", href: "/dashboard/marketing-toolkit", icon: Palette },
  { label: "Packing Calculator", href: "/dashboard/packing-calculator", icon: Calculator },
];

export default function SideNav({
  tier,
  latestDocumentAt,
}: {
  tier: string;
  latestDocumentAt?: string | null;
}) {
  const pathname = usePathname();
  const [showDocBadge, setShowDocBadge] = useState(false);

  useEffect(() => {
    if (!latestDocumentAt) {
      setShowDocBadge(false);
      return;
    }

    const latest = new Date(latestDocumentAt).getTime();
    const seen = Number(window.localStorage.getItem("casadenza-documents-last-seen") || 0);

    if (pathname === "/dashboard/documents") {
      window.localStorage.setItem("casadenza-documents-last-seen", String(latest));
      setShowDocBadge(false);
      return;
    }

    setShowDocBadge(Number.isFinite(latest) && latest > seen);
  }, [latestDocumentAt, pathname]);

  const membershipWidth = useMemo(() => {
    const t = tier.toUpperCase();
    if (t === "PLATINUM") return "95%";
    if (t === "GOLD") return "85%";
    return "55%";
  }, [tier]);

  return (
    <aside className="w-[260px] shrink-0 border-r border-[#EAE7E2] bg-[#FAF9F6] flex flex-col h-screen sticky top-0 overflow-hidden font-sans">
      <div className="p-6 pb-2">
        <Link href="/dashboard" className="flex flex-col items-start gap-1.5 group outline-none w-full">
          <div className="h-8 w-full flex items-center">
            <img
              src="/casadenza-logo.png"
              alt="Casadenza"
              className="h-full w-auto object-contain object-left transition-transform group-hover:scale-[1.01]"
              onError={(e) => {
                const target = e.currentTarget;
                if (target.src.includes("casadenza-logo.png")) {
                  target.src = "/brand/casadenza-logo.png";
                }
              }}
            />
          </div>
          <div className="flex items-center gap-2 mt-1 px-0.5">
            <div className="h-1 w-1 rounded-full bg-[#C5A267]" />
            <span className="text-[9px] font-bold text-[#1A1A1A] uppercase tracking-[0.3em]">Distributor Portal</span>
          </div>
        </Link>

        <div className="mt-8 bg-white border border-[#EAE7E2] rounded-[24px] p-5 shadow-sm relative overflow-hidden group">
          <div className="relative z-10">
            <span className="text-[8px] font-bold text-[#A39E93] uppercase tracking-[0.2em]">Membership Level</span>
            <h3 className="text-lg font-light italic text-[#1A1A1A] mt-0.5 tracking-tight uppercase">{tier}</h3>

            <div className="mt-4 h-[2px] w-full bg-[#F0EDE8] rounded-full overflow-hidden">
              <div className="h-full bg-[#C5A267] rounded-full transition-all duration-1000" style={{ width: membershipWidth }} />
            </div>
          </div>
          <div className="absolute -right-4 -top-4 opacity-[0.03] text-[#1A1A1A] rotate-12">
            <Zap size={80} />
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto pt-4 custom-scrollbar">
        {NAV.map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href + "/"));
          const isDocuments = item.href === "/dashboard/documents";
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-[12px] font-medium transition-all duration-300 ${
                active ? "bg-[#1A1A1A] text-white shadow-md shadow-black/10" : "text-[#6B665C] hover:bg-white hover:text-[#1A1A1A]"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <item.icon size={15} strokeWidth={active ? 2 : 1.5} className={active ? "text-[#C5A267]" : "text-[#A39E93] group-hover:text-[#C5A267]"} />
                <span className="tracking-tight truncate">{item.label}</span>
                {isDocuments && showDocBadge ? (
                  <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#C5A267] px-1.5 text-[9px] font-bold text-white">
                    +1
                  </span>
                ) : null}
              </div>
              {active && <ChevronRight size={12} className="text-[#C5A267]" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-6 border-t border-[#F0EDE8]">
        <p className="text-[8px] font-bold text-[#B5B0A4] uppercase tracking-[0.3em] italic">© 2026 Casadenza Atelier</p>
      </div>
    </aside>
  );
}
