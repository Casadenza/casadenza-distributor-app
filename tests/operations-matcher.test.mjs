import test from "node:test";
import assert from "node:assert/strict";
import {deriveOperationsCandidates, classifyDocument} from "../lib/operations-matcher.ts";

const baseOrders=[
{id:"dubai-175",distributorId:"wow",distributorName:"Wow Factor",billingName:"Wow Factor Trading LLC",
distributorEmail:"logistics@wowfactor.ae",country:"UAE",poNumber:"WF-2026-175",invoiceNumber:"CST-26-27-25",buyerPoRef:"WF/175/26",quantity:175,date:"2026-11-03"},
{id:"dubai-125",distributorId:"wow",distributorName:"Wow Factor",billingName:"Wow Factor Trading LLC",
distributorEmail:"logistics@wowfactor.ae",country:"UAE",poNumber:"WF-2026-125",invoiceNumber:"CST-26-27-21",buyerPoRef:"WF/125/26",quantity:125,date:"2026-10-05"},
{id:"uk-175",distributorId:"uk",distributorName:"London Surface Trading",billingName:"London Surface Trading Limited",
distributorEmail:"orders@londonsurface.co.uk",country:"UK",poNumber:"LST-175-26",invoiceNumber:"CST-26-27-35",buyerPoRef:"LST/26/175",quantity:175,date:"2026-11-02"}
];
function mail(x={}){
  return {mailbox:"info",messageId:"messageid12345",subject:"",from:"",date:"2026-11-14",
    snippet:"",pdfs:[],...x};
}
function pdf(filename,text="",partId="part1"){return {partId,filename,size:12000,text};}
function match(m,orders=baseOrders){return deriveOperationsCandidates([mail(m)],orders);}
test("exact invoice + customer + quantity proposes correct Dubai 175-sheet order",()=>{
  const result=match({subject:"Wow Factor commercial invoice CST-26-27-25 for 175 sheets",
    from:"logistics@wowfactor.ae",pdfs:[pdf("Commercial Invoice CST-26-27-25.pdf","Buyer: Wow Factor Trading LLC\nQuantity: 175 sheets")]});
  assert.equal(result.length,1);assert.equal(result[0].suggestedOrderId,"dubai-175");
  assert.equal(result[0].state,"POSSIBLE_ORDER_MATCH");
  assert.ok(result[0].evidence.includes("Exact PO/invoice reference"));
});
test("packing list linked through invoice reference rather than document name",()=>{
  const r=match({subject:"Re CST-26-27-25 packing list",from:"agent@freight.test",
    pdfs:[pdf("PL-175.pdf","Consignee: Wow Factor Trading LLC\n175 sheets")]});
  assert.equal(r[0].kind,"PACKING_LIST");assert.equal(r[0].suggestedOrderId,"dubai-175");
});
test("HAWB for freight forwarder can be associated with exact invoice reference",()=>{
  const r=match({subject:"HAWB delivery for Wow Factor invoice CST-26-27-25",
    from:"freight@forwarder.test",pdfs:[pdf("HAWB.pdf","Consignee: Wow Factor Trading LLC\n175 sheets")]});
  assert.equal(r[0].kind,"AWB_HAWB");assert.equal(r[0].suggestedOrderId,"dubai-175");
});
test("shipping bill is classified separately from invoice",()=>{
  assert.equal(classifyDocument("SB 1828 - Wow Factor.pdf","Shipment"),"SHIPPING_BILL");
  assert.equal(classifyDocument("PI-177.pdf","Re order"),"PROFORMA_INVOICE");
});
test("same quantity but different customer is NOT assigned to Dubai",()=>{
 const r=match({subject:"175 sheets new shipment",from:"orders@londonsurface.co.uk",
  pdfs:[pdf("Commercial Invoice CST-26-27-35.pdf","Buyer: London Surface Trading Limited\n175 sheets")]});
 assert.equal(r[0].suggestedOrderId,"uk-175");
});
test("customer name and quantity alone with competing identical orders is ambiguous",()=>{
 const same={...baseOrders[0],id:"dubai-again",poNumber:"WF-OTHER-999",invoiceNumber:"CST-2026-OTHER",buyerPoRef:"FAKE-OTHER"};
 const r=match({subject:"Wow Factor 175 sheets packing list",from:"agent@freight.test",
  pdfs:[pdf("packing list.pdf","Consignee: Wow Factor Trading LLC\n175 sheets")]},
  [baseOrders[0],same]);
 assert.equal(r[0].state,"MULTIPLE_MATCHES");
 assert.equal(r[0].suggestedOrderId,null);
});
test("conflicting PDF consignee vetoes an otherwise exact invoice hit",()=>{
 const r=match({subject:"CST-26-27-25 invoice Wow Factor 175 sheets",
  from:"logistics@wowfactor.ae",
  pdfs:[pdf("Invoice CST-26-27-25.pdf","Buyer: London Surface Trading Limited\n175 sheets")]});
 assert.equal(r[0].suggestedOrderId,null);assert.ok(r[0].conflicts.length>0);
});
test("conflicting PDF quantity vetoes subject invoice match",()=>{
 const r=match({subject:"Invoice CST-26-27-25 Wow Factor 175 sheets",from:"logistics@wowfactor.ae",
  pdfs:[pdf("CST-26-27-25 invoice.pdf","Buyer: Wow Factor Trading LLC\nQuantity: 125 sheets")]});
 assert.equal(r[0].suggestedOrderId,null);
 assert.ok(r[0].conflicts.some(x=>x.includes("quantity")));
});
test("generic catalogue and marketing PDFs are rejected",()=>{
 const r=match({subject:"New Casadenza catalogue",from:"marketing@casadenza.com",
  pdfs:[pdf("Catalogue 2026.pdf","Stone texture catalogue")]});
 assert.equal(r.length,0);
});
test("text-only order from known buyer enters review, not silently linked to old order",()=>{
 const r=match({subject:"Please place a new order",from:"logistics@wowfactor.ae",
  snippet:"We would like to order 175 sheets for Dubai. Please send PI."});
 assert.equal(r.length,1);
 assert.equal(r[0].partId,null);
 assert.equal(r[0].suggestedOrderId,null);
 assert.equal(r[0].state,"NEEDS_REVIEW");
 assert.equal(r[0].suggestedDistributorId,"wow");
});
test("unrelated sender without buyer or PO evidence never gets a proposed order",()=>{
 const r=match({subject:"Commercial invoice for 175 sheets",from:"unknown@other.example",
  pdfs:[pdf("invoice.pdf","Quantity 175 sheets")]});
 assert.equal(r[0].suggestedOrderId,null);
});
test("quoted quantity 175 with known customer but missing invoice can propose at most unique order",()=>{
 const r=match({subject:"Wow Factor packing list, 175 sheets",from:"agent@forwarder.test",
  pdfs:[pdf("packing list.pdf","Consignee: Wow Factor Trading LLC\n175 sheets")]});
 assert.equal(r[0].suggestedOrderId,"dubai-175");
});
test("invoice reference belongs to another buyer and must not be assigned to Dubai",()=>{
 const r=match({subject:"LST-175-26 London Surface commercial invoice",from:"orders@londonsurface.co.uk",
  pdfs:[pdf("invoice.pdf","Buyer: London Surface Trading Limited\n175 sheets")]});
 assert.equal(r[0].suggestedOrderId,"uk-175");
});
test("duplicate message id and attachment part is de-duplicated",()=>{
 const m=mail({subject:"Invoice CST-26-27-25 Wow Factor",from:"logistics@wowfactor.ae",
  pdfs:[pdf("invoice CST-26-27-25.pdf","Buyer: Wow Factor Trading LLC\n175 sheets")]});
 assert.equal(deriveOperationsCandidates([m,m],baseOrders).length,1);
});
test("random PDF is not a candidate without order/shipment evidence",()=>{
 assert.equal(match({subject:"Notes from meeting",from:"person@example.com",
   pdfs:[pdf("notes.pdf","Presentation about sustainability")]}).length,0);
});
test("invoice without invoice number and without quantity is held for review",()=>{
 const r=match({subject:"Wow Factor invoice",from:"logistics@wowfactor.ae",
  pdfs:[pdf("invoice.pdf","Billing contact Wow Factor Trading LLC")]});
 assert.equal(r[0].state,"NEEDS_REVIEW");
});

test("forwarded thread mentioning two invoices must remain unassigned",()=>{
  const r=match({subject:"RE CST-26-27-25 and CST-26-27-21",from:"agent@freight.test",
    pdfs:[pdf("packing list.pdf","Consignee: Wow Factor Trading LLC\n175 sheets")]});
  assert.equal(r[0].suggestedOrderId,null);
  assert.ok(r[0].conflicts.some(s=>s.includes("Multiple order references")));
});
test("invoice substring is not treated as an exact invoice reference",()=>{
  const r=match({subject:"Invoice CST-26-27-250 Wow Factor",from:"logistics@wowfactor.ae",
    pdfs:[pdf("invoice.pdf","Buyer: Wow Factor Trading LLC\n175 sheets")]});
  assert.equal(r[0].evidence.includes("Exact PO/invoice reference"),false);
});
test("customer name Wow Factory is not Wow Factor",()=>{
 const r=match({subject:"Wow Factory 175 sheets packing list",from:"unknown@forwarder.test",
    pdfs:[pdf("packing list.pdf","Buyer: Wow Factory Industries\n175 sheets")]});
 assert.equal(r[0].suggestedOrderId,null);
});
test("an invoice with a missing consignee but exact PO is a proposal, not an automatic share",()=>{
 const r=match({subject:"WF-2026-175 commercial invoice",from:"agent@forwarder.test",
    pdfs:[pdf("invoice.pdf","Invoice reference WF-2026-175")]});
 assert.equal(r[0].state,"NEEDS_REVIEW");
});
test("two legitimate attachments in one email become separate candidates",()=>{
 const r=match({subject:"Wow Factor invoice CST-26-27-25 / documents",
    from:"logistics@wowfactor.ae",pdfs:[
      pdf("invoice CST-26-27-25.pdf","Buyer: Wow Factor Trading LLC\n175 sheets","p1"),
      pdf("packing list.pdf","Consignee: Wow Factor Trading LLC\n175 sheets","p2")]});
 assert.equal(r.length,2);
 assert.ok(r.some(x=>x.kind==="PACKING_LIST"));
});
test("mixed legitimate invoice plus marketing attachment drops marketing only",()=>{
 const r=match({subject:"Wow Factor invoice CST-26-27-25",from:"logistics@wowfactor.ae",
  pdfs:[pdf("invoice.pdf","Buyer: Wow Factor Trading LLC\n175 sheets","p1"),
        pdf("catalogue 2026.pdf","Company brochure","p2")]});
 assert.equal(r.length,1);
});
test("PI with matching customer but quantity from other order stays unassigned",()=>{
 const r=match({subject:"Wow Factor PI CST-26-27-25 for 175 sheets",from:"logistics@wowfactor.ae",
   pdfs:[pdf("PI CST-26-27-25.pdf","Buyer: Wow Factor Trading LLC\n125 sheets")]});
 assert.equal(r[0].suggestedOrderId,null);
});
test("shipping bill from forwarder with customer and matching PDF quantity is proposed",()=>{
 const r=match({subject:"SB 38392 for Wow Factor 175 sheets",from:"export@agent.test",
   pdfs:[pdf("Shipping Bill SB38392.pdf","Consignee: Wow Factor Trading LLC\n175 sheets")]});
 assert.equal(r[0].kind,"SHIPPING_BILL");
 assert.equal(r[0].suggestedOrderId,"dubai-175");
});
