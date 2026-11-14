"use client";
import { useMemo, useState } from "react";

type Order={id:string;customer:string;country:string;date:string;quantity:number;invoice:string;po:string;linked:number};
type Match={id:string;orderId:string;kind:string;filename:string;subject:string;confidence:number;evidence:string[];reason:string;date:string};
const label:Record<string,string>={
  PURCHASE_ORDER:"Purchase order",PROFORMA_INVOICE:"Proforma invoice (PI)",INVOICE:"Commercial invoice",
  PACKING_LIST:"Packing list",SHIPPING_BILL:"Shipping bill (SB)",AWB_HAWB:"AWB / HAWB",OTHER:"Other",
};
export default function PreviewClient({orders,matches,queueCount,unmatchedCount}:{
  orders:Order[];matches:Match[];queueCount:number;unmatchedCount:number;
}) {
  const [search,setSearch]=useState("");
  const [onlyMatched,setOnlyMatched]=useState(false);
  const [expanded,setExpanded]=useState<string|null>(null);
  const visible=useMemo(()=>orders.filter(o=>{
    if(onlyMatched && !o.linked)return false;
    const haystack=[o.customer,o.country,o.quantity,o.invoice,o.po,o.id].join(" ").toLowerCase();
    return haystack.includes(search.trim().toLowerCase());
  }).slice(0,100),[orders,search,onlyMatched]);
  const grouped=useMemo(()=>{
    const m=new Map<string,Match[]>();
    for(const x of matches)m.set(x.orderId,[...(m.get(x.orderId)||[]),x]);
    return m;
  },[matches]);
  const known=orders.filter(o=>o.linked>0).length;
  return <div className="space-y-4">
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="rounded-xl border bg-white p-4"><p className="text-xs text-stone-500">Distributor orders</p><p className="mt-1 text-2xl font-semibold">{orders.length}</p></div>
      <div className="rounded-xl border bg-white p-4"><p className="text-xs text-stone-500">Orders with proposals</p><p className="mt-1 text-2xl font-semibold">{known}</p></div>
      <div className="rounded-xl border bg-white p-4"><p className="text-xs text-stone-500">Proposed documents</p><p className="mt-1 text-2xl font-semibold">{matches.length}</p></div>
      <div className="rounded-xl border bg-white p-4"><p className="text-xs text-stone-500">Unresolved candidates</p><p className="mt-1 text-2xl font-semibold">{unmatchedCount}</p></div>
    </section>
    <section className="rounded-xl border bg-white p-4 space-y-3">
      <input aria-label="Search order" placeholder="Search Dubai, Wow Factor, 175 sheets, invoice or PO"
        className="w-full rounded-lg border px-3 py-2 text-sm" value={search} onChange={e=>setSearch(e.target.value)}/>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={onlyMatched}
        onChange={e=>setOnlyMatched(e.target.checked)}/>Show only orders with proposed documents</label>
      <p className="text-xs text-stone-500">Showing {visible.length} of {orders.length} orders. Existing Gmail queue: {queueCount} items.</p>
    </section>
    <section className="space-y-3">
      {visible.length===0&&<p className="rounded-xl border p-4 text-sm">No matching portal orders in the loaded set. Try a wider search; an email-only order may not yet exist as a portal order.</p>}
      {visible.map(o=>{
        const docs=grouped.get(o.id)||[];
        const open=expanded===o.id;
        return <article className="rounded-xl border bg-white p-4" key={o.id}>
          <button type="button" className="w-full text-left" onClick={()=>setExpanded(open?null:o.id)}
            aria-expanded={open}>
            <div className="flex items-start justify-between gap-3">
              <div><h2 className="font-semibold text-stone-900">{o.customer}</h2>
                <p className="text-xs text-stone-500">{o.country||"Country not recorded"} · {o.date} · {o.quantity} sheets</p>
                <p className="mt-1 text-xs text-stone-600">Invoice: {o.invoice||"Not recorded"} · PO: {o.po||"Not recorded"}</p></div>
              <span className="shrink-0 rounded-lg border px-3 py-1 text-xs">{docs.length} proposals {open?"−":"+"}</span>
            </div>
          </button>
          {open&&<div className="mt-4 space-y-3 border-t pt-4">
            {docs.length===0 ? <p className="text-sm text-amber-800">No evidence-backed documents found in the existing scan queue. Search this order in the Gmail review page to inspect older messages.</p> :
              docs.map(d=><div className="rounded-lg border border-amber-200 bg-amber-50/40 p-3" key={d.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-sm">{label[d.kind]||d.kind}</strong>
                  <span className="text-xs text-amber-900">Proposed · score {d.confidence}/100</span>
                </div>
                <p className="mt-1 text-sm">{d.filename}</p>
                <p className="text-xs text-stone-600">{d.subject}</p>
                <p className="mt-2 text-xs text-stone-600">Evidence: {d.evidence.join(", ")}</p>
                <p className="mt-1 text-xs text-amber-900">Not shared · PDF content unverified</p>
              </div>)}
          </div>}
        </article>;
      })}
    </section>
  </div>;
}
