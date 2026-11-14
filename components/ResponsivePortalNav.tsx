"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronRight, LogOut } from "lucide-react";

export default function ResponsivePortalNav({ role }: { role: "ADMIN" | "DISTRIBUTOR" }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);
  const root = role === "ADMIN" ? "/admin" : "/dashboard";
  const nav = role === "ADMIN"
    ? [
      ["Dashboard", "/admin"], ["Integrations", "/admin/integrations"], ["Distributors", "/admin/distributors"],
      ["Order & Shipment Hub", "/admin/operations"], ["Orders Hub", "/admin/orders"], ["Partner Rewards", "/admin/rewards"], ["Communication Centre", "/admin/communications"],
      ["Products", "/admin/products"], ["Prices", "/admin/prices"],
      ["Documents", "/admin/documents"], ["Marketing Toolkit", "/admin/marketing-toolkit"],
      ["New Arrivals", "/admin/new-arrivals"], ["Packing Calculator", "/admin/packing-calculator"],
    ]
    : [
      ["Home", "/dashboard"], ["Business Overview", "/dashboard/business"], ["Communication Centre", "/dashboard/communications"],
      ["Products", "/dashboard/products"], ["Price & Schemes", "/dashboard/price-schemes"],
      ["Place Order", "/dashboard/place-order"], ["My Orders", "/dashboard/my-orders"], ["Partner Rewards", "/dashboard/rewards"],
      ["New Arrivals", "/dashboard/new-arrivals"], ["Documents", "/dashboard/documents"],
      ["Training", "/dashboard/training"], ["Marketing Toolkit", "/dashboard/marketing-toolkit"],
      ["Packing Calculator", "/dashboard/packing-calculator"],
    ];
  return (
    <div className="xl:hidden">
      <div className="sticky top-0 z-40 flex h-[62px] items-center justify-between border-b border-[#EAE4D9] bg-[#FCFAF6] px-4">
        <Link href={root} className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <img src="/brand/casadenza-logo.png" alt="Casadenza" className="h-7 w-auto max-w-[135px] object-contain"/>
          <span className="hidden border-l border-[#DDD3C2] pl-3 text-[11px] font-semibold text-[#9B7C48] sm:inline">{role === "ADMIN" ? "Admin" : "Partners"}</span>
        </Link>
        <button type="button" className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#E5DDCE] text-[#27221C]" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <X size={21}/> : <Menu size={21}/>}
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 top-[62px] z-50 bg-black/25" onClick={() => setOpen(false)}>
          <nav className="h-full max-h-[calc(100dvh-62px)] w-[min(340px,88vw)] overflow-y-auto bg-[#FCFAF6] p-4 shadow-2xl" aria-label="Mobile and tablet navigation" onClick={(e) => e.stopPropagation()}>
            <p className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#AD8D56]">Portal navigation</p>
            {nav.map(([label, href]) => {
              const active = path === href || (href !== root && path.startsWith(href + "/"));
              return <Link key={href} href={href} onClick={() => setOpen(false)}
                className={"mb-1 flex min-h-[46px] items-center justify-between rounded-xl px-3 text-[14px] font-medium " + (active ? "bg-[#25221D] text-white" : "text-[#635B4E] hover:bg-[#F0E9DD]")}>{label}<ChevronRight size={15}/></Link>;
            })}
            <form action="/api/auth/logout" method="post"><button type="submit" className="mt-4 flex min-h-[46px] w-full items-center gap-2 rounded-xl border border-[#DDD3C3] px-3 text-[13px] text-[#625849]"><LogOut size={16}/> Sign out</button></form>
          </nav>
        </div>
      )}
    </div>
  );
}
