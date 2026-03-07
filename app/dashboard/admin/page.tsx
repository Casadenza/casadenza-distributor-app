import Link from "next/link";
import { 
  Users, Package, FileText, Settings, ArrowUpRight, 
  Activity, ShieldCheck, TrendingUp, Boxes 
} from "lucide-react";

function StatCard({ label, value, delta, icon: Icon }: { label: string; value: string; delta: string; icon: any }) {
  return (
    <div className="bg-white p-6 rounded-[32px] border border-[#F0F0F0] hover:shadow-xl hover:shadow-zinc-100 transition-all duration-500 group relative overflow-hidden">
      <div className="flex justify-between items-start mb-4">
        <div className="h-10 w-10 rounded-2xl bg-[#FAFAFA] flex items-center justify-center text-[#C5A267] group-hover:scale-110 transition-transform">
          <Icon size={20} />
        </div>
        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">{delta}</span>
      </div>
      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-1">{label}</div>
      <div className="text-3xl font-serif italic text-[#1A1A1A] tracking-tight">{value}</div>
      <div className="absolute -bottom-4 -right-4 h-20 w-20 bg-[#C5A267]/5 blur-3xl rounded-full"></div>
    </div>
  );
}

function ActionCard({ title, desc, href, icon: Icon }: { title: string; desc: string; href: string; icon: any }) {
  return (
    <Link href={href} className="group bg-white p-6 rounded-[32px] border border-[#F0F0F0] hover:border-[#C5A267]/30 transition-all duration-500 shadow-sm hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-[#1A1A1A] flex items-center justify-center text-white shadow-lg shadow-zinc-200">
            <Icon size={22} strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="text-lg font-serif italic text-[#1A1A1A] group-hover:text-[#C5A267] transition-colors">{title}</h3>
            <p className="text-[11px] text-zinc-400 uppercase tracking-wide font-medium mt-1 leading-relaxed">{desc}</p>
          </div>
        </div>
        <div className="h-8 w-8 rounded-full border border-[#EEE] flex items-center justify-center text-[#CCC] group-hover:text-black group-hover:border-black transition-all">
          <ArrowUpRight size={14} />
        </div>
      </div>
    </Link>
  );
}

export default function AdminDashboardPage() {
  return (
    <div className="max-w-[1400px] mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#F0F0F0] pb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-[1px] w-12 bg-[#C5A267]"></div>
            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#C5A267]">Atelier Control</span>
          </div>
          <h1 className="text-5xl font-serif italic text-[#1A1A1A] tracking-tighter">Command Center</h1>
          <p className="text-zinc-400 text-xs font-medium uppercase tracking-widest max-w-md">Orchestrate your global distributor network & catalog.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-zinc-50 rounded-2xl border border-zinc-100">
          <ShieldCheck size={14} className="text-[#C5A267]" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Admin Auth Verified</span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Distributors" value="128" delta="+12%" icon={Users} />
        <StatCard label="Catalog Products" value="442" delta="Live" icon={Package} />
        <StatCard label="Pending Orders" value="18" delta="-2" icon={Activity} />
        <StatCard label="Live Sessions" value="24" delta="High" icon={TrendingUp} />
      </div>

      <div className="space-y-6">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#C5A267] flex items-center gap-4">
          Management Modules
          <span className="flex-1 h-[1px] bg-[#F5F5F5]"></span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ActionCard title="Catalog Hub" desc="Manage product inventory, images and pricing." href="/dashboard/admin/products" icon={Boxes} />
          <ActionCard title="Distributor Network" desc="Manage access, tiered pricing and accounts." href="/dashboard/admin/distributors" icon={Users} />
          <ActionCard title="Content Repository" desc="Marketing toolkits, brochures and assets." href="/dashboard/admin/documents" icon={FileText} />
          <ActionCard title="System Settings" desc="Configure global parameters and security." href="/dashboard/admin/settings" icon={Settings} />
        </div>
      </div>
    </div>
  );
}