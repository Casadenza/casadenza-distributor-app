"use client";
import {documentReadiness,type DocumentReadiness} from "@/lib/order-document-completeness";
import type {FolderOrder} from "@/lib/order-document-folders";

const names:Record<string,string>={PI:"PI",INVOICE:"Commercial invoice",PACKING:"Packing list",AIR:"AWB / HAWB",SEA:"Bill of lading"};
export default function DocumentReadinessIndicator({order,admin=false}:{order:FolderOrder;admin?:boolean}){
 const ready:DocumentReadiness=documentReadiness(order);
 const label=ready.state==="INCOMPLETE"?"Documents incomplete":ready.state==="WAITING"?"Waiting for document stage":"Core documents recorded";
 return <div className="mt-2 rounded-lg border border-stone-200 bg-white px-3 py-2" aria-label="Document checklist status">
  <div className="flex flex-wrap items-center gap-2">
   <span className={"rounded-md px-2 py-1 text-[10px] font-semibold "+(ready.state==="INCOMPLETE"?"bg-amber-100 text-amber-900":ready.state==="WAITING"?"bg-stone-100 text-stone-600":"bg-emerald-50 text-emerald-800")}>{label}</span>
   <span className="text-[10px] text-stone-500">{ready.phase.replaceAll("_"," ")} · {ready.present.length} document categories</span>
  </div>
  {ready.missing.length>0&&<p className="mt-2 text-[11px] text-amber-900">Not yet in published order folder: {ready.missing.map(x=>names[x]||x).join(", ")}</p>}
  {admin&&ready.suggested.length>0&&<p className="mt-1 text-[11px] text-stone-600">Transport documents to check: {ready.suggested.map(x=>names[x]||x).join(" or ")} (depends on mode and destination)</p>}
  <p className="mt-1 text-[10px] text-stone-500">{admin?ready.note:"Shown documents reflect what has been published to your order folder."}</p>
 </div>;
}
