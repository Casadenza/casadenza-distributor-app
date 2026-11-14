import {documentFolder, type FolderDocument, type FolderOrder, type FolderKind,parseOrderNotes} from "./order-document-folders";

export type DocumentReadiness = {
  phase:"ORDER"|"PRE_SHIPMENT"|"IN_TRANSIT"|"DELIVERED"|"CLOSED";
  state:"WAITING"|"INCOMPLETE"|"DOCUMENTS_PRESENT";
  present:FolderKind[];
  missing:FolderKind[];
  suggested:FolderKind[];
  total:number;
  coverage:number;
  note:string;
};
/** Completeness is a *workflow hint*, not a customs/export compliance ruling.
 * Requirements depend on shipment mode, destination and customer.
 * "Missing" is only reported for phase-appropriate baseline documents.
 */
export function documentReadiness(order:Pick<FolderOrder,"status"|"notes"|"documents">):DocumentReadiness {
 const status=String(order.status||"RECEIVED").toUpperCase().replace(/[\s-]+/g,"_");
 const notes=parseOrderNotes(order.notes);
 const isCancelled=/(CANCELLED|CANCELED|VOID|REJECTED)/.test(status);
 const isDelivered=/(DELIVERED|COMPLETED|CLOSED)/.test(status);
 const isShipped=/(DISPATCHED|SHIPPED|IN_TRANSIT|ON_THE_WAY|INTRANSIT)/.test(status);
 const isProduction=/(PROCESSING|APPROVED|CONFIRMED|PRODUCTION|READY|PACKED)/.test(status);
 const phase:DocumentReadiness["phase"]=isCancelled?"CLOSED":isDelivered?"DELIVERED":isShipped?"IN_TRANSIT":isProduction?"PRE_SHIPMENT":"ORDER";
 const docs=(order.documents||[]).filter(d=>Boolean(d.url && String(d.url).trim()));
 const present=[...new Set(docs.map(documentFolder))] as FolderKind[];
 const active=(phase==="IN_TRANSIT"||phase==="DELIVERED");
 // Do not assume PO must be a PDF: some customer orders are received by email.
 // PI is generally issued before dispatch, and invoice / packing list accompany exports.
 const baseline:FolderKind[]=phase==="ORDER"||phase==="CLOSED"?[]:
   phase==="PRE_SHIPMENT"?["PI"]:["INVOICE","PACKING"];
 const missing=baseline.filter(k=>!present.includes(k));
 const transport=String(notes.shipmentMode||notes.transportMode||notes.shippingMode||"").trim().toUpperCase();
 const suggested:FolderKind[]=active ? (/(AIR|COURIER|EXPRESS)/.test(transport)?["AIR"]:
   /(SEA|OCEAN|VESSEL)/.test(transport)?["SEA"]:["AIR","SEA"]).filter(k=>!present.includes(k)) as FolderKind[] : [];
 // Only show suggested documents, never imply every mode requires both AIR and SEA.
 const note=phase==="ORDER"?"Order received; expected documents depend on the next workflow stage.":
   phase==="CLOSED"?"Order closed or cancelled; no new documents expected.":
   phase==="PRE_SHIPMENT"?"PI is a preparation-stage checklist item; exceptions are possible.":
   "Check shipping/customs requirements by transport mode and destination. Suggested documents are not universally mandatory.";
 return {
  phase,
  state:phase==="ORDER"||phase==="CLOSED"?"WAITING":missing.length?"INCOMPLETE":"DOCUMENTS_PRESENT",
  present,missing,suggested,total:baseline.length,
  coverage:baseline.length===0?0:Math.round(100*(baseline.length-missing.length)/baseline.length),
  note
 };
}
export function missingDocumentCount(orders:Array<Pick<FolderOrder,"status"|"notes"|"documents">>){
 return orders.filter(o=>documentReadiness(o).state==="INCOMPLETE").length;
}
