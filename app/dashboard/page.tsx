import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/serverSession";
import { prisma } from "@/lib/db";
import {
  ArrowUpRight,
  ChevronRight,
  Package,
  Coins,
  Truck,
  Files,
  ArrowRight,
  Sparkles,
  Calculator,
} from "lucide-react";

export const dynamic = "force-dynamic";

function SlimMetric({ label, value, sub, isGold }: any) {
  return (
    <div
      className={`px-5 py-3 rounded-[20px] border ${
        isGold
          ? "bg-[#C5A267] border-[#C5A267] text-white shadow-lg shadow-[#C5A267]/20"
          : "bg-white border-[#EAE7E2]"
      } flex items-center justify-between transition-all hover:scale-[1.02]`}
    >
      <div>
        <span
          className={`text-[8px] font-bold uppercase tracking-[0.2em] ${
            isGold ? "text-white/70" : "text-[#A39E93]"
          }`}
        >
          {label}
        </span>
        <div className="text-xl font-light tracking-tight leading-none italic">{value}</div>
      </div>
      <div className={`text-[8px] font-bold uppercase ${isGold ? "text-white/60" : "text-[#C5A267]"}`}>{sub}</div>
    </div>
  );
}

function SlimActionCard({ title, desc, href, icon: Icon, badge }: any) {
  return (
    <Link
      href={href}
      className="group bg-[#FAF9F6] border border-[#EAE7E2] p-4 rounded-[22px] flex items-center gap-4 transition-all hover:bg-white hover:border-[#C5A267] hover:shadow-xl hover:shadow-[#C5A267]/5"
    >
      <div className="h-9 w-9 shrink-0 rounded-xl bg-white border border-[#F0EDE8] flex items-center justify-center text-[#1A1A1A] group-hover:bg-[#1A1A1A] group-hover:text-white transition-all duration-500 shadow-sm">
        <Icon size={16} strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-[13px] font-medium tracking-tight text-[#1A1A1A] leading-none group-hover:italic transition-all">
            {title}
          </h3>
          {badge ? (
            <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-[#C5A267] px-1.5 py-0.5 text-[8px] font-bold text-white">
              +{badge}
            </span>
          ) : null}
        </div>
        <p className="text-[9px] font-medium text-[#A39E93] uppercase tracking-tighter mt-1 truncate">{desc}</p>
      </div>
      <ArrowUpRight size={14} className="text-[#EAE7E2] group-hover:text-[#C5A267] transition-all" />
    </Link>
  );
}

export default async function SlimPremiumDashboard() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const distributorId = session.distributorId || "";

  const [dist, ordersCount, taskCount, serviceCount, recentOrders] = await Promise.all([
    distributorId
      ? prisma.distributor.findUnique({
          where: { id: distributorId },
          select: { tier: true },
        })
      : Promise.resolve(null),
    distributorId ? prisma.order.count({ where: { distributorId } }) : Promise.resolve(0),
    distributorId
      ? prisma.order.count({
          where: {
            distributorId,
            status: { in: ["RECEIVED", "CONFIRMED", "IN_PRODUCTION", "PACKED"] },
          },
        })
      : Promise.resolve(0),
    distributorId ? prisma.ticket.count({ where: { distributorId } }) : Promise.resolve(0),
    distributorId
      ? prisma.order.findMany({
          where: { distributorId },
          include: { documents: true },
          orderBy: { createdAt: "desc" },
          take: 3,
        })
      : Promise.resolve([]),
  ]);

  const tier = (dist?.tier ?? "STANDARD").toUpperCase();
  const dateStr = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  const documentCount = recentOrders.reduce((sum, order: any) => sum + (order?.documents?.length || 0), 0);

  const streamItems = recentOrders.length
    ? recentOrders.map((order: any, index: number) => ({
        t: `PO #${String(order?.id || "").slice(-4)} Update`,
        d:
          order?.documents?.length > 0
            ? `${order.documents.length} document${order.documents.length > 1 ? "s" : ""} available for this order.`
            : `${String(order?.status || "PENDING").replaceAll("_", " ")} status updated.`,
        s: index === 0 ? "now" : `${index + 1}d`,
      }))
    : [
        { t: "No Recent Orders", d: "Your latest distributor activity will appear here.", s: "—" },
      ];

  return (
    <div className="max-w-[1100px] mx-auto space-y-4 py-2 animate-in fade-in duration-1000">
      <div className="flex items-center justify-between border-b border-[#F0EDE8] pb-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="h-1 w-1 rounded-full bg-[#C5A267]" />
            <span className="text-[8px] font-bold uppercase tracking-[0.4em] text-[#C5A267]">Atelier Console</span>
          </div>
          <h1 className="text-2xl font-extralight tracking-tighter text-[#1A1A1A]">
            Dashboard <span className="font-serif italic text-[#C5A267]">Partner</span>
          </h1>
        </div>

        <div className="flex gap-4 items-center bg-[#FAF9F6] px-4 py-2 rounded-full border border-[#EAE7E2]">
          <div className="text-right">
            <p className="text-[7px] font-bold text-[#A39E93] uppercase tracking-widest leading-none">Tier</p>
            <div className="text-[11px] font-semibold text-[#1A1A1A] italic leading-none mt-1">{tier}</div>
          </div>
          <div className="h-4 w-[1px] bg-[#EAE7E2]" />
          <div className="text-right">
            <p className="text-[7px] font-bold text-[#A39E93] uppercase tracking-widest leading-none">Ref</p>
            <span className="text-[11px] font-semibold text-[#1A1A1A] uppercase leading-none mt-1">{dateStr}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <SlimMetric label="Orders" value={String(ordersCount).padStart(2, "0")} sub="Total" />
        <SlimMetric label="Status" value={tier} sub="Level" isGold />
        <SlimMetric label="Tasks" value={String(taskCount).padStart(2, "0")} sub="Pending" />
        <SlimMetric label="Service" value={String(serviceCount).padStart(2, "0")} sub="Open" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <SlimActionCard title="Inventory" desc="Stone Collection" href="/dashboard/products" icon={Package} />
        <SlimActionCard title="Pricing" desc="Active Schemes" href="/dashboard/price-schemes" icon={Coins} />
        <SlimActionCard title="Tracking" desc="Order History" href="/dashboard/my-orders" icon={Truck} />
        <SlimActionCard
          title="Archive"
          desc="Technical Specs"
          href="/dashboard/documents"
          icon={Files}
          badge={documentCount > 0 ? 1 : 0}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-1">
        <div className="lg:col-span-8 bg-white border border-[#EAE7E2] rounded-[24px] p-5">
          <div className="flex items-center justify-between mb-5 border-b border-[#FAF9F6] pb-3">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1A1A1A]">Terminal Stream</h2>
            <Link href="/dashboard/my-orders" className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest text-[#C5A267] hover:gap-2 transition-all">
              Log <ChevronRight size={8} />
            </Link>
          </div>

          <div className="space-y-4">
            {streamItems.map((log, i) => (
              <div key={i} className="flex justify-between items-center group border-b border-[#FAF9F6] last:border-0 pb-3">
                <div className="flex gap-3 items-center">
                  <div className="h-1 w-1 rounded-full bg-[#EAE7E2] group-hover:bg-[#C5A267] transition-all" />
                  <div>
                    <h4 className="text-[12px] font-semibold text-[#1A1A1A] group-hover:italic leading-none">{log.t}</h4>
                    <p className="text-[9px] text-[#A39E93] mt-1 leading-none">{log.d}</p>
                  </div>
                </div>
                <span className="text-[8px] font-bold text-[#EAE7E2] uppercase italic">{log.s}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-3">
          <div className="bg-[#1A1A1A] p-6 rounded-[24px] text-white flex flex-col justify-between h-[150px]">
            <div>
              <span className="text-[8px] font-bold uppercase tracking-[0.3em] text-[#C5A267]">Documents</span>
              <h3 className="text-lg font-extralight italic leading-tight mt-1">Archive Updates</h3>
              <p className="mt-2 text-[11px] leading-5 text-white/65">
                {documentCount > 0
                  ? `${documentCount} linked document${documentCount > 1 ? "s" : ""} available in your archive.`
                  : "No new technical files available right now."}
              </p>
            </div>
            <Link href="/dashboard/documents" className="inline-flex items-center justify-center gap-2 bg-[#C5A267] text-white text-center py-2 rounded-full text-[8px] font-bold uppercase tracking-widest hover:scale-105 transition-all">
              Open Archive <ArrowRight size={12} />
            </Link>
          </div>

          <div className="flex gap-2">
            <Link href="/dashboard/training" className="flex-1 py-2.5 border border-[#EAE7E2] rounded-xl bg-[#FAF9F6] text-[8px] font-bold uppercase tracking-widest text-[#B5B0A4] text-center hover:text-[#1A1A1A] hover:border-[#C5A267] transition-all">Academy</Link>
            <Link href="/dashboard/new-arrivals" className="flex-1 py-2.5 border border-[#EAE7E2] rounded-xl bg-[#FAF9F6] text-[8px] font-bold uppercase tracking-widest text-[#B5B0A4] text-center hover:text-[#1A1A1A] hover:border-[#C5A267] transition-all">New Arrivals</Link>
          </div>

          <Link href="/dashboard/packing-calculator" className="block py-2.5 border border-[#EAE7E2] rounded-xl bg-[#FAF9F6] text-[8px] font-bold uppercase tracking-widest text-[#B5B0A4] text-center hover:text-[#1A1A1A] hover:border-[#C5A267] transition-all">
            Calculator
          </Link>
        </div>
      </div>
    </div>
  );
}
