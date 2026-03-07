"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Edit3, Check, X, Plus, Trash2, ArrowLeft, Package, Loader2 } from "lucide-react";
import Link from "next/link";

export default function VariantsTable({ productId, productName }: { productId: string, productName: string }) {
  const [variants, setVariants] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<any>({});
  const [q, setQ] = useState("");

  // ---------- LOAD DATA ----------
  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}/variants`);
      const json = await res.json();
      const list = json.variants || json.rows || [];
      setVariants(Array.isArray(list) ? list : []);
    } catch (e) { 
      console.error("Load Error:", e); 
      setVariants([]);
    } finally { 
      setLoading(false); 
    }
  }

  useEffect(() => { load(); }, [productId]);

  // ---------- ADD NEW SIZE ----------
  async function addNewSize() {
    setBusyId("adding");
    try {
      const res = await fetch(`/api/admin/products/${productId}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sizeLabel: "New Size", widthMm: 0, heightMm: 0 }),
      });
      if (res.ok) await load();
    } finally { setBusyId(null); }
  }

  // ---------- SAVE / UPDATE ----------
  async function saveVariant(id: string, customPayload?: any) {
    setBusyId(id);
    const payload = customPayload || { id, ...draft };
    try {
      const res = await fetch(`/api/admin/products/${productId}/variants`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setEditingId(null);
        await load();
      } else {
        alert("Failed to save changes.");
      }
    } finally { setBusyId(null); }
  }

  // ---------- DELETE ----------
  async function deleteVariant(id: string) {
    if (!confirm("Are you sure you want to delete this size?")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/products/${productId}/variants?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) await load();
    } finally { setBusyId(null); }
  }

  const filtered = useMemo(() => {
    return variants.filter(v => v.sizeLabel.toLowerCase().includes(q.toLowerCase()));
  }, [variants, q]);

  return (
    <div className="max-w-[1200px] mx-auto pt-2 pb-20 px-6 space-y-4">
      
      {/* 🟢 NAVIGATION */}
      <div className="flex items-center justify-between">
        <Link href="/admin/products" className="group flex items-center gap-2 text-zinc-400 hover:text-black transition-all">
          <ArrowLeft size={14} />
          <span className="text-[9px] font-bold uppercase tracking-widest">Back to Catalog</span>
        </Link>
        <button 
          onClick={addNewSize}
          disabled={busyId !== null}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl text-[9px] font-bold uppercase tracking-widest hover:bg-zinc-800 disabled:opacity-50 transition-all shadow-lg"
        >
          {busyId === "adding" ? <Loader2 className="animate-spin" size={12}/> : <Plus size={14} />} 
          Add New Size
        </button>
      </div>

      {/* 🟢 PREMIUM BANNER WITH PRODUCT NAME */}
      <div className="relative overflow-hidden bg-[#1A1A1A] rounded-[24px] px-8 py-5 flex items-center justify-between border border-white/5 shadow-xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#C5A267]/10 blur-[60px] -mr-16 -mt-16 rounded-full"></div>
        <div className="relative z-10">
          <span className="text-[7px] font-bold uppercase tracking-[0.4em] text-[#C5A267] mb-1 block">Specifications</span>
          <h1 className="text-xl font-serif italic text-white leading-tight">Product Variants</h1>
          
          <div className="flex items-center gap-2 mt-2 px-3 py-1 bg-white/5 rounded-lg border border-white/10 w-fit">
            <Package size={10} className="text-[#C5A267]" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">{productName}</span>
          </div>
        </div>
        <div className="relative z-10 hidden md:block">
           <span className="text-white/10 text-[7px] font-bold uppercase tracking-[0.5em]">Inventory Control v2.0</span>
        </div>
      </div>

      {/* 🟢 TABLE AREA */}
      <div className="bg-white rounded-[32px] border border-[#F0F0F0] shadow-sm overflow-hidden">
        
        {/* Search */}
        <div className="p-4 border-b border-[#F8F8F8] bg-white/50">
          <div className="relative max-w-xs">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#C5A267]" size={13} />
            <input 
              className="w-full pl-10 pr-4 py-2.5 text-[11px] border border-[#EEE] rounded-2xl outline-none focus:border-[#C5A267] bg-[#FAFAFA] transition-all"
              placeholder="Filter by size label..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr className="bg-[#FAFAFA] text-left text-[8px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                <th className="py-4 px-8 border-b border-[#F0F0F0]">Size Label</th>
                <th className="py-4 px-4 border-b border-[#F0F0F0]">Dimensions (W × H)</th>
                <th className="py-4 px-4 border-b border-[#F0F0F0]">Status</th>
                <th className="py-4 px-8 text-right border-b border-[#F0F0F0]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F8F8F8]">
              {filtered.map((v) => {
                const isEditing = editingId === v.id;
                const isBusy = busyId === v.id;

                return (
                  <tr key={v.id} className="group hover:bg-[#FCFAF7]/50 transition-colors">
                    {/* Size Label */}
                    <td className="py-5 px-8">
                      {isEditing ? (
                        <input 
                          className="border border-[#C5A267]/30 rounded-lg px-3 py-1 text-xs font-serif italic outline-none w-full max-w-[150px] focus:ring-1 ring-[#C5A267]" 
                          value={draft.sizeLabel ?? v.sizeLabel}
                          onChange={e => setDraft({...draft, sizeLabel: e.target.value})}
                        />
                      ) : (
                        <span className="font-serif italic text-[16px] text-[#1A1A1A]">{v.sizeLabel}</span>
                      )}
                    </td>

                    {/* Dimensions */}
                    <td className="py-5 px-4">
                      {isEditing ? (
                        <div className="flex gap-2 items-center font-mono text-[10px]">
                           <input className="w-16 border rounded-lg p-1.5 focus:border-[#C5A267] outline-none" type="number" value={draft.widthMm ?? v.widthMm} onChange={e => setDraft({...draft, widthMm: Number(e.target.value)})}/>
                           <span className="text-zinc-300">×</span>
                           <input className="w-16 border rounded-lg p-1.5 focus:border-[#C5A267] outline-none" type="number" value={draft.heightMm ?? v.heightMm} onChange={e => setDraft({...draft, heightMm: Number(e.target.value)})}/>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 font-mono text-[10px] font-bold text-[#C5A267]">
                           <span className="bg-[#FCFAF7] px-2 py-0.5 rounded border border-[#C5A267]/10">{v.widthMm || 0}mm</span>
                           <span className="text-zinc-300">×</span>
                           <span className="bg-[#FCFAF7] px-2 py-0.5 rounded border border-[#C5A267]/10">{v.heightMm || 0}mm</span>
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-5 px-4">
                      <button 
                        disabled={isBusy}
                        onClick={() => saveVariant(v.id, { id: v.id, isActive: !v.isActive })}
                        className={`px-3 py-1 rounded-full text-[7.5px] font-bold uppercase border transition-all ${v.isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-zinc-50 text-zinc-400 border-zinc-100'}`}
                      >
                        {isBusy && editingId !== v.id ? <Loader2 className="animate-spin h-2 w-2" /> : (v.isActive ? "Available" : "OOS")}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-5 px-8 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isEditing ? (
                          <>
                            <button 
                              onClick={() => saveVariant(v.id)} 
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                              disabled={isBusy}
                            >
                              {isBusy ? <Loader2 className="animate-spin" size={14}/> : <Check size={16}/>}
                            </button>
                            <button onClick={() => setEditingId(null)} className="p-1.5 text-zinc-400 hover:bg-zinc-50 rounded-lg transition-all"><X size={16}/></button>
                          </>
                        ) : (
                          <>
                            <button 
                              onClick={() => { setEditingId(v.id); setDraft(v); }} 
                              className="p-1.5 text-zinc-400 hover:text-[#C5A267] hover:bg-[#FCFAF7] rounded-lg transition-all"
                            >
                              <Edit3 size={15}/>
                            </button>
                            <button 
                              onClick={() => deleteVariant(v.id)} 
                              className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Trash2 size={15}/>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {loading && (
            <div className="p-12 text-center text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-300 animate-pulse">
              Syncing Inventory Data...
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="p-12 text-center text-zinc-400 text-xs italic font-serif">
              No specifications found for this item.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}