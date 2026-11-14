export type FolderDocument={id:string;title?:string|null;url?:string|null;createdAt?:string|Date;type?:string|null};
export type FolderOrder={id:string;createdAt:string|Date;status?:string|null;notes?:string|null;items?:Array<{qty:number;unitPrice:number}>;documents?:FolderDocument[];distributor?:{name?:string|null;defaultCurrency?:string|null;email?:string|null};defaultCurrency?:string|null};
export const FOLDER_TYPES=[
  {id:"ORDER",label:"Purchase order"},
  {id:"PI",label:"Proforma invoice (PI)"},
  {id:"INVOICE",label:"Commercial invoice"},
  {id:"PACKING",label:"Packing list"},
  {id:"SB",label:"Shipping bill (SB)"},
  {id:"AIR",label:"AWB / HAWB"},
  {id:"SEA",label:"Bill of lading"},
  {id:"OTHER",label:"Other documents"},
] as const;
export type FolderKind=typeof FOLDER_TYPES[number]["id"];
export type FolderFilters={query:string;status:string;docType:string;dateFrom:string;dateTo:string;minValue:string;maxValue:string;currency:string;sort:string;onlyWithDocs:boolean};
export const INITIAL_FOLDER_FILTERS:FolderFilters={query:"",status:"ALL",docType:"ALL",dateFrom:"",dateTo:"",minValue:"",maxValue:"",currency:"ALL",sort:"newest",onlyWithDocs:false};
export function parseOrderNotes(notes:unknown):Record<string,unknown>{
  if(typeof notes!=="string")return {};
  try{const parsed=JSON.parse(notes);return parsed && typeof parsed==="object"&&!Array.isArray(parsed)?parsed:{};}catch{return {};}
}
export function orderRef(o:FolderOrder) {
  const notes=parseOrderNotes(o.notes);
  return String(notes.poNumber||notes.orderNumber||notes.invoiceNumber||notes.invoiceNo||"ORD-"+o.id.slice(-8));
}
export function orderValue(o:FolderOrder):number{
  return (o.items||[]).reduce((sum,x)=>sum+(Number(x.qty)||0)*(Number(x.unitPrice)||0),0);
}
export function orderCurrency(o:FolderOrder):string{
  return String(o.distributor?.defaultCurrency||o.defaultCurrency||"UNSPECIFIED").toUpperCase();
}
export function documentFolder(d:FolderDocument):FolderKind{
  const hay=(String(d.type||"")+" "+String(d.title||"")).toLowerCase().replace(/[_-]/g," ");
  if(/\b(purchase order|customer order|buyer po)\b/.test(hay))return "ORDER";
  if(/\b(proforma|pro forma|\bpi\b)\b/.test(hay))return "PI";
  if(/\b(commercial invoice|\binvoice\b|\binv\b)\b/.test(hay))return "INVOICE";
  if(/\b(packing list|packinglist|packlist)\b/.test(hay))return "PACKING";
  if(/\b(shipping bill|ship bill|\bsb\b|let export)\b/.test(hay))return "SB";
  if(/\b(air waybill|airwaybill|\bawb\b|\bhawb\b|\bmawb\b)\b/.test(hay))return "AIR";
  if(/\b(bill of lading|\bbol\b|\bb\/l\b)\b/.test(hay))return "SEA";
  return "OTHER";
}
export function groupOrderDocuments(docs:FolderDocument[]){
  return FOLDER_TYPES.map(folder=>({...folder,documents:docs.filter(d=>documentFolder(d)===folder.id)}));
}
function dayValue(s:string|Date):string{
  const date=new Date(s);
  return Number.isFinite(date.getTime())?date.toISOString().slice(0,10):"";
}
export function filterFolderOrders<T extends FolderOrder>(orders:T[],f:FolderFilters):T[]{
  const q=f.query.toLowerCase().trim();
  const min=f.minValue.trim()===""?null:Number(f.minValue);
  const max=f.maxValue.trim()===""?null:Number(f.maxValue);
  return orders.filter(o=>{
    const notes=parseOrderNotes(o.notes), docs=o.documents||[];
    const hay=[o.id,o.distributor?.name||"",o.distributor?.email||"",o.status||"",orderRef(o),JSON.stringify(notes),
      ...docs.map(d=>(d.title||"")+" "+(d.type||""))].join(" ").toLowerCase();
    const value=orderValue(o),date=dayValue(o.createdAt);
    return (!q||hay.includes(q))&&
      (f.status==="ALL"||o.status===f.status)&&
      (f.docType==="ALL"||docs.some(d=>documentFolder(d)===f.docType))&&
      (!f.onlyWithDocs||docs.length>0)&&
      (!f.dateFrom||date>=f.dateFrom)&&(!f.dateTo||date<=f.dateTo)&&
      (min===null||(Number.isFinite(min)&&value>=min))&&
      (max===null||(Number.isFinite(max)&&value<=max))&&
      (f.currency==="ALL"||orderCurrency(o)===f.currency);
  }).sort((a,b)=>{
    if(f.sort==="oldest")return new Date(a.createdAt).getTime()-new Date(b.createdAt).getTime();
    if(f.sort==="value-high"||f.sort==="value-low"){
      // Only compare within currencies; grouped results should be filtered by currency first.
      if(orderCurrency(a)!==orderCurrency(b))return orderCurrency(a).localeCompare(orderCurrency(b));
      return f.sort==="value-high"?orderValue(b)-orderValue(a):orderValue(a)-orderValue(b);
    }
    return new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime();
  });
}
