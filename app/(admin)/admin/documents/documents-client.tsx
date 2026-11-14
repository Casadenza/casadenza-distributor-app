"use client";
import {useMemo,useState} from "react";
import {Search,FolderOpen,FileText,Upload,ChevronRight,ExternalLink,Download,Trash2,RefreshCw,SlidersHorizontal,Truck,Mail,ArrowLeft,FileClock} from "lucide-react";
import OrderShipmentPanel from "@/components/documents/order-shipment-panel";
import {FOLDER_TYPES,documentFolder,filterFolderOrders,INITIAL_FOLDER_FILTERS,orderCurrency,orderRef,orderValue,type FolderKind,type FolderFilters} from "@/lib/order-document-folders";
import {documentReadiness} from "@/lib/order-document-completeness";

type Order=any;
type Proposal={id:string;suggestedOrderId:string|null;kind:string;filename:string|null;subject:string;matchReason:string;receivedAt:Date|string|null};
type DetailTab="documents"|"shipment"|"review";
const uploadTypes=[["PROFORMA_INVOICE","Proforma invoice"],["COMMERCIAL_INVOICE","Commercial invoice"],["PACKING_LIST","Packing list"],["AIR_WAYBILL","Air waybill / HAWB"],["BILL_OF_LADING","Bill of lading"],["CERTIFICATE_OF_ORIGIN","Certificate of origin"],["INSURANCE_CERTIFICATE","Insurance certificate"],["FUMIGATION_CERTIFICATE","Fumigation"],["INSPECTION_CERTIFICATE","Inspection certificate"],["PHOTOS_PDF","Photos (PDF)"],["OTHER","Other"]];
const date=(v:unknown)=>{const d=new Date(String(v));return Number.isFinite(d.getTime())?d.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}):"—";};
const name=(o:Order)=>String(o.distributor?.name||o.distributor?.companyName||o.distributor?.email||"Unknown distributor");
const docName=(d:any)=>String(d.title||d.name||d.type||"Document").replaceAll("_"," ");
const docLink=(d:any)=>typeof d.url==="string"&&/^https:\/\//i.test(d.url)?d.url:"";
const pill=(s:string)=>/shipp|deliver|complete/i.test(s)?"bg-emerald-50 text-emerald-800":/pack|process|ready|confirm/i.test(s)?"bg-blue-50 text-blue-800":"bg-stone-100 text-stone-700";

export default function AdminDocumentsClient({initialOrders,internalProposals=[]}:{initialOrders:Order[];internalProposals?:Proposal[]}){
 const [orders,setOrders]=useState<Order[]>(initialOrders||[]);
 const [selectedId,setSelectedId]=useState<string|null>(null);
 const [query,setQuery]=useState("");
 const [status,setStatus]=useState("ALL");
 const [needsOnly,setNeedsOnly]=useState(false);
 const [advanced,setAdvanced]=useState(false);
 const [filters,setFilters]=useState<FolderFilters>(INITIAL_FOLDER_FILTERS);
 const [tab,setTab]=useState<DetailTab>("documents");
 const [folder,setFolder]=useState<"ALL"|FolderKind>("ALL");
 const [uploadOpen,setUploadOpen]=useState(false);
 const [type,setType]=useState("PROFORMA_INVOICE");
 const [title,setTitle]=useState("");
 const [file,setFile]=useState<File|null>(null);
 const [busy,setBusy]=useState(false);
 const [feedback,setFeedback]=useState("");
 const statuses=[...new Set(orders.map(o=>String(o.status||"RECEIVED")))].sort();
 const list=useMemo(()=>filterFolderOrders(orders,{...filters,query,status}).filter(o=>!needsOnly||documentReadiness(o).state==="INCOMPLETE"),[orders,query,status,filters,needsOnly]);
 const selected=orders.find(o=>o.id===selectedId)||null;
 const docs=selected?.documents||[];
 const proposalRows=internalProposals.filter(p=>p.suggestedOrderId===selectedId);
 const readiness=selected?documentReadiness(selected):null;
 const missing=orders.filter(o=>documentReadiness(o).state==="INCOMPLETE").length;
 async function reload(id:string){
  try{const res=await fetch("/api/admin/orders/"+encodeURIComponent(id),{cache:"no-store"});if(!res.ok)throw Error("refresh");
   const data=await res.json();setOrders(before=>before.map(o=>o.id===id?{...o,...data.order}:o));
  }catch{window.location.reload();}
 }
 async function uploadDocument(){
  if(!selected||!file){setFeedback("Select a PDF file first.");return;}
  setBusy(true);setFeedback("");
  try{const fd=new FormData();fd.append("file",file);fd.append("type",type);fd.append("title",title.trim()||type.replaceAll("_"," "));
   const res=await fetch("/api/admin/orders/"+encodeURIComponent(selected.id)+"/documents",{method:"POST",body:fd});
   if(!res.ok)throw Error("Upload failed. Please check the file and try again.");
   setFile(null);setTitle("");setUploadOpen(false);await reload(selected.id);setFeedback("Document uploaded successfully.");
  }catch(e){setFeedback(e instanceof Error?e.message:"Upload failed.");}finally{setBusy(false);}
 }
 async function deleteDocument(docId:string){
  if(!selected||!confirm("Delete this published document?"))return;
  setBusy(true);setFeedback("");
  try{const res=await fetch("/api/admin/orders/"+encodeURIComponent(selected.id)+"/documents/"+encodeURIComponent(docId),{method:"DELETE"});
   if(!res.ok)throw Error("Could not delete document.");await reload(selected.id);setFeedback("Document deleted.");
  }catch(e){setFeedback(e instanceof Error?e.message:"Delete failed.");}finally{setBusy(false);}
 }
 function openOrder(id:string){setSelectedId(id);setTab("documents");setFolder("ALL");setUploadOpen(false);setFeedback("");}
 return <main className="min-h-screen bg-[#f8f8f6] text-[#22251f]">
  <div className="mx-auto max-w-[1360px] px-4 py-7 sm:px-7">
   <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
    <div><p className="text-xs font-medium text-stone-500">ADMIN / ORDER DOCUMENTS</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Order Documents</h1>
     <p className="mt-2 text-sm text-stone-500">Find an order, then manage its documents and shipment information.</p></div>
    <button onClick={()=>window.location.reload()} className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium hover:bg-stone-50"><RefreshCw size={15}/> Refresh</button>
   </div>
   <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
    <div className="rounded-2xl border border-stone-200 bg-white p-4"><p className="text-xs text-stone-500">Total orders</p><p className="mt-2 text-2xl font-semibold">{orders.length}</p></div>
    <div className="rounded-2xl border border-stone-200 bg-white p-4"><p className="text-xs text-stone-500">Published files</p><p className="mt-2 text-2xl font-semibold">{orders.reduce((n,o)=>n+(o.documents||[]).length,0)}</p></div>
    <div className="col-span-2 rounded-2xl border border-stone-200 bg-white p-4 sm:col-span-1"><p className="text-xs text-stone-500">Orders needing documents</p><p className="mt-2 text-2xl font-semibold">{missing}</p></div>
   </div>
   {!selected?<section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
     <div className="border-b border-stone-100 p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-3">
       <label className="relative min-w-[220px] flex-1"><Search size={17} className="absolute left-3 top-3 text-stone-400"/>
        <input aria-label="Search orders" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search by order, distributor or invoice" className="h-11 w-full rounded-xl border border-stone-200 bg-stone-50 pl-10 pr-3 text-sm outline-none focus:border-stone-500"/></label>
       <select aria-label="Order status" value={status} onChange={e=>setStatus(e.target.value)} className="h-11 rounded-xl border border-stone-200 bg-white px-3 text-sm">
        <option value="ALL">All statuses</option>{statuses.map(s=><option value={s} key={s}>{s.replaceAll("_"," ")}</option>)}
       </select>
       <button onClick={()=>setNeedsOnly(v=>!v)} className={"h-11 rounded-xl border px-4 text-sm "+(needsOnly?"border-amber-300 bg-amber-50 text-amber-900":"border-stone-200 bg-white")}>Needs documents {needsOnly?"✓":""}</button>
       <button onClick={()=>setAdvanced(v=>!v)} className="inline-flex h-11 items-center gap-2 rounded-xl border border-stone-200 px-4 text-sm"><SlidersHorizontal size={15}/> More filters</button>
      </div>
      {advanced&&<div className="mt-4 grid grid-cols-2 gap-3 border-t border-stone-100 pt-4 sm:grid-cols-4">
       <label className="text-xs text-stone-500">From date<input type="date" value={filters.dateFrom} onChange={e=>setFilters({...filters,dateFrom:e.target.value})} className="mt-1 w-full rounded-lg border p-2.5 text-sm"/></label>
       <label className="text-xs text-stone-500">To date<input type="date" value={filters.dateTo} onChange={e=>setFilters({...filters,dateTo:e.target.value})} className="mt-1 w-full rounded-lg border p-2.5 text-sm"/></label>
       <label className="text-xs text-stone-500">Currency<select value={filters.currency} onChange={e=>setFilters({...filters,currency:e.target.value})} className="mt-1 w-full rounded-lg border p-2.5 text-sm"><option value="ALL">All currencies</option>{[...new Set(orders.map(orderCurrency))].map(c=><option key={c}>{c}</option>)}</select></label>
       <label className="text-xs text-stone-500">Sort<select value={filters.sort} onChange={e=>setFilters({...filters,sort:e.target.value})} className="mt-1 w-full rounded-lg border p-2.5 text-sm"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="value-high">Highest value</option><option value="value-low">Lowest value</option></select></label>
       <label className="text-xs text-stone-500">Minimum value<input type="number" min="0" value={filters.minValue} onChange={e=>setFilters({...filters,minValue:e.target.value})} className="mt-1 w-full rounded-lg border p-2.5 text-sm" placeholder="0"/></label>
       <label className="text-xs text-stone-500">Maximum value<input type="number" min="0" value={filters.maxValue} onChange={e=>setFilters({...filters,maxValue:e.target.value})} className="mt-1 w-full rounded-lg border p-2.5 text-sm" placeholder="Any"/></label>
       <div className="flex items-end"><button onClick={()=>{setFilters(INITIAL_FOLDER_FILTERS);setStatus("ALL");setQuery("");setNeedsOnly(false)}} className="rounded-lg border px-4 py-2.5 text-sm">Clear all filters</button></div>
      </div>}
     </div>
     <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3 text-xs text-stone-500"><span>{list.length} orders</span><span>Select an order to open its documents</span></div>
     <div className="divide-y divide-stone-100">
      {list.map(o=>{const r=documentReadiness(o);return <button type="button" key={o.id} onClick={()=>openOrder(o.id)} className="flex w-full items-center gap-3 px-4 py-4 text-left hover:bg-stone-50 sm:px-5">
       <span className="rounded-xl bg-stone-100 p-3 text-stone-600"><FolderOpen size={21}/></span>
       <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{orderRef(o)} <span className="ml-2 font-normal text-stone-500">· {name(o)}</span></span>
        <span className="mt-1 block text-xs text-stone-500">{date(o.createdAt)} · {orderCurrency(o)} {orderValue(o).toLocaleString("en-US",{maximumFractionDigits:2})} · {(o.documents||[]).length} files</span>
       </span>
       <span className={"hidden rounded-full px-3 py-1 text-xs font-medium sm:inline "+pill(String(o.status||"RECEIVED"))}>{String(o.status||"RECEIVED").replaceAll("_"," ")}</span>
       {r.state==="INCOMPLETE"&&<span className="hidden rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-900 md:inline">Missing files</span>}
       <ChevronRight size={19} className="text-stone-400"/>
      </button>})}
      {!list.length&&<div className="p-12 text-center text-sm text-stone-500">No orders match these filters.</div>}
     </div>
    </section>:<section className="space-y-4">
      <button onClick={()=>setSelectedId(null)} className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-900"><ArrowLeft size={16}/> All orders</button>
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
       <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs text-stone-500">{name(selected)} · {date(selected.createdAt)}</p>
         <h2 className="mt-1 text-2xl font-semibold">{orderRef(selected)}</h2>
         <p className="mt-1 text-sm text-stone-500">{orderCurrency(selected)} {orderValue(selected).toLocaleString("en-US",{maximumFractionDigits:2})} · {String(selected.status||"RECEIVED").replaceAll("_"," ")}</p>
        </div>
        <span className={"rounded-full px-3 py-1.5 text-xs font-medium "+(readiness?.state==="INCOMPLETE"?"bg-amber-50 text-amber-900":"bg-stone-100 text-stone-700")}>{readiness?.state==="INCOMPLETE"?"Some documents pending":"Document checklist"}</span>
       </div>
       <div className="mt-5 flex gap-2 border-b border-stone-200">
        {([["documents","Documents",FileText],["shipment","Shipment & Tracking",Truck],["review","Gmail Review",Mail]] as const).map(([id,label,Icon])=><button key={id} onClick={()=>setTab(id)} className={"inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm "+(tab===id?"border-stone-900 font-semibold text-stone-900":"border-transparent text-stone-500")}><Icon size={16}/>{label}{id==="review"&&proposalRows.length>0?" ("+proposalRows.length+")":""}</button>)}
       </div>
       {tab==="documents"&&<div className="pt-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
         <div><h3 className="text-lg font-semibold">Files for this order</h3><p className="mt-1 text-xs text-stone-500">Choose a document category to view files or see what is pending.</p></div>
         <button onClick={()=>setUploadOpen(v=>!v)} className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-medium text-white"><Upload size={16}/> Upload PDF</button>
        </div>
        {uploadOpen&&<div className="mb-5 grid gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4 sm:grid-cols-3">
         <label className="text-xs text-stone-600">Document type<select value={type} onChange={e=>setType(e.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2 text-sm">{uploadTypes.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
         <label className="text-xs text-stone-600">Title (optional)<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. PI Rev 1" className="mt-1 w-full rounded-lg border bg-white p-2 text-sm"/></label>
         <label className="text-xs text-stone-600">PDF file<input type="file" accept="application/pdf" onChange={e=>setFile(e.target.files?.[0]||null)} className="mt-1 w-full text-xs"/></label>
         <div className="sm:col-span-3"><button disabled={busy||!file} onClick={()=>void uploadDocument()} className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white disabled:opacity-50">{busy?"Uploading…":"Save document"}</button></div>
        </div>}
        <div className="grid gap-4 lg:grid-cols-[270px_minmax(0,1fr)]">
         <nav className="space-y-1" aria-label="Document folders">
          <button onClick={()=>setFolder("ALL")} className={"flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm "+(folder==="ALL"?"bg-stone-900 text-white":"hover:bg-stone-100")}><span>All documents</span><span>{docs.length}</span></button>
          {FOLDER_TYPES.map(f=>{const n=docs.filter((d:any)=>documentFolder(d)===f.id).length;return <button key={f.id} onClick={()=>setFolder(f.id)} className={"flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm "+(folder===f.id?"bg-stone-900 text-white":"hover:bg-stone-100")}><span className="flex items-center gap-2"><FolderOpen size={15}/>{f.label}</span><span className={"text-xs "+(folder===f.id?"text-white/70":n?"text-emerald-700":"text-amber-700")}>{n||"Pending"}</span></button>})}
         </nav>
         <div className="min-h-[260px] rounded-xl border border-stone-200">
          <div className="border-b border-stone-100 p-4"><h4 className="font-semibold">{folder==="ALL"?"All published documents":FOLDER_TYPES.find(f=>f.id===folder)?.label}</h4><p className="text-xs text-stone-500">{folder==="ALL"?String(docs.length)+" uploaded files":"Files are available to the distributor once published."}</p></div>
          <div className="divide-y divide-stone-100">
           {docs.filter((d:any)=>folder==="ALL"||documentFolder(d)===folder).map((d:any)=><div key={d.id} className="flex flex-wrap items-center gap-3 p-4">
            <span className="rounded-lg bg-stone-100 p-2"><FileText size={18}/></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{docName(d)}</span><span className="text-xs text-stone-500">Uploaded {date(d.createdAt)}</span></span>
            {docLink(d)&&<><a href={docLink(d)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs"><ExternalLink size={14}/> Open</a><a href={docLink(d)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs"><Download size={14}/> Download</a></>}
            <button disabled={busy} onClick={()=>void deleteDocument(d.id)} className="rounded-lg border border-red-100 p-2 text-red-600" aria-label="Delete document"><Trash2 size={15}/></button>
           </div>)}
           {docs.filter((d:any)=>folder==="ALL"||documentFolder(d)===folder).length===0&&<div className="flex flex-col items-center gap-2 px-4 py-14 text-center"><FileClock size={27} className="text-stone-400"/><h4 className="font-semibold">{folder==="ALL"?"No documents uploaded":"Document pending"}</h4><p className="text-sm text-stone-500">No PDF has been published in this folder yet.</p></div>}
          </div>
         </div>
        </div>
       </div>}
       {tab==="shipment"&&<div className="pt-4"><OrderShipmentPanel orderId={selected.id} notes={selected.notes} admin/></div>}
       {tab==="review"&&<div className="space-y-3 pt-5"><div><h3 className="font-semibold">Unverified Gmail suggestions</h3><p className="mt-1 text-sm text-stone-500">Internal only. These files have not been published to the distributor.</p></div>
        {proposalRows.map(p=><div key={p.id} className="rounded-xl border border-amber-100 bg-amber-50/40 p-4"><p className="text-sm font-semibold">{p.filename||"Email body"} <span className="font-normal text-stone-500">· {p.kind.replaceAll("_"," ")}</span></p><p className="mt-1 text-xs text-stone-600">{p.subject}</p><p className="mt-1 text-xs text-amber-900">{p.matchReason}</p></div>)}
        {!proposalRows.length&&<p className="rounded-xl border p-8 text-center text-sm text-stone-500">No Gmail suggestions for this order.</p>}
        <a href="/admin/operations/preview" className="inline-flex items-center gap-2 text-sm font-medium underline">Open matching review <ExternalLink size={14}/></a>
       </div>}
       {feedback&&<p className="mt-4 text-sm text-stone-600" role="status">{feedback}</p>}
      </div>
    </section>}
  </div>
 </main>;
}
