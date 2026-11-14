"use client";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, FileText, MailSearch, RefreshCw, Search, ShieldCheck } from "lucide-react";

type Order = {
  id: string; distributorId: string; distributorName: string;
  country: string | null; poNumber: string; invoiceNumber: string; date: string;
};
type Candidate = {
  id: string; queueItemId?: string; mailbox: "info" | "alex"; messageId: string; partId: string | null;
  filename: string | null; subject: string; from: string; date: string; snippet: string;
  kind: "PURCHASE_ORDER" | "INVOICE" | "AWB_HAWB" | "PACKING_LIST" | "OTHER";
  state: "POSSIBLE_ORDER_MATCH" | "NEEDS_REVIEW" | "MULTIPLE_MATCHES";
  suggestedOrderId: string | null; suggestedDistributorId: string | null;
  suggestedDistributorName: string | null; reason: string;
};
type Mailbox = { mailbox: string; address: string; configured: boolean };
type Feed = { ok:boolean; mailboxes:Mailbox[]; items:Candidate[]; issues:{mailbox:string;code:string}[];
  sharingEnabled:boolean; note:string; scanMode:string; scannedMessages:number;
  queueMode?:boolean;lastScanAt?:string|null;lastScanStatus?:string;lastScanIssues?:string|null };
const input = "min-h-[44px] w-full rounded-xl border border-[#E1D9CB] bg-white px-3 text-[13px] outline-none focus:border-[#B49762]";
const button = "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#26221D] px-4 text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45";
const kindName:Record<string,string> = {
  PURCHASE_ORDER:"Purchase order", INVOICE:"Invoice", AWB_HAWB:"AWB / HAWB",
  PACKING_LIST:"Packing list", OTHER:"Other PDF",
};

export default function OperationsHubClient({orders}:{orders:Order[]}) {
  const [feed,setFeed] = useState<Feed|null>(null);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState("");
  const [notice,setNotice] = useState("");
  const [search,setSearch] = useState("");
  const [kind,setKind] = useState("ALL");
  const [status,setStatus] = useState("ALL");
  const [selectedId,setSelectedId] = useState<string|null>(null);
  const [distributorId,setDistributorId] = useState("");
  const [orderId,setOrderId] = useState("");
  const [verified,setVerified] = useState(false);
  const [publishing,setPublishing] = useState(false);
  const [distributorFilter,setDistributorFilter] = useState("");
  const [orderFilter,setOrderFilter] = useState("");

  async function refresh(reference = "") {
    if (loading) return;
    setLoading(true); setError(""); setNotice("");
    try {
      const url="/api/admin/operations-inbox"+(reference?"?reference="+encodeURIComponent(reference):"");
      const response=await fetch(url,{cache:"no-store"});
      const data=await response.json();
      if(!response.ok)throw Error(data.error || "Unable to scan order emails");
      setFeed(data);
      if(data.issues?.length)setNotice("Mailbox scan incomplete: "+data.issues.map((m:{mailbox:string;code:string})=>m.mailbox+" ("+m.code+")").join(", "));
    } catch(e:any) {setError(e?.message || "Unable to load inbox");}
    finally {setLoading(false);}
  }
  useEffect(()=>{
    void refresh();
    const timer=setInterval(()=>{void refresh();},60000);
    return ()=>clearInterval(timer);
  },[]);
  const selected=(feed?.items||[]).find(i=>i.id===selectedId)||null;
  const distributors=useMemo(()=>{
    const map=new Map<string,{id:string;name:string;country:string|null}>();
    orders.forEach(o=>map.set(o.distributorId,{id:o.distributorId,name:o.distributorName,country:o.country}));
    return Array.from(map.values()).sort((a,b)=>a.name.localeCompare(b.name));
  },[orders]);
  const filteredDistributors=useMemo(()=>{
    const q=distributorFilter.toLowerCase().trim();
    return distributors.filter(d=>!q||(d.name+" "+(d.country||"")).toLowerCase().includes(q)).slice(0,200);
  },[distributors,distributorFilter]);
  const ownedOrders=useMemo(()=>{
    if(!distributorId)return [];
    const q=orderFilter.toLowerCase().trim();
    return orders.filter(o=>o.distributorId===distributorId&&(!q||[o.poNumber,o.invoiceNumber,o.id,o.date].some(t=>t.toLowerCase().includes(q)))).slice(0,120);
  },[orders,distributorId,orderFilter]);
  const chosenOrder=orders.find(o=>o.id===orderId&&o.distributorId===distributorId);
  const candidates=useMemo(()=> (feed?.items||[]).filter(i=>{
    if(kind!=="ALL"&&i.kind!==kind)return false;
    if(status!=="ALL"&&i.state!==status)return false;
    const term=search.toLowerCase().trim();
    return !term||[i.subject,i.from,i.filename||"",i.snippet,i.suggestedDistributorName||""].some(x=>x.toLowerCase().includes(term));
  }),[feed,kind,status,search]);
  const connected=(feed?.mailboxes||[]).filter(x=>x.configured).length;
  const reviewCount=(feed?.items||[]).filter(x=>x.state!=="POSSIBLE_ORDER_MATCH").length;

  function openCandidate(item:Candidate) {
    if(selectedId===item.id){setSelectedId(null);return;}
    setSelectedId(item.id);
    setDistributorId(item.suggestedDistributorId||"");
    setOrderId(item.suggestedOrderId||"");
    setDistributorFilter("");
    setOrderFilter("");
    setVerified(false);
    setError("");
  }
  function pdfUrl(item:Candidate) {
    return "/api/admin/shipment-mail/preview?"+new URLSearchParams({
      mailbox:item.mailbox,messageId:item.messageId,partId:item.partId||"",
    }).toString();
  }
  async function publish(){
    if(!selected?.partId||!chosenOrder||!verified||!feed?.sharingEnabled||publishing)return;
    if(!window.confirm("Share this PDF with "+chosenOrder.distributorName+" under order "+(chosenOrder.poNumber||chosenOrder.id)+"? The distributor will be able to view it."))return;
    setPublishing(true);setError("");setNotice("");
    try {
      const response=await fetch("/api/admin/shipment-mail/import",{
        method:"POST",headers:{"content-type":"application/json"},
        body:JSON.stringify({mailbox:selected.mailbox,messageId:selected.messageId,partId:selected.partId,
          orderId:chosenOrder.id,distributorId:chosenOrder.distributorId,
          reference:chosenOrder.poNumber||chosenOrder.invoiceNumber||chosenOrder.id,
          confirmation:"SHARE DOCUMENT"}),
      });
      const data=await response.json();
      if(!response.ok)throw Error(data.error||"Unable to share this PDF");
      setNotice("File attached to "+chosenOrder.distributorName+"'s order; no email was forwarded.");
      setSelectedId(null);setVerified(false);
      if(feed?.queueMode) await refresh();
    }catch(e:any){setError(e?.message||"Unable to attach PDF");}
    finally{setPublishing(false);}
  }

  async function dismissCandidate(item:Candidate) {
    if(!item.queueItemId||!feed?.queueMode||publishing)return;
    if(!window.confirm("Dismiss this unrelated email or attachment? It will leave Needs Review but the original Gmail message remains unchanged."))return;
    setPublishing(true);setError("");setNotice("");
    try{
      const response=await fetch("/api/admin/operations-inbox/review",{
        method:"POST",headers:{"content-type":"application/json"},
        body:JSON.stringify({action:"DISMISS",itemId:item.queueItemId}),
      });
      const data=await response.json();
      if(!response.ok)throw Error(data.error||"Unable to dismiss");
      setFeed(prev=>prev?{...prev,items:prev.items.filter(i=>i.id!==item.id)}:prev);
      setSelectedId(null);setNotice("Unrelated item dismissed. No customer document was published.");
    }catch(e:any){setError(e?.message||"Unable to dismiss item");}
    finally{setPublishing(false);}
  }

  return <main className="mx-auto max-w-[1350px] space-y-5 px-3 py-4 sm:px-6">
    <header>
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#AD8954]">Casadenza / Admin Operations</p>
      <h1 className="mt-1 font-serif text-[29px] text-[#28221C] sm:text-[38px]">Order & Shipment Hub</h1>
      <p className="mt-2 max-w-[1000px] text-[13px] leading-6 text-[#776C5C]">
        One inbox for incoming POs, invoices, packing lists, AWB and HAWB. Suggested matches are not verified.
        Every item needing review has an Attach to Distributor workflow where you choose the correct distributor and their exact order.
      </p>
    </header>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {[
        {name:"Mailboxes configured",count:connected+" / 2",note:"Info + Alex"},
        {name:"Incoming items",count:String(feed?.items?.length||0),note:feed?.queueMode?"Stored pending queue":"Recent Gmail scan"},
        {name:"Possible order matches",count:String((feed?.items||[]).filter(i=>i.state==="POSSIBLE_ORDER_MATCH").length),note:"Verify consignee first"},
        {name:"Needs review",count:String(reviewCount),note:"Choose distributor + order"},
      ].map(m=><div className="rounded-2xl border border-[#E9E0D4] bg-white p-4" key={m.name}>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#94846F]">{m.name}</p>
        <p className="mt-2 font-serif text-[27px] text-[#2B251D]">{m.count}</p>
        <p className="mt-1 text-[11px] text-[#948676]">{m.note}</p>
      </div>)}
    </div>
    <section className="rounded-2xl border border-[#E8E0D5] bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold"><MailSearch size={18} className="text-[#B39158]"/>Connected inboxes</h2>
        <button className={button} disabled={loading} onClick={()=>void refresh()}>
          <RefreshCw size={14} className={loading?"animate-spin":""}/>{loading?"Loading…":feed?.queueMode?"Refresh automatic queue":"Scan both inboxes"}
        </button>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {(feed?.mailboxes||[{mailbox:"info",address:"info@casadenza.com",configured:false},{mailbox:"alex",address:"alex@casadenza.in",configured:false}])
          .map(m=><div className="flex items-center justify-between rounded-xl border border-[#ECE4D9] p-3 text-[12px]" key={m.mailbox}>
            <strong>{m.address}</strong><span className={m.configured?"text-emerald-700":"text-amber-800"}>
              {m.configured?"Configured":"Not connected"}</span>
          </div>)}
      </div>
      {connected<2&&<p className="mt-3 text-[12px] text-amber-900">
        Both accounts need their own read-only Gmail OAuth refresh tokens in Vercel:
        <code className="mx-1">GMAIL_REFRESH_TOKEN_INFO</code> and <code>GMAIL_REFRESH_TOKEN_ALEX</code>.
        <a className="ml-2 underline" href="https://vercel.com/casadenzas-projects/casadenza-distributor-app/settings/environment-variables" target="_blank" rel="noopener noreferrer">Configure</a>
      </p>}
      {feed?.queueMode&&<p className="mt-3 text-[12px] text-[#625849]">
        <strong>Automatic scan:</strong> Every 15 minutes · Last run: {feed.lastScanAt?new Date(feed.lastScanAt).toLocaleString():"Not yet run"} · Status: {feed.lastScanStatus||"UNKNOWN"}
        {feed.lastScanIssues&&<span className="block text-amber-800">Issue: {feed.lastScanIssues}</span>}
      </p>}
      <p className="mt-3 text-[11px] text-[#897E6B]"><ShieldCheck size={14} className="mr-1 inline"/>
        Scanning is read-only. Automatic customer-visible sharing is disabled pending private file storage and document-level identity verification.</p>
    </section>
    <section className="rounded-2xl border border-[#E8E0D5] bg-white p-4 sm:p-5">
      <div className="grid gap-3 lg:grid-cols-[1fr_175px_195px_auto] lg:items-end">
        <label className="text-[12px] font-medium text-[#716655]">Search customer / PO / invoice / AWB / HAWB
          <input className={input+" mt-1"} value={search} maxLength={90} onChange={e=>setSearch(e.target.value)}
            placeholder="Customer or exact reference" onKeyDown={e=>{if(e.key==="Enter"&&search.trim().length>=3)void refresh(search.trim());}}/>
        </label>
        <label className="text-[12px] font-medium text-[#716655]">Document type
          <select className={input+" mt-1"} value={kind} onChange={e=>setKind(e.target.value)}>
            <option value="ALL">All kinds</option>{Object.entries(kindName).map(([k,v])=><option value={k} key={k}>{v}</option>)}
          </select>
        </label>
        <label className="text-[12px] font-medium text-[#716655]">Status
          <select className={input+" mt-1"} value={status} onChange={e=>setStatus(e.target.value)}>
            <option value="ALL">All statuses</option><option value="NEEDS_REVIEW">Needs review</option>
            <option value="MULTIPLE_MATCHES">Multiple matches</option><option value="POSSIBLE_ORDER_MATCH">Suggested match</option>
          </select>
        </label>
        <button disabled={loading||search.trim().length<3} onClick={()=>void refresh(search.trim())} className={button}>
          <Search size={15}/>Search both
        </button>
      </div>
      <p className="mt-3 text-[11px] text-[#897D6D]">{candidates.length} items · {feed?.scanMode==="reference"?"Reference search":feed?.queueMode?"Automatically maintained inbox":"Recent 21-day inbox scan"}</p>
    </section>
    {error&&<p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-[12px] text-rose-900">{error}</p>}
    {notice&&<p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-[12px] text-amber-900">{notice}</p>}
    <section className="space-y-3">
      {!candidates.length&&<div className="rounded-xl border border-[#E9E1D5] bg-white p-5 text-[13px] text-[#8B7F72]">
        No matching intake items yet. Confirm both Gmail mailboxes are connected. Automatic scans will add relevant items when the production schedule is activated.
      </div>}
      {candidates.map(item=><article className="rounded-2xl border border-[#E9E0D4] bg-white p-4 sm:p-5" key={item.id}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#B08E58]">{kindName[item.kind]} · {item.mailbox==="info"?"info@casadenza.com":"alex@casadenza.in"}</p>
            <h3 className="mt-1 break-words text-[14px] font-semibold">{item.subject||"Untitled email"}</h3>
            <p className="mt-1 break-all text-[11px] text-[#8A8071]">{item.from} · {item.date}</p>
            <p className="mt-2 text-[12px] text-[#6C6258]">{item.filename||"Email body (no PDF attached)"}</p>
            <p className="mt-2 text-[11px] text-[#8A7658]">{item.reason}</p>
          </div>
          <button className={button} onClick={()=>openCandidate(item)}>
            {selectedId===item.id?"Close review":item.partId?"Review & attach to distributor":"Review order email"}
          </button>
        </div>
        {selectedId===item.id&&<div className="mt-4 space-y-4 border-t border-[#E9E3D8] pt-4">
          {item.partId?<a className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-[#DDD4C5] px-3 text-[12px] font-semibold text-[#816643]"
            href={pdfUrl(item)} target="_blank" rel="noopener noreferrer"><FileText size={15}/>Preview attached PDF <ExternalLink size={14}/></a>
            :<p className="text-[12px] text-[#89745A]">This email has no PDF attachment. Review it as a purchase-order candidate in Orders Hub before creating an order.</p>}
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-[12px] font-semibold">1. Choose distributor (or override suggested match)</label>
              <input className={input} placeholder="Find distributor…" value={distributorFilter}
                onChange={e=>setDistributorFilter(e.target.value)}/>
              <select className={input} value={distributorId}
                onChange={e=>{setDistributorId(e.target.value);setOrderId("");setVerified(false);setOrderFilter("");}}>
                <option value="">Select distributor</option>
                {distributorId&&!filteredDistributors.some(d=>d.id===distributorId)&&<option value={distributorId}>
                  {distributors.find(d=>d.id===distributorId)?.name||"Selected distributor"}
                </option>}
                {filteredDistributors.map(d=><option value={d.id} key={d.id}>{d.name}{d.country?" · "+d.country:""}</option>)}
              </select>
              <p className="text-[11px] text-[#8A7A64]">Only distributors with an existing portal order are listed.</p>
            </div>
            <div className="space-y-2">
              <label className="block text-[12px] font-semibold">2. Choose the exact order belonging to that distributor</label>
              <input className={input} placeholder="Filter PO / invoice / order ID…" value={orderFilter}
                onChange={e=>setOrderFilter(e.target.value)} disabled={!distributorId}/>
              <select className={input} value={orderId} disabled={!distributorId}
                onChange={e=>{setOrderId(e.target.value);setVerified(false);}}>
                <option value="">Select order</option>
                {orderId&&!ownedOrders.some(o=>o.id===orderId)&&chosenOrder&&
                  <option value={orderId}>{chosenOrder.poNumber||chosenOrder.id}</option>}
                {ownedOrders.map(o=><option key={o.id} value={o.id}>
                  {o.poNumber?"PO "+o.poNumber:o.id.slice(-10)}{o.invoiceNumber?" · INV "+o.invoiceNumber:""} · {o.date}
                </option>)}
              </select>
              {distributorId&&!orders.some(o=>o.distributorId===distributorId)&&
                <p className="text-[12px] text-amber-800">No portal order exists. Create or link the real order first; do not attach this PDF to another customer.</p>}
            </div>
          </div>
          {chosenOrder&&<div className="rounded-xl border border-[#E8DCCA] bg-[#FAF7F1] p-3 text-[12px] leading-6">
            <strong>Recipient:</strong> {chosenOrder.distributorName} ({chosenOrder.country||"Country not recorded"})<br/>
            <strong>Order:</strong> {chosenOrder.poNumber||chosenOrder.id}<br/>
            <strong>Invoice reference:</strong> {chosenOrder.invoiceNumber||"Not recorded"}
          </div>}
          <label className="flex items-start gap-2 text-[12px] leading-5 text-[#6D6153]">
            <input type="checkbox" className="mt-1" checked={verified}
              onChange={e=>setVerified(e.target.checked)} disabled={!chosenOrder||!item.partId}/>
            I viewed the actual PDF and verified its consignee/customer, invoice or PO and shipment reference against this exact distributor order.
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button className={button} disabled={!feed?.sharingEnabled||!chosenOrder||!verified||!item.partId||publishing}
              onClick={()=>void publish()}><ShieldCheck size={15}/>{publishing?"Attaching…":"Approve & attach to distributor"}</button>
            {feed?.queueMode&&item.queueItemId&&<button type="button" className="min-h-[44px] rounded-xl border border-[#D7CABA] px-4 text-[12px] font-semibold text-[#81634E] disabled:opacity-50"
              disabled={publishing} onClick={()=>void dismissCandidate(item)}>Dismiss unrelated item</button>}
            {!feed?.sharingEnabled&&<p className="text-[11px] text-amber-800">
              Attachment sharing is disabled until a reviewed production release and an approved document.
            </p>}
          </div>
        </div>}
      </article>)}
    </section>
  </main>;
}
