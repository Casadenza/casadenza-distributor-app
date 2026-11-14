import type { IntakeMessage, ShipmentMailbox } from "@/lib/shipment-mail";

export type OperationsOrder = {
  id: string; distributorId: string; distributorName: string; country: string | null;
  poNumber: string; invoiceNumber: string; buyerPoRef: string; date: string;
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
  if (/\b(purchase order|\bpo\b|new order)\b/i.test(subj)) return "PURCHASE_ORDER" as const;
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
      : (m.mailbox==="alex" && /\b(po|purchase order|order)\b/i.test(m.subject)
        ? [{partId:null,filename:null}] : []);
    for (const pdf of parts) {
      const id = m.mailbox + ":" + m.messageId + ":" + (pdf.partId || "body");
      if (unique.has(id)) continue;
      const haystack = normalized([m.subject, m.snippet, pdf.filename || ""].join(" "));
      const matched = orders.filter(o => {
        const refs = [o.poNumber,o.invoiceNumber,o.buyerPoRef].map(normalized)
          .filter(x => x.length >= 7);
        // Reference match does not identify the actual document's consignee.
        return refs.some(ref => haystack.includes(ref));
      });
      const match = matched.length===1 ? matched[0] : null;
      const state = matched.length>1 ? "MULTIPLE_MATCHES" : match ? "POSSIBLE_ORDER_MATCH" : "NEEDS_REVIEW";
      unique.set(id,{
        id, mailbox:m.mailbox, messageId:m.messageId, partId:pdf.partId,
        filename:pdf.filename, subject:m.subject, from:m.from,date:m.date,snippet:m.snippet,
        kind:classify(pdf.filename || "",m.subject),state,
        suggestedOrderId:match?.id||null,suggestedDistributorId:match?.distributorId||null,
        suggestedDistributorName:match?.distributorName||null,
        reason:state==="MULTIPLE_MATCHES"
          ? "The same reference appears on several orders; manual review required."
          : match ? "Existing PO/invoice reference found. Consignee inside PDF is not yet verified."
          : "No unique existing portal order reference found. Review customer and order.",
      });
    }
  }
  return [...unique.values()].sort((a,b)=>{
    const da=Date.parse(a.date)||0,db=Date.parse(b.date)||0;
    return db-da||a.id.localeCompare(b.id);
  });
}
