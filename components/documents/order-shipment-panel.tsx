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
 const [reports,setReports]=useState<Array<{messageId:string;date:string;subject:string;proposed:{agent:string;etd:string;eta:string;vessel:string;container:string;status:string;booking:string;invoiceRef:string;transportMode:string}}>>([]);
 const [scanning,setScanning]=useState(false);
 const link=carrierTrackingLink(details.carrier,details.trackingNumber);
 async function findOrangestar(){
  setScanning(true);setMessage("");
  try{
   const response=await fetch("/api/admin/orders/"+encodeURIComponent(orderId)+"/shipment/reports",{cache:"no-store"});
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||"Unable to search reports");
   setReports(data.proposals||[]);
   setMessage(data.proposals?.length ? data.proposals.length+" matching Orangestar email reports found. Verify dates and destination before applying.":data.note||"No matching Orangestar reports.");
  }catch(e){setMessage(e instanceof Error?e.message:"Unable to search");}
  finally{setScanning(false);}
 }
 function applyReport(report:{agent:string;etd:string;eta:string;vessel:string;container:string;status:string}){
  // Report dates may be formatted as DD-MON-YY; convert strictly before
  // presenting them as editable YYYY-MM-DD form dates.
  function iso(v:string){
   const m=v.match(/^(\d{1,2})[-\/]([A-Za-z]{3})[-\/](\d{2,4})$/);
   if(!m)return /^\d{4}-\d{2}-\d{2}$/.test(v)?v:"";
   const month=["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"].indexOf(m[2].toUpperCase())+1;
   if(month<1)return "";
   const year=m[3].length===2?"20"+m[3]:m[3];
   const n=year+"-"+String(month).padStart(2,"0")+"-"+m[1].padStart(2,"0");
   return Number.isFinite(Date.parse(n))?n:"";
  }
  setDetails(previous=>({...previous,agent:report.agent||previous.agent,
    etd:iso(report.etd)||previous.etd,eta:iso(report.eta)||previous.eta,
    vessel:report.vessel||previous.vessel,containerNumber:report.container||previous.containerNumber,
    status:report.status||previous.status}));
  setEditing(true);
  setMessage("Report details copied into draft. Verify the shipment destination and save to update this order.");
 }
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
  {admin&&<div className="rounded-lg border border-amber-200 bg-amber-50/40 p-3 space-y-2">
    <div className="flex items-center justify-between gap-2">
      <div><strong className="text-xs">Orangestar shipping reports</strong><p className="text-[11px] text-stone-500">Search by exact order references, not company name alone.</p></div>
      <button type="button" disabled={scanning} onClick={()=>void findOrangestar()} className="rounded-lg bg-stone-900 px-3 py-2 text-xs text-white disabled:opacity-50">{scanning?"Searching…":"Find Orangestar reports"}</button>
    </div>
    {reports.map(r=><div key={r.messageId} className="rounded border bg-white px-3 py-2 text-xs space-y-1">
       <p className="font-semibold">{r.subject}</p>
       <p className="text-stone-500">{r.date} · Booking {r.proposed.booking||"Not extracted"} · Invoice {r.proposed.invoiceRef||"Not extracted"}</p>
       <p>ETD {r.proposed.etd||"Not stated"} · ETA {r.proposed.eta||"Not stated"} · {r.proposed.status}</p>
       <button className="rounded border px-2 py-1" onClick={()=>applyReport(r.proposed)}>Copy proposed details for verification</button>
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
