"use client";
import { useCallback, useEffect, useState } from "react";
import { FileText, RefreshCw, Building2 } from "lucide-react";
import type { ZohoBusiness, ZohoRecord } from "@/lib/zoho-business";

function money(n: number, currency: string) {
  try { return new Intl.NumberFormat("en-US", {style:"currency",currency,maximumFractionDigits:2}).format(n); }
  catch { return currency + " " + n.toFixed(2); }
}
function RecordList({title,items}:{title:string;items:ZohoRecord[]}) {
  return <section className="rounded-2xl border border-[#E9E2D8] bg-white p-4 sm:p-5">
    <h3 className="font-serif text-[20px] text-[#29231E]">{title} <span className="text-[12px] text-[#9B8B72]">({items.length})</span></h3>
    {items.length === 0 && <p className="mt-4 text-[13px] text-[#857C6D]">No matching records in Zoho.</p>}
    <div className="mt-3 divide-y divide-[#F0EBE3]">
      {items.slice(0,30).map(item=><div key={item.id} className="flex flex-wrap justify-between gap-2 py-3">
        <div className="min-w-0 flex-1">
          <p className="break-words text-[13px] font-semibold text-[#29231E]">{item.reference||item.subject||"Record"}</p>
          <p className="text-[11px] text-[#81786B]">{item.date||"No date"} · {item.status||"No status"}</p>
        </div>
        <span className="text-[13px] font-semibold tabular-nums">{money(item.total,item.currency)}</span>
      </div>)}
      {items.length>30 && <p className="py-2 text-center text-[12px] text-[#81786B]">Showing 30 of {items.length}</p>}
    </div>
  </section>;
}
export default function ZohoBusinessView({url,title="Zoho Business Overview",compact=false}:{url:string;title?:string;compact?:boolean}) {
  const [data,setData]=useState<ZohoBusiness|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const refresh=useCallback(async()=>{
    setLoading(true);setError("");
    try {
      const res=await fetch(url,{cache:"no-store",credentials:"same-origin"});
      const body=await res.json();
      if(!res.ok||!body.ok) throw new Error(body.error||"Zoho data unavailable");
      setData(body.data);
    } catch(e:any) {setData(null);setError(e instanceof Error?e.message:"Zoho data unavailable");}
    finally {setLoading(false);}
  },[url]);
  useEffect(()=>{void refresh();},[refresh]);
  return <section aria-label="Zoho distributor data" className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#B6935D]">Source: Zoho CRM</p>
        <h2 className="mt-1 font-serif text-[27px] text-[#29231E] sm:text-[34px]">{title}</h2>
        <p className="text-[12px] text-[#847B6D]">Invoices, commercial orders, quotes and contacts from the linked Zoho Account</p>
      </div>
      <button onClick={()=>void refresh()} disabled={loading} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#E8D9C1] px-4 text-[13px] disabled:opacity-50"><RefreshCw size={16}/>{loading?"Loading…":"Refresh"}</button>
    </div>
    {loading ? <p className="rounded-xl border border-[#E9E2D8] bg-white p-5 text-[13px]">Retrieving Zoho data…</p> :
     error ? <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-[13px] text-amber-900">{error}. No sales totals will be displayed.</p> :
     data && <>
       {!compact && <div className="flex flex-wrap items-center gap-2 rounded-xl bg-[#F8F5EE] p-4"><Building2 size={19} className="text-[#AF8E58]"/><strong>{data.account.name}</strong><span className="text-[11px] text-[#857C6D]">Retrieved {new Date(data.syncedAt).toLocaleString()}</span></div>}
       {!data.invoicesComplete && <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-[12px] text-amber-900">Zoho invoice totals are unavailable. This dashboard will not show incomplete financial figures.</p>}
       <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
         {data.totals.length===0?<p className="rounded-xl bg-[#F8F5EE] p-4 text-[13px]">No invoices linked to this account.</p>:
         data.totals.map(t=><div key={t.currency} className="rounded-2xl border border-[#E9E2D8] bg-white p-4">
           <div className="flex items-center justify-between text-[11px] font-semibold uppercase text-[#897C69]">Invoiced Sales · {t.currency}<FileText size={17} className="text-[#B6955F]"/></div>
           <p className="mt-3 break-words text-[26px] font-semibold tabular-nums text-[#29231E]">{data.invoicesComplete?money(t.invoiceValue,t.currency):"Incomplete"}</p>
           <p className="mt-1 text-[12px] text-[#847B6D]">{t.invoiceCount} invoices · {new Date().getFullYear()}: {data.invoicesComplete?money(t.thisYearValue,t.currency):"Incomplete"}</p>
         </div>)}
       </div>
       <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
         {[["Invoices in Zoho",data.totals.reduce((sum,t)=>sum+t.invoiceCount,0)],["Pro Forma shown",data.proformas.length],["Quotes shown",data.quotes.length],["Contacts shown",data.contacts.length]].map(x=>
           <div key={x[0]} className="rounded-xl border border-[#E9E2D8] bg-white p-3"><p className="text-[24px] font-semibold">{x[1]}</p><p className="text-[12px] text-[#857C6D]">{x[0]}</p></div>)}
       </div>
       {!compact && <>
         <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-2">
           <RecordList title="Recent Invoices" items={data.invoices}/>
           <RecordList title="Recent Pro Forma Invoices" items={data.proformas}/>
           <RecordList title="Recent Quotes" items={data.quotes}/>
           <RecordList title="Recent Deals" items={data.deals}/>
         </div>
         <section className="rounded-xl border border-[#E9E2D8] bg-white p-4">
           <h3 className="font-serif text-[21px]">Zoho Contacts</h3>
           <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
             {data.contacts.map(c=><div key={c.id} className="rounded-lg bg-[#F8F6F1] p-3"><p className="text-[13px] font-semibold">{c.name}</p><p className="break-all text-[12px] text-[#837C72]">{c.email||"No email"} {c.phone||""}</p></div>)}
           </div>
         </section>
       </>}
       <p className="text-[11px] leading-5 text-[#81776C]">Figures use Zoho CRM Invoices, excluding cancelled/void records. Amounts are not payments collected or downstream distributor retail sales. Currencies remain separate. {data.invoicesOmittedByStatus>0?String(data.invoicesOmittedByStatus)+" cancelled/void invoices excluded from the recent list.":""}</p>
     </>}
  </section>;
}
