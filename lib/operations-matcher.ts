import type { IntakeMessage, ShipmentMailbox } from "@/lib/shipment-mail";

export type OperationsOrder = {
  id: string; distributorId: string; distributorName: string; country: string | null;
  poNumber: string; invoiceNumber: string; buyerPoRef: string; date: string;
  distributorEmail?: string; billingName?: string; quantity?: number;
};
export type DocumentKind = "PURCHASE_ORDER" | "INVOICE" | "PROFORMA_INVOICE" |
  "SHIPPING_BILL" | "AWB_HAWB" | "PACKING_LIST" | "OTHER";
export type OperationsCandidate = {
  id: string; mailbox: ShipmentMailbox; messageId: string; partId: string | null;
  filename: string | null; subject: string; from: string; date: string; snippet: string;
  kind: DocumentKind;
  state: "POSSIBLE_ORDER_MATCH" | "NEEDS_REVIEW" | "MULTIPLE_MATCHES";
  suggestedOrderId: string | null; suggestedDistributorId: string | null;
  suggestedDistributorName: string | null; reason: string;
  confidence: number; evidence: string[]; conflicts: string[];
};

function normalized(s: string) { return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, ""); }
function canonicalText(s: string) { return (s || "").replace(/\s+/g, " ").toLowerCase(); }
function emailOf(s: string) {
  const m = (s || "").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return m ? m[0].toLowerCase() : "";
}
function termInText(term: string, text: string, minimum=6) {
  const needle = normalized(term);
  if(needle.length < minimum) return false;
  return normalized(text).includes(needle);
}
function quantities(s: string): number[] {
  const result: number[] = [];
  for(const m of s.matchAll(/\b(\d{1,6})\s*(?:sheets?|pcs?|pieces?|panels?)\b/gi)) {
    const n=Number(m[1]);
    if(n>0) result.push(n);
  }
  return result;
}
export function classifyDocument(filename: string, subject: string, extractedText = ""): DocumentKind {
  const file=canonicalText(filename), subj=canonicalText(subject), body=canonicalText(extractedText);
  const all=file+" "+subj;
  if(/\b(shipping[\s_-]?bill|ship[\s_-]?bill|shippingbill|sb\s*(?:no|number|\d{2,})|let export order)\b/.test(all)) return "SHIPPING_BILL";
  if(/\b(pro[\s-]?forma|pi[\s_-]?(?:no|number|\d{2,}))\b/.test(all) || /(?:^|[\s_.-])pi(?:[\s_.-]|$)/.test(file)) return "PROFORMA_INVOICE";
  if(/\b(hawb|mawb|awb|air[\s_-]?waybill|waybill|bill of lading|tracking|bol)\b/.test(all)) return "AWB_HAWB";
  if(/\b(packing[\s_-]?list|packinglist|packlist|pklist|p[\s_-]?list)\b/.test(all)) return "PACKING_LIST";
  if(/\b(commercial[\s_-]?invoice|invoice|inv[\s_-]?\d{2,})\b/.test(all)) return "INVOICE";
  if(/\b(purchase[\s_-]?order|customer[\s_-]?order|new order|order confirmation|po[\s_-]?\d{2,})\b/.test(all)) return "PURCHASE_ORDER";
  // PDF-only classification is only a fallback when the file/subject have no type.
  if(/\bshipping bill\b/.test(body)) return "SHIPPING_BILL";
  if(/\bproforma invoice\b/.test(body)) return "PROFORMA_INVOICE";
  if(/\b(?:house air waybill|air waybill|hawb|awb)\b/.test(body)) return "AWB_HAWB";
  if(/\bpacking list\b/.test(body)) return "PACKING_LIST";
  if(/\bcommercial invoice\b/.test(body)) return "INVOICE";
  if(/\bpurchase order\b/.test(body)) return "PURCHASE_ORDER";
  return "OTHER";
}
const irrelevantFile=/\b(catalogue|catalog|brochure|newsletter|marketing|portfolio|presentation|resume|curriculum vitae|advertisement|bank statement|tax receipt|quotation template)\b/i;
const orderSignal=/\b(new order|purchase order|customer order|order confirmation|please (?:place|process|book) (?:an? )?order|order placed|(?:we|i) (?:would like|want|wish) to order|please (?:supply|send|dispatch) \d+\s*(?:sheets?|panels?))\b/i;
const shippingSignal=/\b(invoice|proforma|packing list|shipping bill|waybill|hawb|mawb|awb|tracking|shipment|dispatch|consignee|bill of lading)\b/i;
function refMatch(ref: string, text: string) {
  const n=normalized(ref);
  return n.length>=7 && normalized(text).includes(n);
}
function scoreOrder(
  o: OperationsOrder, m: IntakeMessage,
  description: string, extractedText: string, kind: DocumentKind
) {
  const context=description+" "+extractedText;
  const messageContext=m.subject+" "+m.snippet;
  const explicitRefs=[o.poNumber,o.invoiceNumber,o.buyerPoRef].filter(Boolean);
  const reference=explicitRefs.some(ref=>refMatch(ref,context));
  const filenameRef=explicitRefs.some(ref=>refMatch(ref,description));
  const customerName=[o.distributorName,o.billingName||""].some(s=>termInText(s,context,6));
  const verifiedFrom=!!o.distributorEmail && emailOf(m.from)===o.distributorEmail.toLowerCase().trim();
  const emailMention=!!o.distributorEmail && context.toLowerCase().includes(o.distributorEmail.toLowerCase().trim());
  const customerEmail=verifiedFrom || emailMention;
  const qty=Number(o.quantity||0);
  const found=quantities(context);
  const quantity=qty>0 && found.includes(qty);
  const inDocument=quantities(extractedText);
  const otherQuantity=qty>0 && ((inDocument.length>0 && !inDocument.includes(qty)) ||
    (inDocument.length===0 && found.length>0 && !quantity));
  const extractedBuyer=extractedText.match(/(?:buyer|consignee|bill to)\s*[:\-]\s*([^\r\n]{4,100})/i);
  const buyer=extractedBuyer?.[1] || "";
  const knownNames=[o.distributorName,o.billingName||""].filter(x=>normalized(x).length>=6);
  const buyerConflict=!!buyer && knownNames.length>0 && !knownNames.some(n=>termInText(n,buyer,6));
  // Buyer mismatch in a PDF cannot be erased by filename similarity.
  const conflicts:string[]=[];
  if(buyerConflict) conflicts.push("PDF buyer/consignee differs from distributor");
  if(otherQuantity) conflicts.push("Sheet quantity differs from order");
  const evidence:string[]=[];
  if(reference) evidence.push("Exact PO/invoice reference");
  if(filenameRef) evidence.push("Reference in filename/subject");
  if(customerName) evidence.push("Customer name");
  if(customerEmail) evidence.push("Customer email");
  if(quantity) evidence.push("Sheet quantity");
  if(extractedText) evidence.push("PDF text inspected");
  const score=(reference?75:0)+(filenameRef?10:0)+(customerName?27:0)+
    (customerEmail?28:0)+(quantity?18:0) + (extractedText&&customerName?10:0) -
    (otherQuantity?45:0)-(buyerConflict?110:0);
  // If no exact reference exists, buyer identity + quantity must both corroborate.
  const enough = reference ?
    (customerName || customerEmail || (quantity && !buyerConflict)):
    ((customerName||customerEmail) && quantity && kind!=="OTHER");
  return {order:o,score,evidence,conflicts,enough,reference};
}

export function deriveOperationsCandidates(messages: IntakeMessage[], orders: OperationsOrder[]): OperationsCandidate[] {
  const unique=new Map<string,OperationsCandidate>();
  for(const m of messages) {
    const messageText=m.subject+" "+m.snippet;
    const orderMail=orderSignal.test(messageText);
    const parts:{partId:string|null;filename:string|null;text:string}[]=[
      ...m.pdfs.map(p=>({partId:p.partId,filename:p.filename,text:(p as {text?:string}).text||""})),
      ...((orderMail || (m.pdfs.length===0 && shippingSignal.test(messageText)))
        ? [{partId:null,filename:null,text:""}] : []),
    ];
    for(const p of parts) {
      const id=m.mailbox+":"+m.messageId+":"+(p.partId||"body");
      if(unique.has(id))continue;
      const kind=classifyDocument(p.filename||"",m.subject,p.text);
      const descriptive=[m.subject,m.snippet,p.filename||""].join(" ");
      const relevant=kind!=="OTHER" || orderMail || shippingSignal.test(messageText);
      if(!relevant || (p.filename && irrelevantFile.test(p.filename)))continue;
      const rankings=orders.map(o=>scoreOrder(o,m,descriptive,p.text,kind))
        .filter(x=>x.score>0&&x.enough).sort((a,b)=>b.score-a.score);
      const best=rankings[0];
      const second=rankings[1];
      const tie=!!best&&!!second&&best.score-second.score<20;
      const newOrder=orderMail && p.partId===null && !best?.reference;
      const conflict=!!best?.conflicts.length;
      // Do not associate a new customer order with an older portal order by name alone.
      const supportedTextMatch=!!best && best.evidence.includes("Customer name") &&
        best.evidence.includes("Sheet quantity") && best.evidence.includes("PDF text inspected");
      const suggested=!tie&&!conflict&&!newOrder&&best&&
        (best.score>=85 || (supportedTextMatch && best.score>=55))?best.order:null;
      const state=tie?"MULTIPLE_MATCHES":suggested?"POSSIBLE_ORDER_MATCH":"NEEDS_REVIEW";
      // Candidate review is still useful even when the best match is not conclusive.
      const reason=tie?"Two or more orders have similar evidence; manual verification required.":
        conflict?"Conflicting document data: "+best!.conflicts.join("; "):
        newOrder?"Potential new customer order; create a draft only after verifying order lines.":
        suggested?"Proposed only: "+best!.evidence.join(", ")+". Document is not shared.":
        "Potential order/shipment document without enough independent evidence.";
      unique.set(id,{
        id,mailbox:m.mailbox,messageId:m.messageId,partId:p.partId,
        filename:p.filename,subject:m.subject,from:m.from,date:m.date,snippet:m.snippet,
        kind,state,suggestedOrderId:suggested?.id||null,
        suggestedDistributorId:suggested?.distributorId||(newOrder?best?.order.distributorId:null)||null,
        suggestedDistributorName:suggested?.distributorName||null,
        reason,confidence:Math.max(0,Math.min(100,best?.score||0)),
        evidence:best?.evidence||[],conflicts:best?.conflicts||[],
      });
    }
  }
  return [...unique.values()].sort((a,b)=>(Date.parse(b.date)||0)-(Date.parse(a.date)||0));
}
