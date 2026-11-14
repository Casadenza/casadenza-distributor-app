"use client";
import type {FolderFilters, FolderOrder} from "@/lib/order-document-folders";
import {FOLDER_TYPES,INITIAL_FOLDER_FILTERS,orderCurrency} from "@/lib/order-document-folders";

type Props={filters:FolderFilters;setFilters:(next:FolderFilters)=>void;orders:FolderOrder[];admin:boolean};
export default function OrderFolderControls({filters,setFilters,orders,admin}:Props){
 const currencies=[...new Set(orders.map(orderCurrency))].sort();
 const statuses=[...new Set(orders.map(o=>String(o.status||"UNSPECIFIED")))].sort();
 const patch=(values:Partial<FolderFilters>)=>setFilters({...filters,...values});
 const cls="rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-xs text-stone-800";
 return <section aria-label="Order document filters" className="rounded-xl border border-stone-200 bg-stone-50 p-3 space-y-3">
   <div className="flex flex-wrap items-center justify-between gap-2">
     <div><h2 className="text-sm font-semibold text-stone-900">Order folders</h2>
       <p className="text-[11px] text-stone-500">{admin?"All distributors · order documents":"Your orders · published documents only"}</p></div>
     <button type="button" onClick={()=>setFilters(INITIAL_FOLDER_FILTERS)} className="rounded-lg border bg-white px-3 py-1.5 text-xs">Clear filters</button>
   </div>
   <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
     <label className="col-span-2 flex flex-col gap-1"><span className="text-[10px] text-stone-500">Search customer / PO / invoice / filename</span>
       <input aria-label="Search orders and documents" className={cls} value={filters.query} onChange={e=>patch({query:e.target.value})} placeholder="Search order or filename"/></label>
     <label className="flex flex-col gap-1"><span className="text-[10px] text-stone-500">Order from</span>
       <input aria-label="Order date from" type="date" className={cls} value={filters.dateFrom} onChange={e=>patch({dateFrom:e.target.value})}/></label>
     <label className="flex flex-col gap-1"><span className="text-[10px] text-stone-500">Order to</span>
       <input aria-label="Order date to" type="date" className={cls} value={filters.dateTo} onChange={e=>patch({dateTo:e.target.value})}/></label>
     <label className="flex flex-col gap-1"><span className="text-[10px] text-stone-500">Currency</span>
       <select aria-label="Currency" className={cls} value={filters.currency} onChange={e=>patch({currency:e.target.value})}>
         <option value="ALL">All currencies</option>{currencies.map(x=><option value={x} key={x}>{x}</option>)}</select></label>
     <label className="flex flex-col gap-1"><span className="text-[10px] text-stone-500">Minimum order value</span>
       <input aria-label="Minimum order value" type="number" min="0" className={cls} value={filters.minValue} onChange={e=>patch({minValue:e.target.value})} placeholder="Min"/></label>
     <label className="flex flex-col gap-1"><span className="text-[10px] text-stone-500">Maximum order value</span>
       <input aria-label="Maximum order value" type="number" min="0" className={cls} value={filters.maxValue} onChange={e=>patch({maxValue:e.target.value})} placeholder="Max"/></label>
     <label className="flex flex-col gap-1"><span className="text-[10px] text-stone-500">Status</span>
       <select aria-label="Order status" className={cls} value={filters.status} onChange={e=>patch({status:e.target.value})}>
         <option value="ALL">All statuses</option>{statuses.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
     <label className="flex flex-col gap-1"><span className="text-[10px] text-stone-500">Document folder</span>
       <select aria-label="Document folder" className={cls} value={filters.docType} onChange={e=>patch({docType:e.target.value})}>
         <option value="ALL">All folders</option>{FOLDER_TYPES.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select></label>
     <label className="flex flex-col gap-1"><span className="text-[10px] text-stone-500">Sort</span>
       <select aria-label="Order sort" className={cls} value={filters.sort} onChange={e=>patch({sort:e.target.value})}>
         <option value="newest">Newest first</option><option value="oldest">Oldest first</option>
         <option value="value-high">Highest value first</option><option value="value-low">Lowest value first</option></select></label>
     <label className="flex items-center gap-2 text-xs text-stone-600">
       <input type="checkbox" checked={filters.onlyWithDocs} onChange={e=>patch({onlyWithDocs:e.target.checked})}/>Orders with files only</label>
   </div>
   {(filters.sort==="value-high"||filters.sort==="value-low")&&filters.currency==="ALL"&&currencies.length>1&&
     <p className="text-[11px] text-amber-800">Values are grouped by currency, not converted across currencies. Select one currency for a comparable ranking.</p>}
 </section>;
}
