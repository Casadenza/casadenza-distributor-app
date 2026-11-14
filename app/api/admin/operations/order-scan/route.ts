import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { searchOperationsMailbox, readShipmentPdf } from "@/lib/shipment-mail";
import { extractShipmentPdfText } from "@/lib/shipment-pdf-text";
import { deriveOperationsCandidates, type OperationsOrder } from "@/lib/operations-matcher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Admin-triggered historical search anchored to a known portal order.
// No email modification, order creation, or customer-visible document sharing.
export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({error:"Forbidden"},{status:403});
  const origin=request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin)
    return NextResponse.json({error:"Invalid origin"},{status:403});
  const rate=checkRateLimit("target-order-scan:"+session.userId+":"+getClientIp(request),4,60000);
  if(!rate.ok) return NextResponse.json({error:"Too many searches"},{status:429});
  const input=await request.json().catch(()=>null);
  if(typeof input?.orderId!=="string" || !/^[a-zA-Z0-9_-]{10,80}$/.test(input.orderId))
    return NextResponse.json({error:"Invalid order ID"},{status:400});
  const order=await prisma.order.findUnique({
    where:{id:input.orderId},
    select:{id:true,distributorId:true,createdAt:true,notes:true,
      items:{select:{qty:true}},
      distributor:{select:{name:true,country:true,email:true,billingName:true}}},
  });
  if(!order)return NextResponse.json({error:"Order not found"},{status:404});
  let meta:Record<string,unknown>={};
  try {const value=JSON.parse(order.notes||"{}");if(value&&typeof value==="object")meta=value;} catch {}
  const details:OperationsOrder={
    id:order.id,distributorId:order.distributorId,
    distributorName:order.distributor.name,country:order.distributor.country,
    distributorEmail:order.distributor.email||"",billingName:order.distributor.billingName||"",
    poNumber:String(meta.poNumber||meta.po||""),
    invoiceNumber:String(meta.invoiceNumber||meta.invoiceNo||""),
    buyerPoRef:String(meta.buyerPoRef||""),
    date:order.createdAt.toISOString().slice(0,10),
    quantity:order.items.reduce((sum,item)=>sum+item.qty,0),
  };
  const terms=[details.invoiceNumber,details.poNumber,details.buyerPoRef,
    details.distributorName,details.billingName||"",details.distributorEmail||""]
    .map(value=>String(value||"").replace(/[\r\n\"\\]/g," ").trim())
    .filter(value=>value.length>=5&&value.length<=90);
  const distinct=[...new Set(terms.map(s=>s.toLowerCase()))].slice(0,6);
  if (!distinct.length) return NextResponse.json({error:"Order needs a customer email, company name or invoice reference first."},{status:422});
  const results=await Promise.allSettled(distinct.map(term=>searchOperationsMailbox("info",term)));
  const messages=[...new Map(results.flatMap(r=>r.status==="fulfilled"?r.value:[])
    .map(m=>[m.messageId,m])).values()];
  // Read a bounded number of real PDFs for accurate consignee/invoice checks.
  // Content stays in process memory; the review DB receives metadata only.
  const attachments=messages.flatMap(m=>m.pdfs.map(p=>({m,p})))
    .filter(x=>x.p.partId&&(!x.p.size||x.p.size<=2*1024*1024))
    .slice(0,12);
  let pdfsParsed=0,pdfsEmpty=0;
  for(let start=0;start<attachments.length;start+=3) {
    const batch=attachments.slice(start,start+3);
    await Promise.all(batch.map(async ({m,p})=>{
      try {
        const doc=await readShipmentPdf({mailbox:"info",messageId:m.messageId,partId:p.partId});
        const extracted=await extractShipmentPdfText(doc.buffer);
        if(extracted.status==="EXTRACTED") {p.text=extracted.text;pdfsParsed++;}
        else pdfsEmpty++;
      } catch {pdfsEmpty++;}
    }));
  }
  const candidates=deriveOperationsCandidates(messages,[details])
    .filter(c=>c.suggestedOrderId===details.id);
  const rows=candidates.map(c=>({
    mailbox:c.mailbox,messageId:c.messageId,partId:c.partId||"body",
    filename:c.filename,sender:c.from,subject:c.subject,snippet:c.snippet,
    receivedAt:Number.isFinite(Date.parse(c.date))?new Date(c.date):null,
    kind:c.kind,matchState:c.state,suggestedOrderId:c.suggestedOrderId,
    suggestedDistributorId:c.suggestedDistributorId,matchReason:c.reason,
  }));
  const added=rows.length?await prisma.operationsInboxItem.createMany({data:rows,skipDuplicates:true}):{count:0};
  const issues=results.filter(r=>r.status==="rejected").length;
  return NextResponse.json({ok:issues===0,orderId:details.id,searchTerms:distinct.length,
    messagesInspected:messages.length,pdfsParsed,pdfsEmpty,
    matchedCandidates:candidates.length,added:added.count,
    failures:issues,reviewRequired:true,sharingEnabled:false}, {status:issues===results.length?503:200,
      headers:{"Cache-Control":"private, no-store"}});
}
