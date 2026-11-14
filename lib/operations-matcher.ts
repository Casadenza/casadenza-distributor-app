import type { IntakeMessage, ShipmentMailbox } from "@/lib/shipment-mail";

export type OperationsOrder = {
  id: string; distributorId: string; distributorName: string; country: string | null;
  poNumber: string; invoiceNumber: string; buyerPoRef: string; date: string;
  distributorEmail?: string; billingName?: string; quantity?: number;
};
export type OperationsCandidate = {
  id: string; mailbox: ShipmentMailbox; messageId: string; partId: string | null;
  filename: string | null; subject: string; from: string; date: string; snippet: string;
  kind: "PURCHASE_ORDER" | "INVOICE" | "AWB_HAWB" | "PACKING_LIST" | "OTHER";
  state: "POSSIBLE_ORDER_MATCH" | "NEEDS_REVIEW" | "MULTIPLE_MATCHES";
  suggestedOrderId: string | null;
  suggestedDistributorId: string | null;
  suggestedDistributorName: string | null;
  reason: string;
};
function normalized(value: string) {
  return (value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}
function classify(filename: string, subject: string) {
  const file = (filename || "").toLowerCase();
  const subj = (subject || "").toLowerCase();
  if (/\b(hawb|mawb|awb|waybill|airwaybill|air waybill|bill of lading|bol|tracking)\b/i.test(file)) return "AWB_HAWB" as const;
  if (/\b(packing|packlist|packinglist|pklist|p-list)\b/i.test(file)) return "PACKING_LIST" as const;
  if (/\b(invoice|inv|commercial invoice|proforma|pi)\b/i.test(file)) return "INVOICE" as const;
  if (/\b(purchase order|po|order form)\b/i.test(file)) return "PURCHASE_ORDER" as const;
  if (/\b(hawb|mawb|awb|waybill|bill of lading|shipping|shipment)\b/i.test(subj)) return "AWB_HAWB" as const;
  if (/\b(packing list|packing)\b/i.test(subj)) return "PACKING_LIST" as const;
  if (/\b(invoice|proforma)\b/i.test(subj)) return "INVOICE" as const;
  if (/\b(purchase order|\bpo\b|new order|order confirmation|order placed|customer order)\b/i.test(subj)) return "PURCHASE_ORDER" as const;
  return "OTHER" as const;
}
/**
 * A suggested match is NOT a verified consignee or automatic publishing permission.
 * Only exact existing PO/invoice reference plus clear customer evidence is sufficient
 * for a suggestion; attached PDF content still needs verification.
 */
export function deriveOperationsCandidates(messages: IntakeMessage[], orders: OperationsOrder[]): OperationsCandidate[] {
  const unique = new Map<string, OperationsCandidate>();
  for (const m of messages) {
    const parts: {partId:string|null;filename:string|null}[] =
      m.pdfs.length ? m.pdfs.map(p => ({partId:p.partId,filename:p.filename}))
      : ((classify("", m.subject) !== "OTHER" || /\b(purchase order|order confirmation|order placed|awb|hawb|shipment|invoice|packing list)\b/i.test(m.snippet))
        ? [{partId:null,filename:null}] : []);
    for (const pdf of parts) {
      const id = m.mailbox + ":" + m.messageId + ":" + (pdf.partId || "body");
      if (unique.has(id)) continue;
      const haystack = normalized([m.subject, m.snippet, pdf.filename || ""].join(" "));
      const context = [m.subject,m.snippet,pdf.filename||""].join(" ").toLowerCase();
      const kind = classify(pdf.filename || "",m.subject);
      const documentSignal = kind !== "OTHER" ||
        /\b(invoice|purchase order|packing list|waybill|hawb|mawb|awb|tracking|shipment|shipped|dispatch|bill of lading|consignee|proforma)\b/i.test(context);
      // Catalogues, marketing collateral, vendor receipts and generic PDFs are not
      // candidate shipment documents unless a strong exact order reference exists.
      const unrelated = /\b(catalogue|catalog|brochure|newsletter|marketing|portfolio|presentation|resume|cv|advertisement|statement|receipt)\b/i.test(pdf.filename||"");
      const scores = orders.map(o=>{
        const refs = [o.poNumber,o.invoiceNumber,o.buyerPoRef].map(normalized).filter(x=>x.length>=7);
        const reference = refs.some(ref=>haystack.includes(ref));
        const names = [o.distributorName,o.billingName||""].map(normalized).filter(x=>x.length>=6);
        const customerName = names.some(name=>haystack.includes(name));
        const from = m.from.toLowerCase();
        const email = (o.distributorEmail||"").toLowerCase().trim();
        const customerEmail = email.length>5 && from.includes(email);
        const qty = Number(o.quantity);
        const quantity = qty>0 && new RegExp("(?:^|\\\\D)"+qty+"\\\\s*(?:sheets?|pcs?|pieces?|panels?)(?:\\\\D|$)","i").test(context);
        // Quantity or country by itself must NEVER attach a document to an order.
        const score = (reference?100:0)+(customerName?35:0)+(customerEmail?35:0)+(quantity?15:0);
        return {order:o,score,reference,customerName,customerEmail,quantity};
      }).filter(x=>x.reference||(documentSignal&&(x.customerName||x.customerEmail)));
      scores.sort((a,b)=>b.score-a.score);
      const top = scores[0];
      const tie = !!top && scores.filter(x=>x.score===top.score).length>1;
      const supported = top && (top.reference ||
        ((top.customerName||top.customerEmail) && (top.quantity||documentSignal)));
      if ((!documentSignal&&!top?.reference) || (unrelated&&!top?.reference)) continue;
      const match = supported&&!tie ? top.order : null;
      const state = tie ? "MULTIPLE_MATCHES" : match ? "POSSIBLE_ORDER_MATCH" : "NEEDS_REVIEW";
      const evidence = top ? [
        top.reference?"exact PO/invoice reference":null,
        top.customerName?"customer/billing name":null,
        top.customerEmail?"registered customer email":null,
        top.quantity?"ordered sheet quantity":null,
      ].filter(Boolean).join(", ") : "";
      unique.set(id,{
        id, mailbox:m.mailbox, messageId:m.messageId, partId:pdf.partId,
        filename:pdf.filename, subject:m.subject, from:m.from,date:m.date,snippet:m.snippet,
        kind,state,
        suggestedOrderId:match?.id||null,suggestedDistributorId:match?.distributorId||null,
        suggestedDistributorName:match?.distributorName||null,
        reason:state==="MULTIPLE_MATCHES"
          ? "Multiple orders share the strongest evidence. Verify the exact consignee and invoice."
          : match ? "Possible match based on "+evidence+". PDF contents and consignee not verified; no document shared."
          : "Relevant shipping/order message but no unique customer/order evidence. Manual review required.",
      });
    }
  }
  return [...unique.values()].sort((a,b)=>{
    const da=Date.parse(a.date)||0,db=Date.parse(b.date)||0;
    return db-da||a.id.localeCompare(b.id);
  });
}
