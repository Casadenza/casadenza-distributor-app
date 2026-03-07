"use client";

import { useEffect, useMemo, useState } from "react";
import { 
  Search, RefreshCw, AlertCircle, Save, 
  Download, Upload, FileSpreadsheet, CheckCircle2 
} from "lucide-react";

type Unit = "SHEET" | "SQM" | "SQFT";
type Row = {
  variantId: string; priceId: string | null; productSku: string;
  productName: string; sizeLabel: string; tier: string; currency: string;
  priceSheet: number | null; priceSqm: number | null; priceSqft: number | null;
  updatedAt: string | null;
};

function ClientDate({ value }: { value: string | null }) {
  const [txt, setTxt] = useState("—");
  useEffect(() => {
    if (!value) return;
    try { setTxt(new Date(value).toLocaleDateString()); } catch { setTxt("—"); }
  }, [value]);
  return <span className="text-[10px] text-[#A39E93] font-medium">{txt}</span>;
}

export default function PricesTable({ tierOptions, currencyOptions, unitOptions }: any) {
  const [tier, setTier] = useState(tierOptions[0]);
  const [currency, setCurrency] = useState(currencyOptions[0]);
  const [unit, setUnit] = useState<Unit>(unitOptions[0]);
  const [q, setQ] = useState("");
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [dirty, setDirty] = useState<Record<string, true>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const p = new URLSearchParams({ tier, currency });
      if (q.trim()) p.set("q", q.trim());
      const res = await fetch(`/api/admin/prices?${p.toString()}`);
      const json = await res.json();
      setRows(json.rows || []);
      setDirty({});
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [tier, currency]);

  const filtered = useMemo(() => {
    let list = rows;
    if (onlyMissing) {
      list = list.filter((r) => {
        const val = unit === "SHEET" ? r.priceSheet : unit === "SQM" ? r.priceSqm : r.priceSqft;
        return val === null || val === 0;
      });
    }
    if (!q.trim()) return list;
    const s = q.toLowerCase();
    return list.filter(r => r.productSku.toLowerCase().includes(s) || r.productName.toLowerCase().includes(s));
  }, [rows, q, onlyMissing, unit]);

  const saveOne = async (row: Row) => {
    const key = `${row.variantId}-${tier}-${currency}-${unit}`;
    setSavingKey(key);
    const amount = unit === "SHEET" ? row.priceSheet : unit === "SQM" ? row.priceSqm : row.priceSqft;
    try {
      const res = await fetch(`/api/admin/prices/upsert`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId: row.variantId, tier, currency, unit, amount }),
      });
      if (res.ok) setDirty(d => { const c = { ...d }; delete c[row.variantId]; return c; });
    } catch (e) { alert("Error saving row"); } finally { setSavingKey(null); }
  };

  const handleBulkSave = async () => {
    const ids = Object.keys(dirty);
    setBulkSaving(true);
    for (const id of ids) {
      const row = rows.find(r => r.variantId === id);
      if (row) await saveOne(row);
    }
    setBulkSaving(false);
  };

  const handleImport = async (file: File) => {
    setLoading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("tier", tier);
    fd.append("currency", currency);
    fd.append("unit", unit);
    try {
      const res = await fetch("/api/admin/import-prices", { method: "POST", body: fd });
      const json = await res.json();
      if (res.ok) {
        alert(`Done! Updated: ${json.updated}, Skipped: ${json.skipped}`);
        load();
      } else { alert(json.error || "Import failed"); }
    } catch (e) { alert("Upload error"); } finally { setLoading(false); }
  };

  const dirtyCount = Object.keys(dirty).length;

  return (
    <div className="space-y-4">
      {/* Selection Bar */}
      <div className="bg-[#FAF9F6] border border-[#EAE7E2] rounded-2xl p-3 flex flex-wrap items-center gap-4 shadow-sm">
        <div className="flex items-center gap-3 border-r pr-4 border-[#EAE7E2]">
           <div className="flex flex-col">
             <span className="text-[8px] font-extrabold text-[#A39E93] uppercase tracking-tighter">Tier</span>
             <select value={tier} onChange={(e)=>setTier(e.target.value)} className="bg-transparent text-[11px] font-bold uppercase outline-none cursor-pointer">
               {tierOptions.map((t:any)=><option key={t} value={t}>{t}</option>)}
             </select>
           </div>
           <div className="flex flex-col">
             <span className="text-[8px] font-extrabold text-[#A39E93] uppercase tracking-tighter">Currency</span>
             <select value={currency} onChange={(e)=>setCurrency(e.target.value)} className="bg-transparent text-[11px] font-bold uppercase outline-none cursor-pointer text-[#C5A267]">
               {currencyOptions.map((c:any)=><option key={c} value={c}>{c}</option>)}
             </select>
           </div>
           <div className="flex flex-col">
             <span className="text-[8px] font-extrabold text-[#A39E93] uppercase tracking-tighter">Unit</span>
             <select value={unit} onChange={(e)=>setUnit(e.target.value as any)} className="bg-[#1A1A1A] text-white px-2 py-0.5 rounded text-[9px] font-bold uppercase outline-none mt-0.5">
               {unitOptions.map((u:any)=><option key={u} value={u}>{u}</option>)}
             </select>
           </div>
        </div>

        <div className="relative flex-1 max-w-[280px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A39E93]" />
          <input className="w-full bg-white border border-[#EAE7E2] rounded-xl pl-9 pr-3 py-2 text-[12px] outline-none focus:border-[#C5A267] font-medium" 
                 placeholder="Search SKU..." value={q} onChange={(e)=>setQ(e.target.value)} />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={onlyMissing} onChange={(e)=>setOnlyMissing(e.target.checked)} className="rounded border-[#EAE7E2] text-red-500 w-4 h-4 focus:ring-0" />
          <span className="text-[10px] font-bold text-[#A39E93] uppercase">Only Missing</span>
        </label>

        <button onClick={load} className="ml-auto p-2 hover:bg-white rounded-xl transition-all border border-transparent hover:border-[#EAE7E2]">
          <RefreshCw size={15} className={loading ? "animate-spin text-[#C5A267]" : "text-[#A39E93]"} />
        </button>
      </div>

      {/* Action Buttons Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => window.location.href=`/api/admin/prices-template?tier=${tier}&currency=${currency}&unit=${unit}`}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#EAE7E2] rounded-lg text-[10px] font-bold text-[#6B665C] hover:bg-[#1A1A1A] hover:text-white transition-all shadow-sm"
          >
            <Download size={12} /> TEMPLATE
          </button>
          
          <label className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#EAE7E2] rounded-lg text-[10px] font-bold text-[#6B665C] hover:bg-[#C5A267] hover:text-white transition-all shadow-sm cursor-pointer">
            <Upload size={12} /> IMPORT EXCEL
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImport(f);
              e.target.value = "";
            }} />
          </label>
        </div>

        <button 
          onClick={handleBulkSave}
          disabled={dirtyCount === 0 || bulkSaving}
          className={`flex items-center gap-2 px-5 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
            dirtyCount > 0 ? 'bg-[#1A1A1A] text-[#C5A267] border-[#1A1A1A] shadow-md' : 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
          }`}
        >
          <Save size={12} /> {bulkSaving ? "SAVING..." : `BULK SAVE (${dirtyCount})`}
        </button>
      </div>

      {/* Freeze Table Container */}
      <div className="bg-white border border-[#EAE7E2] rounded-2xl overflow-hidden shadow-sm">
        <div className="max-h-[70vh] overflow-y-auto scrollbar-thin">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FAF9F6] border-b border-[#F0EDE8] sticky top-0 z-20 shadow-sm">
                <th className="px-5 py-3 text-[9px] font-extrabold text-[#A39E93] uppercase tracking-widest bg-[#FAF9F6]">Product / SKU</th>
                <th className="px-5 py-3 text-[9px] font-extrabold text-[#A39E93] uppercase tracking-widest bg-[#FAF9F6]">Size Label</th>
                <th className="px-5 py-3 text-[9px] font-extrabold text-[#A39E93] uppercase tracking-widest text-center bg-[#FAF9F6]">Amount ({unit})</th>
                <th className="px-5 py-3 text-[9px] font-extrabold text-[#A39E93] uppercase tracking-widest bg-[#FAF9F6]">Last Sync</th>
                <th className="px-5 py-3 text-right text-[9px] font-extrabold text-[#A39E93] uppercase tracking-widest bg-[#FAF9F6]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EDE8]">
              {filtered.map((r) => {
                const amount = unit === "SHEET" ? r.priceSheet : unit === "SQM" ? r.priceSqm : r.priceSqft;
                const isMissing = amount === null || amount === 0;
                const busy = savingKey === `${r.variantId}-${tier}-${currency}-${unit}`;
                const isDirty = dirty[r.variantId];

                return (
                  <tr key={r.variantId} className={`hover:bg-[#FAF9F6]/50 transition-all ${isMissing ? 'bg-red-50/30' : ''}`}>
                    <td className="px-5 py-1.5">
                      <div className="text-[12px] font-bold text-[#1A1A1A]">{r.productSku}</div>
                      <div className="text-[9px] text-[#A39E93] truncate max-w-[200px] font-medium leading-none mt-0.5">{r.productName}</div>
                    </td>
                    <td className="px-5 py-1.5">
                      <span className="text-[10px] font-bold text-[#6B665C] bg-[#F0EDE8]/60 px-1.5 py-0.5 rounded">{r.sizeLabel}</span>
                    </td>
                    <td className="px-5 py-1.5 text-center">
                      <div className="flex justify-center items-center gap-2">
                        <input
                          type="number"
                          className={`w-24 px-2 py-1 text-[12px] font-bold border rounded-lg outline-none text-center ${
                            isMissing ? 'border-red-300 bg-red-50 text-red-600 focus:border-red-500' : 
                            isDirty ? 'border-[#C5A267] bg-white' : 'border-[#F0EDE8] bg-white'
                          }`}
                          value={amount ?? ""}
                          onChange={(e) => {
                             const val = e.target.value === "" ? null : Number(e.target.value);
                             setRows(prev => prev.map(x => x.variantId === r.variantId ? (unit === "SHEET" ? {...x, priceSheet: val} : unit === "SQM" ? {...x, priceSqm: val} : {...x, priceSqft: val}) : x));
                             setDirty(d => ({ ...d, [r.variantId]: true }));
                          }}
                        />
                        {isMissing && <AlertCircle size={12} className="text-red-400" />}
                      </div>
                    </td>
                    <td className="px-5 py-1.5">
                      <ClientDate value={r.updatedAt} />
                    </td>
                    <td className="px-5 py-1.5 text-right">
                      <button 
                        onClick={() => saveOne(r)}
                        disabled={busy}
                        className={`text-[9px] font-bold px-3 py-1.5 rounded-lg border transition-all ${
                          busy ? 'opacity-40' : isDirty ? 'bg-[#1A1A1A] text-[#C5A267] border-[#1A1A1A]' : 
                          isMissing ? 'bg-red-600 text-white border-red-600' : 'bg-white text-[#A39E93] border-[#EAE7E2]'
                        }`}
                      >
                        {busy ? "..." : isDirty ? "UPDT" : isMissing ? "FIX" : "SAVE"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="flex items-center justify-between text-[10px] text-[#A39E93] font-bold uppercase px-2">
        <p>Showing {filtered.length} Variants</p>
        <div className="flex items-center gap-1">
          <CheckCircle2 size={12} className="text-green-500" />
          <span>Matrix Ready</span>
        </div>
      </div>
    </div>
  );
}