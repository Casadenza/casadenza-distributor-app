"use client";
import {useState} from "react";
import {carrierTrackingLink,parseShipment,type Carrier,type ShipmentDetails} from "@/lib/order-shipment";
const carrierNames:Record<Carrier,string>={DHL:"DHL Express",FEDEX:"FedEx",UPS:"UPS",ARAMEX:"Aramex",OTHER:"Other carrier",UNKNOWN:"Not confirmed"};
const fields:[keyof ShipmentDetails,string][]=[["agent","Freight agent / forwarder"],["carrier","Actual courier/carrier"],["trackingNumber","Carrier tracking number"],["hawb","HAWB"],["mawb","MAWB"],["shippingBill","Shipping Bill"],["containerNumber","Container number"],["vessel","Vessel"],["etd","ETD (YYYY-MM-DD)"],["etdLocation","Departure port"],["eta","ETA (YYYY-MM-DD)"],["etaLocation","ETA location"],["status","Shipment status"]];
export default function OrderShipmentPanel({orderId,notes,admin=false}:{orderId:string;notes:string|null|undefined;admin?:boolean}){
 const original=parseShipment(notes);
 const [details,setDetails]=useState<ShipmentDetails>(original);
 const [editing,setEditing]=useState(false);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const link=carrierTrackingLink(details.carrier,details.trackingNumber);
 async function save(){
   setBusy(true);setMessage("");
   try{
     const response=await fetch("/api/admin/orders/"+encodeURIComponent(orderId)+"/shipment",{
       method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({shipment:details})
     });
     const data=await response.json();
     if(!response.ok)throw new Error(data.error||"Unable to save shipment");
     setMessage("Shipment details saved to the selected order.");
     setEditing(false);
   }catch(e){setMessage(e instanceof Error?e.message:"Unable to save");}
   finally{setBusy(false);}
 }
 const readOnly=[
  ["Freight agent",details.agent],["Carrier",carrierNames[details.carrier]],
  ["Tracking number",details.trackingNumber],["HAWB",details.hawb],["MAWB",details.mawb],
  ["Shipping bill",details.shippingBill],["Container",details.containerNumber],
  ["Vessel",details.vessel],["ETD",details.etd],["Departure",details.etdLocation],
  ["ETA",details.eta],["ETA location",details.etaLocation],
  ["Status",details.status],["Updated",details.updatedAt.slice(0,10)],
 ];
 return <section className="mt-3 rounded-xl border border-stone-200 bg-white p-3 space-y-3" aria-label="Shipment tracking">
  <div className="flex items-center justify-between gap-2">
    <div><h3 className="text-xs font-bold uppercase tracking-widest">Shipment & tracking</h3>
    <p className="text-[11px] text-stone-500">Tracking availability depends on the actual carrier, not the freight agent.</p></div>
    {admin&&<button className="rounded-lg border px-3 py-1.5 text-xs" onClick={()=>setEditing(!editing)}>{editing?"Cancel":"Edit shipment"}</button>}
  </div>
  {editing&&admin?<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
    {fields.map(([field,label])=><label key={field} className="flex flex-col gap-1 text-[10px] text-stone-600">
      {label}
      {field==="carrier"?<select className="rounded border px-2 py-2 text-xs" value={details.carrier} onChange={e=>setDetails({...details,carrier:e.target.value as Carrier})}>
        {Object.entries(carrierNames).map(([v,l])=><option key={v} value={v}>{l}</option>)}
      </select>:<input className="rounded border px-2 py-2 text-xs" value={String(details[field])} onChange={e=>setDetails({...details,[field]:e.target.value})}
        type={field==="etd"||field==="eta"?"date":"text"} maxLength={100}/>}
    </label>)}
    <div className="col-span-full"><button type="button" onClick={()=>void save()} disabled={busy} className="rounded bg-stone-900 px-4 py-2 text-xs text-white disabled:opacity-50">{busy?"Saving…":"Save verified shipment details"}</button></div>
  </div>:<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
    {readOnly.map(([label,value])=><div className="rounded-md bg-stone-50 px-2 py-2" key={label}>
      <p className="text-[10px] text-stone-500">{label}</p>
      <p className="mt-1 break-all text-xs font-medium">{value||"Pending"}</p>
    </div>)}
  </div>}
  {link&&<div className="flex flex-wrap items-center gap-3">
    <a href={link} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-stone-900 bg-stone-900 px-3 py-2 text-xs text-white">Track on {carrierNames[details.carrier]}</a>
    <span className="text-[11px] text-stone-500">The courier site is authoritative; enter the tracking number there if needed.</span>
  </div>}
  {details.carrier==="UNKNOWN"||!details.trackingNumber?<p className="text-xs text-amber-800">Carrier tracking is pending confirmation. A forwarder booking or shipping bill is not a courier tracking number.</p>:null}
  {message&&<p role="status" className="text-xs text-stone-700">{message}</p>}
 </section>;
}
