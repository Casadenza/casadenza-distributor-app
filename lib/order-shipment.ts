import {parseOrderNotes} from "./order-document-folders.ts";

export type Carrier="DHL"|"FEDEX"|"UPS"|"ARAMEX"|"OTHER"|"UNKNOWN";
export type ShipmentDetails={
  agent:string; carrier:Carrier; trackingNumber:string; hawb:string; mawb:string;
  shippingBill:string; containerNumber:string; vessel:string;
  etd:string; eta:string; etdLocation:string; etaLocation:string;
  status:string; source:string; updatedAt:string;
};
export const EMPTY_SHIPMENT:ShipmentDetails={
  agent:"",carrier:"UNKNOWN",trackingNumber:"",hawb:"",mawb:"",
  shippingBill:"",containerNumber:"",vessel:"",etd:"",eta:"",
  etdLocation:"",etaLocation:"",status:"",source:"",updatedAt:""
};
export function isCarrier(x:unknown):x is Carrier {
 return ["DHL","FEDEX","UPS","ARAMEX","OTHER","UNKNOWN"].includes(String(x));
}
export function parseShipment(notes:string|null|undefined):ShipmentDetails{
 const m=parseOrderNotes(notes);
 const o=m.shipment&&typeof m.shipment==="object"&&!Array.isArray(m.shipment)?m.shipment as Record<string,unknown>:{};
 const copy={...EMPTY_SHIPMENT};
 for(const key of Object.keys(copy) as (keyof ShipmentDetails)[]){
   if(key==="carrier"){copy.carrier=isCarrier(o[key])?o[key] as Carrier:"UNKNOWN";}
   else if(typeof o[key]==="string")copy[key]=String(o[key]).slice(0,160);
 }
 return copy;
}
export function carrierTrackingLink(carrier:Carrier,trackingNumber:string):string|null{
 const number=trackingNumber.trim().replace(/\s+/g,"");
 if(!/^[A-Za-z0-9-]{6,40}$/.test(number))return null;
 // All links lead to official carrier domains. Carrier is selected explicitly,
 // never guessed from the freight agent or tracking number alone.
 const n=encodeURIComponent(number);
 switch(carrier) {
   case "DHL": return "https://www.dhl.com/in-en/home/tracking.html?tracking-id="+n;
   case "FEDEX":return "https://www.fedex.com/fedextrack/?trknbr="+n;
   case "UPS":return "https://www.ups.com/track?tracknum="+n;
   case "ARAMEX":return "https://www.aramex.com/in/en/track/results?ShipmentNumber="+n;
   default:return null;
 }
}
function capture(line:string,regex:RegExp):string{
 const m=line.match(regex);return (m?.[1]||"").trim().slice(0,90);
}
export function parseForwarderReport(sender:string,subject:string,body:string){
 const from=sender.toLowerCase();
 const domain=from.match(/[a-z0-9._%+-]+@([a-z0-9.-]+\.[a-z]{2,})/i)?.[1]?.toLowerCase();
 if(domain!=="orangestar.co.in")return null;
 // Only the newest authored content; quoted history can contain stale ETDs/ETAs.
 const fresh=body.split(/(?:^|\n)(?:From:|Sent:|On .{3,100} wrote:|_{6,}|={8,})/im)[0].slice(0,9000);
 const header=[subject,fresh].join("\n");
 const etd=capture(fresh,/\b(?:ETD|Sailed\s+\w+|OnBoard Date|On Board Date)\s*(?:[^\r\n]{0,30})\n?\s*[:\-]?\s*(\d{1,2}[-\/][A-Z]{3}[-\/]\d{2,4})\b/i);
 const eta=capture(fresh,/\bETA\s*[A-Z ]{0,35}\s*[:\-]?\s*(\d{1,2}[-\/][A-Z]{3}[-\/]\d{2,4})\b/i);
 const air=capture(header,/\b(?:AWB(?: NO)?|HAWB(?: NO)?|MAWB(?: NO)?)[\s:\/#-]*([A-Z]{0,3}\d{6,14})\b/i);
 const booking=capture(subject,/\b(AE\d{5,10}|RD\d{2,8}|\d{4}\/\d{4})\b/i);
 const ref=capture(header,/\b(CST[\/_-]\d{2}[\/_-]\d{2}[\/_-]\d{1,4})\b/i);
 const vessel=capture(fresh,/\bMother Vessel\s*[:\-]?\s*([^\r\n]+)/i);
 const container=capture(fresh,/\bContainer No\s*(?:\/[^\r\n]+)?\s*\n?\s*([A-Z]{4}\d{7})\b/i);
 const latestStatus=/\bhas been Sailed\b/i.test(fresh)?"SAILED":
  /\brailed out\b/i.test(fresh)?"RAILED_OUT":
  /\bhas been stuffed\b/i.test(fresh)?"STUFFED":"UPDATE_RECEIVED";
 const travel=/sea docs|sea freight|vessel|container/i.test(header)?"SEA":/hawb|mawb|air freight|airport/i.test(header)?"AIR":"";
 return {agent:"Orangestar Logistics",sourceSender:sender,booking,invoiceRef:ref,
   etd,eta,hawb:air,trackingNumber:"",carrier:"UNKNOWN" as Carrier,
   vessel,container,status:latestStatus,transportMode:travel,sourceSubject:subject};
}
