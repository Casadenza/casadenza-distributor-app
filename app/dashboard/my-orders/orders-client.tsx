"use client";

import { useMemo, useState } from "react";
import { Search, RefreshCw, X, ChevronDown, ChevronUp, Printer, Calendar, Package, CreditCard, Ship } from "lucide-react";

// --- Helpers ---
function cn(...a: Array<string | undefined | null | false>) {
  return a.filter(Boolean).join(" ");
}

function safeParseNotes(notes: any) {
  if (!notes) return null;
  try {
    const obj = JSON.parse(String(notes));
    return obj && typeof obj === "object" ? obj : null;
  } catch { return null; }
}

function money(n: any) {
  const v = Number(n ?? 0);
  return Number.isFinite(v) ? v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00";
}

function statusPill(status: string) {
  switch (status) {
    case "RECEIVED": return "bg-slate-50 text-slate-600 border-slate-200";
    case "CONFIRMED": return "bg-indigo-50 text-indigo-600 border-indigo-100";
    case "IN_PRODUCTION": return "bg-amber-50 text-amber-600 border-amber-100";
    case "DISPATCHED": return "bg-emerald-50 text-emerald-600 border-emerald-100";
    default: return "bg-zinc-50 text-zinc-500 border-zinc-100";
  }
}

const labelCls = "text-[9px] font-bold text-[#A39E93] uppercase tracking-[0.1em] mb-1";
const valCls = "text-[11px] text-[#1A1A1A] font-medium leading-tight truncate";

export default function OrdersClient({ initialItems }: { initialItems: any[] }) {
  const [items] = useState<any[]>(initialItems || []);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  
  const [status, setStatus] = useState("ALL");
  const [orderType, setOrderType] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [q, setQ] = useState("");

  const filteredOrders = useMemo(() => {
    return items.filter((o) => {
      if (status !== "ALL" && o.status !== status) return false;
      const meta = safeParseNotes(o.notes) || {};
      if (orderType !== "ALL" && String(meta?.orderType || "").toUpperCase() !== orderType) return false;
      if (fromDate || toDate) {
        const orderDate = new Date(o.createdAt).getTime();
        if (fromDate && orderDate < new Date(fromDate).getTime()) return false;
        if (toDate) {
          const end = new Date(toDate); end.setHours(23, 59, 59, 999);
          if (orderDate > end.getTime()) return false;
        }
      }
      if (q) return JSON.stringify(o).toLowerCase().includes(q.toLowerCase());
      return true;
    });
  }, [items, status, orderType, fromDate, toDate, q]);

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Frozen/Sticky Header with All Original Filters */}
      <div className="sticky top-0 z-40 bg-white border-b border-[#EEEAE2] shadow-sm">
        <div className="px-4 py-3 flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[140px]">
            <h1 className="text-sm font-serif font-bold uppercase tracking-[0.2em]">Orders</h1>
            <p className="text-[9px] text-[#A39E93] font-bold uppercase">{filteredOrders.length} Items</p>
          </div>

          <div className="w-[160px]">
            <div className={labelCls}>Search</div>
            <div className="relative border-b border-[#EEEAE2]">
              <input value={q} onChange={e => setQ(e.target.value)} className="w-full bg-transparent py-1 text-[11px] outline-none" placeholder="Find anything..." />
              <Search className="absolute right-0 top-1 text-[#A39E93]" size={12} />
            </div>
          </div>

          <div className="w-[120px]">
            <div className={labelCls}>From</div>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-full bg-transparent border-b border-[#EEEAE2] py-1 text-[11px] outline-none" />
          </div>

          <div className="w-[120px]">
            <div className={labelCls}>To</div>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-full bg-transparent border-b border-[#EEEAE2] py-1 text-[11px] outline-none" />
          </div>

          <div className="w-[100px]">
            <div className={labelCls}>Status</div>
            <select value={status} onChange={e => setStatus(e.target.value)} className="w-full bg-transparent border-b border-[#EEEAE2] py-1 text-[11px] outline-none">
              <option value="ALL">All Status</option>
              <option value="RECEIVED">Received</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="IN_PRODUCTION">Production</option>
              <option value="DISPATCHED">Dispatched</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button onClick={() => window.location.reload()} className="p-1.5 border border-[#E5E0D8]"><RefreshCw size={13}/></button>
            <button onClick={() => {setQ(""); setFromDate(""); setToDate(""); setStatus("ALL"); setOrderType("ALL");}} className="p-1.5 border border-[#E5E0D8] bg-black text-white"><X size={13}/></button>
          </div>
        </div>
      </div>

      {/* Main Table Head */}
      <div className="bg-[#FBF9F6] border-b border-[#EEEAE2] grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr_0.8fr_40px] px-6 py-2 sticky top-[65px] z-30">
        <div className={labelCls}>Order Detail</div>
        <div className={labelCls}>Status</div>
        <div className={labelCls}>Port</div>
        <div className={labelCls}>Order Type</div>
        <div className={labelCls}>Incoterm</div>
        <div className={labelCls}>Buyer PO</div>
        <div className={labelCls + " text-right"}>Total</div>
        <div></div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#F2EFE9]">
        {filteredOrders.map((o) => {
          const meta = safeParseNotes(o.notes) || {};
          const isOpen = !!expanded[o.id];
          
          return (
            <div key={o.id} className="group">
              <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr_0.8fr_40px] px-6 py-3 hover:bg-[#FDFCFB] transition-colors items-center">
                <div className="flex flex-col pr-4 border-r border-[#EEEAE2]">
                  <div className="text-[12px] font-bold text-black">{meta?.poNumber ? `PO-${meta.poNumber}` : `ORD-${String(o.id).slice(-6)}`}</div>
                  <div className="text-[10px] text-[#A39E93]">{meta?.poDate || new Date(o.createdAt).toLocaleDateString()}</div>
                </div>
                <div className="px-2 border-r border-[#EEEAE2]">
                  <span className={cn("text-[8px] font-bold border px-1.5 py-0.5 rounded-sm uppercase", statusPill(o.status))}>
                    {String(o.status).replace("_", " ")}
                  </span>
                </div>
                <div className="px-2 border-r border-[#EEEAE2] text-[11px] truncate">{meta?.destinationPort || "—"}</div>
                <div className="px-2 border-r border-[#EEEAE2] text-[11px]">{meta?.orderType || "NEW"}</div>
                <div className="px-2 border-r border-[#EEEAE2] text-[11px] font-medium">{meta?.incoterm || "EXW"}</div>
                <div className="px-2 border-r border-[#EEEAE2] text-[11px] truncate">{meta?.buyerPoRef || "—"}</div>
                <div className="text-right px-2 font-bold text-[12px]">{meta?.currency || "INR"} {money(meta?.grandTotal || 0)}</div>
                <div className="flex justify-end">
                  <button onClick={() => setExpanded(p => ({...p, [o.id]: !isOpen}))} className={cn("p-1 transition-all", isOpen ? "bg-black text-white" : "text-[#A39E93]")}>
                    {isOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                  </button>
                </div>
              </div>

              {/* RESTORED ALL ORIGINAL FIELDS IN EXPANDED VIEW */}
              {isOpen && (
                <div className="bg-[#FBF9F6] border-y border-[#EEEAE2] p-6 animate-in fade-in duration-300">
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    
                    {/* Column 1: Items List (Original) */}
                    <div className="lg:col-span-2 space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Package size={14} className="text-[#A39E93]"/>
                        <h4 className={labelCls}>Order Specifications</h4>
                      </div>
                      <div className="bg-white border border-[#EEEAE2] p-4 rounded-sm">
                        <table className="w-full text-[11px]">
                          <thead>
                            <tr className="border-b border-[#F2EFE9] text-[#A39E93]">
                              <th className="text-left font-medium pb-2">Product Details</th>
                              <th className="text-center font-medium pb-2">Qty</th>
                              <th className="text-right font-medium pb-2">Unit Price</th>
                              <th className="text-right font-medium pb-2">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#F2EFE9]">
                            {o.items?.map((it: any, i: number) => (
                              <tr key={i}>
                                <td className="py-2">
                                  <div className="font-medium">{it.product?.name}</div>
                                  <div className="text-[9px] text-[#A39E93]">{it.product?.sku} {it.variant?.sizeLabel ? `| Size: ${it.variant.sizeLabel}` : ""}</div>
                                </td>
                                <td className="text-center">{it.qty}</td>
                                <td className="text-right">{money(it.unitPrice)}</td>
                                <td className="text-right font-bold">{money(it.qty * it.unitPrice)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Column 2: Financial Summary (Original Fields) */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CreditCard size={14} className="text-[#A39E93]"/>
                        <h4 className={labelCls}>Financial Breakdown</h4>
                      </div>
                      <div className="bg-white border border-[#EEEAE2] p-4 rounded-sm space-y-2 text-[11px]">
                        <div className="flex justify-between text-[#A39E93]"><span>Currency</span> <span className="text-black font-bold">{meta?.currency || "INR"}</span></div>
                        <div className="flex justify-between"><span>Freight Charges</span> <span>{money(meta?.freight)}</span></div>
                        <div className="flex justify-between"><span>Insurance</span> <span>{money(meta?.insurance)}</span></div>
                        <div className="flex justify-between"><span>Other Charges</span> <span>{money(meta?.otherCharge)}</span></div>
                        <div className="flex justify-between text-rose-600"><span>Discount</span> <span>-{money(meta?.discount)}</span></div>
                        <div className="pt-2 mt-2 border-t border-[#F2EFE9] flex justify-between text-[13px] font-bold">
                          <span>Grand Total</span>
                          <span className="text-black">{money(meta?.grandTotal)}</span>
                        </div>
                      </div>
                      {/* Print Button in Expanded view */}
                      <button onClick={() => window.open(`/dashboard/my-orders/print/${o.id}`)} className="w-full py-2 bg-black text-white text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-zinc-800">
                        <Printer size={14}/> Download PDF Invoice
                      </button>
                    </div>

                    {/* Column 3: Logistics & Auth (Original Fields) */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Ship size={14} className="text-[#A39E93]"/>
                        <h4 className={labelCls}>Logistics & Auth</h4>
                      </div>
                      <div className="bg-white border border-[#EEEAE2] p-4 rounded-sm space-y-3">
                        <div className="text-[10px]">
                          <span className="text-[#A39E93] block uppercase font-bold text-[8px]">Delivery Method</span>
                          <span className="font-medium">{meta?.deliveryMethod || "Not Specified"}</span>
                        </div>
                        <div className="border-t border-[#F2EFE9] pt-2">
                          <span className="text-[#A39E93] block uppercase font-bold text-[8px]">Authorized Signatory</span>
                          {meta?.signatureDataUrl && (
                            <img src={meta.signatureDataUrl} className="h-8 grayscale my-1" alt="sig" />
                          )}
                          <div className="text-[11px] font-bold mt-1">{meta?.signerName || "Unsigned"}</div>
                        </div>
                        <div className="border-t border-[#F2EFE9] pt-2 text-[9px] text-[#A39E93] font-mono">
                          ID: {o.id}
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}