"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Plus, Printer, RefreshCw, Trash2, AlertTriangle, ChevronRight, Layers } from "lucide-react";

// --- Types ---
type PackingType = "ROLL" | "PALLET" | "CRATE";
type Variant = { id: string; collection: string; stoneType: string; sizeLabel: string; };
type LineDraft = { id: string; variantId: string; collection: string; stoneType: string; sizeLabel: string; packingType: PackingType; unit: "PER_SHEET"; qty: number; };
type PackRow = { no: number; packingType: string; sizeLabel: string; qtySheets: number; dimensions: string; netWeightKg: number; grossWeightKg: number; };
type CalcResponseResult = { totalUnits: number; totalPallets: number | null; netWeightKg: number; grossWeightKg: number; packRows: PackRow[]; };

// --- Helpers ---
const toNum = (v: any, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const round = (n: any, d = 2) => Number(Math.round(Number(n + "e" + d)) + "e-" + d) || 0;

export default function PackingCalculatorPage() {
  const printRef = useRef<HTMLDivElement | null>(null);
  const [isPending, startTransition] = useTransition();
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [collection, setCollection] = useState("");
  const [stoneType, setStoneType] = useState("");
  const [sizeLabel, setSizeLabel] = useState("");
  const [packingType, setPackingType] = useState<PackingType>("ROLL");
  const [qty, setQty] = useState<number>(20);
  
  const [lines, setLines] = useState<LineDraft[]>([]);
  const [result, setResult] = useState<CalcResponseResult | null>(null);
  const [calcErr, setCalcErr] = useState<string | null>(null);

  async function loadVariants() {
    setLoading(true);
    try {
      const res = await fetch(`/api/packing/variants?take=10000&active=1`);
      const data = await res.json();
      const items = (data?.items || data || []).map((it: any) => ({
        id: String(it.variant?.id || it.id),
        collection: String(it.product?.collection || it.collection || ""),
        stoneType: String(it.product?.stoneType || it.stoneType || ""),
        sizeLabel: String(it.variant?.sizeLabel || it.sizeLabel || ""),
      })).filter((v: any) => v.id && v.collection);
      setVariants(items);
    } catch (e) { setCalcErr("Sync failed."); } finally { setLoading(false); }
  }

  useEffect(() => { loadVariants(); }, []);

  const collections = useMemo(() => Array.from(new Set(variants.map(v => v.collection))).sort(), [variants]);
  const stoneTypes = useMemo(() => Array.from(new Set(variants.filter(v => !collection || v.collection === collection).map(v => v.stoneType))).sort(), [variants, collection]);
  const sizes = useMemo(() => Array.from(new Set(variants.filter(v => (!collection || v.collection === collection) && (!stoneType || v.stoneType === stoneType)).map(v => v.sizeLabel))).sort(), [variants, collection, stoneType]);
  const selectedVariant = useMemo(() => variants.find(v => v.collection === collection && v.stoneType === stoneType && v.sizeLabel === sizeLabel), [variants, collection, stoneType, sizeLabel]);

  function addLine() {
    if (!selectedVariant) return;
    setLines(p => [...p, { id: Math.random().toString(36), variantId: selectedVariant.id, collection, stoneType, sizeLabel, packingType, unit: "PER_SHEET", qty }]);
    setResult(null);
  }

  async function calculate() {
    setCalcErr(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/packing/calculate`, { 
          method: "POST", 
          headers: { "Content-Type": "application/json" }, 
          body: JSON.stringify({ unit: "PER_SHEET", lines: lines.map(l => ({ variantId: l.variantId, qty: l.qty, packingType: l.packingType })) }) 
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "Calculation failed");
        setResult(data.result);
      } catch (e: any) { setCalcErr(e.message); }
    });
  }

  // --- Professional Packing List Print Logic ---
  const handlePrint = () => {
    if (!result) return;
    const win = window.open("", "_blank");
    if (!win) return;

    const rowsHtml = result.packRows.map(p => `
      <tr>
        <td># ${p.no}</td>
        <td style="text-transform: uppercase;">${p.packingType}</td>
        <td style="text-align: right;"><b>${p.qtySheets}</b></td>
        <td style="text-align: center;">${p.dimensions ? p.dimensions + '″' : p.sizeLabel + '″'}</td>
        <td style="text-align: right;">${round(p.netWeightKg, 1)} kg</td>
        <td style="text-align: right;"><b>${round(p.grossWeightKg > 0 ? p.grossWeightKg : p.netWeightKg * 1.05, 1)} kg</b></td>
      </tr>
    `).join("");

    win.document.write(`
      <html>
        <head>
          <title>Packing List - Casadenza</title>
          <style>
            body { font-family: 'Inter', 'Segoe UI', sans-serif; padding: 40px; color: #1a1a1a; line-height: 1.4; }
            .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #1a1a1a; padding-bottom: 20px; margin-bottom: 30px; }
            .brand { font-size: 24px; font-weight: 800; letter-spacing: -0.02em; }
            .brand span { color: #C5A267; }
            .meta { text-align: right; font-size: 11px; font-weight: 600; text-transform: uppercase; color: #666; }
            .title-box { text-align: center; margin: 40px 0; }
            .title-box h1 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.3em; border: 1px solid #1a1a1a; display: inline-block; padding: 8px 30px; font-weight: 700; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; border: 1px solid #000; }
            th { background: #f8f8f8; padding: 12px 10px; border: 1px solid #000; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; text-align: left; }
            td { padding: 10px; border: 1px solid #eee; font-size: 11px; border-right: 1px solid #000; border-left: 1px solid #000; }
            tr:last-child td { border-bottom: 1px solid #000; }
            .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); margin-top: 30px; border: 2px solid #000; background: #000; color: #fff; }
            .sum-item { padding: 15px; text-align: center; border-right: 1px solid #333; }
            .sum-item:last-child { border-right: none; }
            .sum-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: #aaa; margin-bottom: 5px; display: block; }
            .sum-val { font-size: 16px; font-weight: 700; }
            .footer { margin-top: 60px; font-size: 9px; color: #999; text-transform: uppercase; text-align: center; letter-spacing: 0.1em; }
            @media print { body { padding: 20px; } .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand">CASADENZA<span> ATELIER</span></div>
            <div class="meta">Date: ${new Date().toLocaleDateString()}<br>REF: ${Math.random().toString(36).substring(7).toUpperCase()}</div>
          </div>
          <div class="title-box"><h1>Official Packing Specification</h1></div>
          <table>
            <thead>
              <tr>
                <th>No</th><th>Type</th><th style="text-align:right;">Sheets</th><th style="text-align:center;">Dimensions</th><th style="text-align:right;">Net Wt</th><th style="text-align:right;">Gross Wt</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <div class="summary-grid">
            <div class="sum-item"><span class="sum-label">Total Packs</span><div class="sum-val">${result.totalUnits}</div></div>
            <div class="sum-item"><span class="sum-label">Net Weight</span><div class="sum-val">${round(result.netWeightKg, 1)} kg</div></div>
            <div class="sum-item"><span class="sum-label" style="color:#C5A267">Gross Weight</span><div class="sum-val" style="color:#C5A267">${round(result.grossWeightKg > 0 ? result.grossWeightKg : result.netWeightKg * 1.05, 1)} kg</div></div>
            <div class="sum-item"><span class="sum-label">Total Pallets</span><div class="sum-val">${result.totalPallets || '—'}</div></div>
          </div>
          <div class="footer">Computer generated specification - Casadenza Logistics Division - This is only for your information and not the actual packing list.</div>
        </body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <div className="min-h-screen bg-[#FBFBF9] text-[#1A1A1A]">
      {/* FREEZE HEADER */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#EAE7E2] px-6 py-4 shadow-sm">
        <div className="max-w-[1400px] mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-lg font-light tracking-[0.2em] uppercase">Packing <span className="font-bold text-[#C5A267]">Calculator</span></h1>
            <p className="text-[9px] text-[#A39E93] font-bold uppercase tracking-widest">Protocol v2.1</p>
          </div>
          <div className="flex gap-4">
            <button onClick={loadVariants} className="text-[10px] font-bold uppercase tracking-widest text-[#8C877D] hover:text-black flex items-center gap-2"><RefreshCw className={`w-3 h-3 ${loading && 'animate-spin'}`} /> Sync</button>
            {result && <button onClick={handlePrint} className="bg-black text-white text-[10px] px-5 py-2.5 rounded font-bold uppercase tracking-[0.1em] hover:bg-[#C5A267] transition-all flex items-center gap-2"><Printer className="w-3.5 h-3.5" /> Print Specification</button>}
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto p-6 space-y-6">
        {/* Form Section */}
        <div className="bg-white rounded border border-[#EAE7E2] p-5 grid grid-cols-1 md:grid-cols-12 gap-3 items-end shadow-sm">
          <div className="md:col-span-3"><label className="text-[9px] font-bold text-[#A39E93] uppercase mb-1 block">Collection</label><select className="w-full bg-white border border-[#EAE7E2] rounded px-3 py-1.5 text-[11px] font-semibold outline-none focus:border-[#C5A267]" value={collection} onChange={(e)=>setCollection(e.target.value)} disabled={loading}><option value="">Select</option>{collections.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
          <div className="md:col-span-3"><label className="text-[9px] font-bold text-[#A39E93] uppercase mb-1 block">Stone Type</label><select className="w-full border border-[#EAE7E2] rounded px-3 py-1.5 text-[11px] font-semibold outline-none" value={stoneType} onChange={(e)=>setStoneType(e.target.value)} disabled={!collection}><option value="">Select</option>{stoneTypes.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
          <div className="md:col-span-2"><label className="text-[9px] font-bold text-[#A39E93] uppercase mb-1 block">Size</label><select className="w-full border border-[#EAE7E2] rounded px-3 py-1.5 text-[11px] font-semibold outline-none" value={sizeLabel} onChange={(e)=>setSizeLabel(e.target.value)} disabled={!stoneType}><option value="">Select</option>{sizes.map(sz=><option key={sz} value={sz}>{sz}</option>)}</select></div>
          <div className="md:col-span-2"><label className="text-[9px] font-bold text-[#A39E93] uppercase mb-1 block">Packing</label><select className="w-full border border-[#EAE7E2] rounded px-3 py-1.5 text-[11px] font-semibold outline-none" value={packingType} onChange={(e:any)=>setPackingType(e.target.value)}><option value="ROLL">ROLL</option><option value="PALLET">PALLET</option><option value="CRATE">CRATE</option></select></div>
          <div className="md:col-span-1"><label className="text-[9px] font-bold text-[#A39E93] uppercase mb-1 block">Qty</label><input type="number" className="w-full border border-[#EAE7E2] rounded px-3 py-1.5 text-[12px] font-bold" value={qty} onChange={(e)=>setQty(toNum(e.target.value, 1))} /></div>
          <div className="md:col-span-1"><button onClick={addLine} disabled={!selectedVariant} className="w-full h-[34px] bg-black text-white rounded flex items-center justify-center hover:bg-[#C5A267] transition-all"><Plus className="w-4 h-4" /></button></div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="bg-white rounded border border-[#EAE7E2] h-fit overflow-hidden">
             <div className="bg-[#FBFAF8] px-4 py-2.5 border-b border-[#EAE7E2] flex justify-between items-center"><span className="text-[10px] font-bold uppercase tracking-widest text-[#C5A267]">Items to Pack</span><button onClick={calculate} disabled={!lines.length || isPending} className="bg-black text-white text-[9px] px-3 py-1.5 rounded uppercase font-bold hover:bg-[#C5A267] transition-all">{isPending ? "..." : "Calculate"}</button></div>
             <div className="divide-y divide-[#F3F1ED] max-h-[300px] overflow-y-auto">
                {lines.map(l => (
                  <div key={l.id} className="p-3 flex justify-between items-center">
                    <div className="text-[11px] font-bold">{l.collection} <span className="text-[9px] font-normal text-gray-400">({l.sizeLabel})</span></div>
                    <div className="flex items-center gap-3"><span className="text-[11px] font-mono font-bold bg-gray-50 px-2 py-0.5 rounded">{l.qty}</span><button onClick={()=>setLines(p=>p.filter(x=>x.id!==l.id))} className="text-red-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button></div>
                  </div>
                ))}
             </div>
          </div>

          <div className="xl:col-span-2">
            {result ? (
              <div className="space-y-4">
                <div className="bg-white rounded border border-[#EAE7E2] shadow-sm overflow-hidden" ref={printRef}>
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-[#FBFAF8] text-[#A39E93] text-[9px] font-bold uppercase tracking-widest border-b border-[#EAE7E2]">
                      <tr><th className="px-5 py-3">No</th><th className="px-5 py-3">Type</th><th className="px-5 py-3 text-right">Sheets</th><th className="px-5 py-3 text-center">Dimensions</th><th className="px-5 py-3 text-right">Net Wt</th><th className="px-5 py-3 text-right">Gross Wt</th></tr>
                    </thead>
                    <tbody className="divide-y divide-[#F3F1ED]">
                      {result.packRows.map((p, i) => (
                        <tr key={i}>
                          <td className="px-5 py-2.5 font-bold text-[#888]"># {p.no}</td>
                          <td className="px-5 py-2.5 uppercase font-medium">{p.packingType}</td>
                          <td className="px-5 py-2.5 text-right font-mono font-bold">{p.qtySheets}</td>
                          {/* Design Fixed: Dimensions Inch symbol and Fallback */}
                          <td className="px-5 py-2.5 text-center font-mono text-gray-500">{p.dimensions ? `${p.dimensions}″` : `${p.sizeLabel}″`}</td>
                          <td className="px-5 py-2.5 text-right font-mono">{round(p.netWeightKg, 1)} kg</td>
                          {/* Design Fixed: Gross Wt Fallback to avoid 0kg */}
                          <td className="px-5 py-2.5 text-right font-mono font-bold text-[#C5A267]">{round(p.grossWeightKg > 0 ? p.grossWeightKg : p.netWeightKg * 1.05, 1)} kg</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {/* DESIGN FIXED: Professional Summary Grid */}
                  <div className="bg-black text-white px-6 py-4 grid grid-cols-4 gap-4 items-center">
                    <div><span className="text-[8px] uppercase tracking-widest text-gray-500 block">Packs</span><div className="text-lg font-bold">{result.totalUnits}</div></div>
                    <div><span className="text-[8px] uppercase tracking-widest text-gray-500 block">Net Total</span><div className="text-lg font-bold">{round(result.netWeightKg, 1)} <span className="text-[9px]">KG</span></div></div>
                    <div><span className="text-[8px] uppercase tracking-widest text-[#C5A267] block">Gross Total</span><div className="text-lg font-bold text-[#C5A267]">{round(result.grossWeightKg > 0 ? result.grossWeightKg : result.netWeightKg * 1.05, 1)} <span className="text-[9px]">KG</span></div></div>
                    <div><span className="text-[8px] uppercase tracking-widest text-gray-500 block">Pallets</span><div className="text-lg font-bold">{result.totalPallets || "—"}</div></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-[250px] border-2 border-dashed border-[#EAE7E2] rounded flex flex-col items-center justify-center text-[#A39E93] bg-white">
                <Layers className="w-8 h-8 mb-2 opacity-20" /><p className="text-[9px] font-bold uppercase tracking-widest">Ready for Calculation</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}