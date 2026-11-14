"use client";
import {FOLDER_TYPES,documentFolder,type FolderDocument,type FolderKind} from "@/lib/order-document-folders";

export default function OrderFolderTabs({documents,selected,onSelect}:{documents:FolderDocument[];selected:"ALL"|FolderKind;onSelect:(id:"ALL"|FolderKind)=>void}){
 const choices=[{id:"ALL",label:"All files",count:documents.length},
   ...FOLDER_TYPES.map(f=>({id:f.id,label:f.label,count:documents.filter(d=>documentFolder(d)===f.id).length}))];
 return <div aria-label="Order document subfolders" className="flex flex-wrap gap-2 border-b border-stone-200 bg-stone-50 px-3 py-3">
  {choices.map(f=><button type="button" key={f.id}
    onClick={()=>onSelect(f.id as "ALL"|FolderKind)}
    className={"rounded-lg border px-3 py-2 text-[11px] font-medium "+(selected===f.id?"border-stone-900 bg-stone-900 text-white":"border-stone-200 bg-white text-stone-700")}>
    {f.id==="ALL"?"▣ ":"▱ "}{f.label} <span className="opacity-70">{f.count>0?"("+f.count+")":"· Pending"}</span>
  </button>)}
 </div>;
}
