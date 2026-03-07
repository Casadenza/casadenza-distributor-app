"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Search, RotateCcw, Layers, Printer, Info, ChevronDown } from "lucide-react";

// --- CORE LOGIC ---
type UnitKey = "SHEET" | "SQM" | "SQFT";
const UNITS: { key: UnitKey; label: string; sub: string }[] = [
  { key: "SHEET", label: "SHEET", sub: "Piece" },
  { key: "SQM", label: "SQM", sub: "Metric" },
  { key: "SQFT", label: "SQFT", sub: "Imperial" },
];
const COLLECTION_ORDER = ["Fusion", "Lumina", "ECO Fusion", "ECO Lumina", "3D Fusion"];
const STONE_TYPE_ORDER = ["SLATE", "QUARTZITE", "GRANITE", "LIMESTONE", "SANDSTONE", "CONCRETE", "MARBLE", "RESIN EPOXY", "RUSTIC PAINT", "MODIFIED CLAY"];

function norm(s: string) { return (s || "").toLowerCase().replace(/\s+/g, " ").trim(); }
function normKey(s: string) { return (s || "").toLowerCase().replace(/[\s\-_]+/g, "").trim(); }
function fmt(n: number) { return Number.isInteger(n) ? n.toString() : n.toFixed(2); }

function parseSize(sizeLabel: string) {
  const s = (sizeLabel || "").toLowerCase().replace("×", "x").replace("mm", "").trim();
  const m = s.match(/(\d+(\.\d+)?)\s*x\s*(\d+(\.\d+)?)/);
  if (!m) return { a: 0, b: 0 };
  return { a: parseFloat(m[1]), b: parseFloat(m[3]) };
}

// SKU Numeric Sorting
function skuSortKey(sku: string) {
  const s = (sku || "").trim().toUpperCase();
  const m = s.match(/^([A-Z]+)\s*[-_ ]*\s*([0-9]+)/);
  if (m) return { prefix: m[1], num: parseInt(m[2], 10), raw: s };
  const n = s.match(/([0-9]+)/);
  return { prefix: s.replace(/[0-9]/g, ""), num: n ? parseInt(n[1], 10) : 999999, raw: s };
}

export default function SizeFixedTerminal() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [collectionKey, setCollectionKey] = useState("all");
  const [stoneType, setStoneType] = useState("all");
  const [size, setSize] = useState("all"); // Size filter state restored
  const [unit, setUnit] = useState<UnitKey>("SHEET");
  const [currency, setCurrency] = useState("USD");
  const [q, setQ] = useState("");
  const [selectedKey, setSelectedKey] = useState<string>("");

  async function load(nextCurrency?: string) {
    setLoading(true);
    try {
      const cur = (nextCurrency || currency || "USD").toUpperCase();
      const res = await fetch(`/api/pricing?currency=${encodeURIComponent(cur)}`);
      const json = await res.json();
      setData(json);
      setCurrency((json?.distributor?.currency || cur).toUpperCase());
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  useEffect(() => { load("USD"); }, []);

  const rows = useMemo(() => data?.rows || [], [data]);
  const allowedCurrencies = useMemo(() => (data?.distributor?.allowedCurrencies || ["USD"]), [data]);

  const stoneTypeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      if (collectionKey !== "all" && normKey(r.product?.collection) !== collectionKey) continue;
      const st = (r.product?.stoneType || "").toString().trim();
      if (st) set.add(st);
    }
    const order = STONE_TYPE_ORDER.map((s) => s.toUpperCase());
    return Array.from(set).sort((a, b) => {
      const A = a.toUpperCase();
      const B = b.toUpperCase();
      const ia = order.indexOf(A);
      const ib = order.indexOf(B);
      if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      return A.localeCompare(B);
    });
  }, [rows, collectionKey]);

  // Size Options logic restored
  const sizeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      if (collectionKey !== "all" && normKey(r.product?.collection) !== collectionKey) continue;
      if (stoneType !== "all" && r.product?.stoneType !== stoneType) continue;
      if (r.variant?.sizeLabel) set.add(r.variant.sizeLabel);
    }
    return Array.from(set).sort((x, y) => {
      const sa = parseSize(x);
      const sb = parseSize(y);
      return sa.a - sb.a || sa.b - sb.b;
    });
  }, [rows, collectionKey, stoneType]);

  const filtered = useMemo(() => {
    const search = norm(q);
    const out = rows.filter((r: any) => {
      if (collectionKey !== "all" && normKey(r.product?.collection) !== collectionKey) return false;
      if (stoneType !== "all" && r.product?.stoneType !== stoneType) return false;
      if (size !== "all" && r.variant?.sizeLabel !== size) return false; // Filter by size
      if (search && !norm(`${r.product?.sku} ${r.product?.name}`).includes(search)) return false;
      return true;
    }).map((r: any) => ({
      ...r,
      key: `${r.product.sku}__${r.variant.sizeLabel}`,
      displayPrice: r.price?.unitPrices?.[unit]
    }));

    // Multi-level Sorting: SKU Prefix -> SKU Num -> Size
    return out.sort((a: any, b: any) => {
      const A = skuSortKey(a.product.sku);
      const B = skuSortKey(b.product.sku);
      if (A.prefix !== B.prefix) return A.prefix.localeCompare(B.prefix);
      if (A.num !== B.num) return A.num - B.num;
      const sa = parseSize(a.variant.sizeLabel);
      const sb = parseSize(b.variant.sizeLabel);
      return sa.a - sb.a || sa.b - sb.b;
    });
  }, [rows, collectionKey, stoneType, size, q, unit]);

  const selected = useMemo(() => filtered.find((r: any) => r.key === selectedKey) || filtered[0] || null, [filtered, selectedKey]);

  return (
    <div className="min-h-screen bg-[#F6F6F7] flex flex-col antialiased text-zinc-900">
      {/* COMPACT NAV */}
      <nav className="sticky top-0 z-[100] bg-white border-b border-zinc-200 px-6 py-2 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-black p-1.5 rounded-lg shadow-sm"><Layers className="text-white" size={14} /></div>
          <span className="font-black text-[10px] uppercase tracking-widest italic">Price & Schemes <span className="text-zinc-400 not-italic font-bold">Distributor</span></span>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-zinc-100 p-0.5 rounded-lg flex gap-0.5 border border-zinc-200">
            {UNITS.map(u => (
              <button key={u.key} onClick={() => setUnit(u.key)} className={`px-3 py-1 rounded-md text-[9px] font-black uppercase transition-all ${unit === u.key ? 'bg-white shadow-sm text-black' : 'text-zinc-500 hover:text-zinc-700'}`}>{u.key}</button>
            ))}
          </div>
          <button onClick={() => window.print()} className="p-1.5 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-all shadow-sm"><Printer size={14} /></button>
        </div>
      </nav>

      <main className="max-w-[1600px] mx-auto w-full p-4 grid grid-cols-12 gap-4 grow items-start">
        <div className="col-span-12 lg:col-span-9 space-y-3">
          {/* UPDATED COMPACT FILTERS */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-2 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                <input placeholder="Search SKU or name..." className="w-full h-9 pl-9 pr-3 bg-zinc-50 border border-zinc-100 rounded-xl text-[12px] font-bold focus:ring-2 focus:ring-zinc-100 outline-none transition-all" value={q} onChange={(e)=>setQ(e.target.value)} />
              </div>
              
              <div className="h-9 flex items-center bg-zinc-50 border border-zinc-100 rounded-xl px-1 gap-1">
                <select value={collectionKey} onChange={(e)=>setCollectionKey(e.target.value)} className="h-7 bg-transparent px-2 text-[10px] font-black uppercase outline-none cursor-pointer">
                  <option value="all">COLLECTIONS</option>
                  {COLLECTION_ORDER.map(c => <option key={c} value={normKey(c)}>{c}</option>)}
                </select>
                <div className="h-4 w-[1px] bg-zinc-200" />
                <select value={stoneType} onChange={(e)=>setStoneType(e.target.value)} className="h-7 bg-transparent px-2 text-[10px] font-black uppercase outline-none cursor-pointer">
                  <option value="all">STONE TYPES</option>
                  {(stoneTypeOptions.length ? stoneTypeOptions : STONE_TYPE_ORDER).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <div className="h-4 w-[1px] bg-zinc-200" />
                {/* RESTORED SIZE FILTER */}
                <select value={size} onChange={(e)=>setSize(e.target.value)} className="h-7 bg-transparent px-2 text-[10px] font-black uppercase outline-none cursor-pointer text-blue-600">
                  <option value="all">ALL SIZES</option>
                  {sizeOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-1.5 ml-auto">
                <button onClick={() => { setQ(""); setCollectionKey("all"); setStoneType("all"); setSize("all"); }} className="h-9 w-9 flex items-center justify-center bg-zinc-50 border border-zinc-100 rounded-xl text-zinc-400 hover:text-black hover:bg-zinc-100 transition-all"><RotateCcw size={14} /></button>
                <select value={currency} onChange={(e)=>load(e.target.value)} className="h-9 bg-zinc-950 text-white rounded-xl px-3 text-[10px] font-black uppercase outline-none shadow-lg shadow-zinc-200">
                  {allowedCurrencies.map((c:any) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* TABLE */}
          <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="max-h-[72vh] overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-zinc-100">
                  <tr className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                    <th className="px-6 py-3">Material Detail</th>
                    <th className="px-4 py-3">Dimensions</th>
                    <th className="px-6 py-3 text-right">Premium Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {filtered.map((r: any) => (
                    <tr key={r.key} onClick={() => setSelectedKey(r.key)} className={`group cursor-pointer transition-all ${selectedKey === r.key ? 'bg-zinc-50/80' : 'hover:bg-zinc-50/40'}`}>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`h-1.5 w-1.5 rounded-full ${r.displayPrice ? 'bg-emerald-500 shadow-sm shadow-emerald-100' : 'bg-zinc-200'}`} />
                          <div>
                            <p className="text-[13px] font-black text-zinc-900 tracking-tight leading-none mb-1 uppercase italic">{r.product.name}</p>
                            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">{r.product.sku}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[10px] font-bold text-zinc-500 italic uppercase">{r.variant.sizeLabel}</td>
                      <td className="px-6 py-3 text-right font-black text-[13px] tracking-tighter">
                        {r.displayPrice ? `${currency} ${fmt(r.displayPrice)}` : <span className="text-zinc-200 text-[9px] uppercase font-bold tracking-widest italic">Awaiting</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* COMPACT DETAIL CARD */}
        <aside className="col-span-12 lg:col-span-3 sticky top-[68px]">
          {selected ? (
            <div className="bg-white border border-zinc-200 rounded-[24px] p-5 shadow-xl shadow-zinc-200/30 space-y-5 relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-zinc-50 pb-3">
                <span className="text-[9px] font-black text-zinc-300 uppercase tracking-[0.3em]">Commercial Card</span>
                <div className="h-2 w-2 bg-zinc-950 rounded-full animate-pulse shadow-sm" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-black tracking-tighter leading-none italic uppercase">{selected.product.name}</h2>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 bg-zinc-950 text-white text-[8px] font-black rounded uppercase tracking-widest">{selected.product.sku}</span>
                  <span className="px-2 py-0.5 bg-zinc-100 text-zinc-500 text-[8px] font-black rounded uppercase tracking-widest">{selected.product.stoneType}</span>
                </div>
              </div>

              <div className="space-y-2 py-1">
                <div className="flex justify-between items-center py-2 border-b border-zinc-50">
                  <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Dimensions</span>
                  <span className="text-[10px] font-black italic">{selected.variant.sizeLabel}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-zinc-50">
                  <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Collection</span>
                  <span className="text-[10px] font-black uppercase italic">{selected.product.collection}</span>
                </div>
              </div>

              <div className="bg-zinc-950 text-white p-5 rounded-[20px] shadow-2xl shadow-zinc-300 relative overflow-hidden group">
                <div className="relative z-10">
                  <p className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2 italic">Net Rate</p>
                  <div className="text-[32px] font-black tracking-tighter italic leading-none">
                    {selected.displayPrice ? `${currency} ${fmt(selected.displayPrice)}` : "—"}
                    <span className="text-[10px] text-zinc-500 font-bold ml-1 not-italic lowercase">/{unit}</span>
                  </div>
                  <button className="w-full bg-white text-zinc-950 py-3 rounded-xl text-[10px] font-black uppercase mt-5 hover:bg-zinc-50 active:scale-95 transition-all border border-zinc-100">Generate Quotation</button>
                </div>
              </div>
              
              <div className="bg-zinc-50/80 p-3 rounded-xl flex items-start gap-3 border border-zinc-100">
                <Info size={12} className="text-zinc-400 mt-0.5 shrink-0" />
                <p className="text-[9px] font-bold text-zinc-400 leading-tight italic uppercase italic">Pricing is subject to daily currency fluctuations.</p>
              </div>
            </div>
          ) : (
            <div className="h-40 border border-dashed border-zinc-200 rounded-[24px] flex items-center justify-center text-[9px] font-black text-zinc-300 uppercase tracking-[0.2em] px-8 text-center leading-relaxed italic">Select material to view terminal details</div>
          )}
        </aside>
      </main>
    </div>
  );
}