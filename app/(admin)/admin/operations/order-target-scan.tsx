"use client";
import { useState } from "react";

type OrderChoice={id:string;customer:string;qty:number;date:string;invoice:string};
export default function OrderTargetScan({orders}:{orders:OrderChoice[]}) {
  const [search,setSearch]=useState("");
  const [orderId,setOrderId]=useState("");
  const [busy,setBusy]=useState(false);
  const [result,setResult]=useState("");
  const filtered=orders.filter(o=>(o.customer+" "+o.invoice+" "+o.qty+" "+o.date).toLowerCase().includes(search.toLowerCase())).slice(0,70);
  async function scan(){
    if(!orderId||busy)return;
    setBusy(true);setResult("");
    try{
      const response=await fetch("/api/admin/operations/order-scan",{
        method:"POST",headers:{"content-type":"application/json"},
        body:JSON.stringify({orderId}),
      });
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"Unable to search Gmail");
      setResult("Inspected "+data.messagesInspected+" unique emails and extracted text from "+data.pdfsParsed+" PDFs; "+data.matchedCandidates+
        " proposed document/order matches; "+data.added+" newly queued. No documents shared. Refresh to see the queue.");
    }catch(e){setResult(e instanceof Error?e.message:"Search failed");}
    finally{setBusy(false);}
  }
  return <section className="rounded-xl border bg-white p-4 space-y-3">
    <h2 className="font-semibold">Find shipment documents for an existing order</h2>
    <p className="text-sm text-stone-600">Searches historical Gmail by the selected customer's identity, PO, and invoice; results remain proposed matches.</p>
    <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find customer, invoice or 175 sheets" className="w-full rounded border p-2 text-sm" aria-label="Filter orders"/>
    <select value={orderId} onChange={e=>setOrderId(e.target.value)} className="w-full rounded border p-2 text-sm" aria-label="Select order">
      <option value="">Choose an order</option>
      {filtered.map(o=><option value={o.id} key={o.id}>{o.customer} · {o.qty} sheets · {o.invoice||o.date}</option>)}
    </select>
    <button className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white disabled:opacity-50" disabled={!orderId||busy} onClick={()=>void scan()}>
      {busy?"Searching Gmail…":"Find related emails and PDFs"}
    </button>
    {result&&<p role="status" className="text-sm text-stone-700">{result}</p>}
  </section>;
}
