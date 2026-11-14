import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "@/lib/serverSession";
import { prisma } from "@/lib/db";
import { deriveOperationsCandidates, type OperationsOrder } from "@/lib/operations-matcher";
import type { IntakeMessage } from "@/lib/shipment-mail";
import PreviewClient from "./preview-client";

export const dynamic="force-dynamic";
export const runtime="nodejs";

export default async function OperationsPreviewPage() {
  const session=await getServerSession();
  if(!session) redirect("/login");
  if(session.role!=="ADMIN") redirect("/admin");

  const [rawOrders,queue]=await Promise.all([
    prisma.order.findMany({orderBy:{createdAt:"desc"},take:1200,
      select:{id:true,distributorId:true,createdAt:true,notes:true,items:{select:{qty:true}},
        distributor:{select:{name:true,country:true,email:true,billingName:true}}}}),
    prisma.operationsInboxItem.findMany({where:{mailbox:"info",reviewStatus:"PENDING"},
      orderBy:{firstSeenAt:"desc"},take:500,
      select:{id:true,messageId:true,partId:true,filename:true,subject:true,sender:true,
        snippet:true,receivedAt:true,kind:true,firstSeenAt:true,
        suggestedOrderId:true,matchState:true,matchReason:true}}),
  ]);
  const orders:OperationsOrder[]=rawOrders.map(o=>{
    let meta:Record<string,unknown>={};
    try {const parsed=JSON.parse(o.notes||"{}");if(parsed&&typeof parsed==="object")meta=parsed;}catch{}
    return {
      id:o.id,distributorId:o.distributorId,distributorName:o.distributor.name,
      country:o.distributor.country,distributorEmail:o.distributor.email||"",
      billingName:o.distributor.billingName||"",
      poNumber:String(meta.poNumber||meta.po||""),
      invoiceNumber:String(meta.invoiceNumber||meta.invoiceNo||""),
      buyerPoRef:String(meta.buyerPoRef||""),
      date:o.createdAt.toISOString().slice(0,10),
      quantity:o.items.reduce((sum,item)=>sum+item.qty,0),
    };
  });
  const mail: IntakeMessage[]=queue.map(i=>({
    mailbox:"info",messageId:i.messageId,subject:i.subject,from:i.sender,
    date:(i.receivedAt||i.firstSeenAt).toISOString(),snippet:i.snippet||"",
    pdfs:i.partId==="body" ? [] : [{
      partId:i.partId,filename:i.filename||"unnamed.pdf",size:0,
    }],
  }));
  // Recompute suggestions on every preview request. Does not modify the DB.
  // The candidate list is not a complete history until an authorized backfill runs.
  const suggested=deriveOperationsCandidates(mail,orders);
  const matches=suggested.filter(c=>c.suggestedOrderId).map(c=>({
    id:c.id,orderId:c.suggestedOrderId!,kind:c.kind,
    filename:c.filename||"Email body",subject:c.subject,
    confidence:c.confidence,evidence:c.evidence,reason:c.reason,date:c.date,
  }));
  // Some targeted scans used actual PDF text, which is intentionally not stored.
  // Retain those prior proposals in the admin preview, marked as unverified.
  const known=new Set(orders.map(o=>o.id));
  const already=new Set(matches.map(m=>m.id));
  for(const i of queue){
    const id="info:"+i.messageId+":"+i.partId;
    if(!i.suggestedOrderId || i.matchState!=="POSSIBLE_ORDER_MATCH" ||
       !known.has(i.suggestedOrderId) || already.has(id)) continue;
    matches.push({id,orderId:i.suggestedOrderId,kind:i.kind as typeof matches[number]["kind"],
      filename:i.filename||"Email body",subject:i.subject,confidence:0,
      evidence:["Previously suggested by Gmail scanner; independent revalidation required"],
      reason:i.matchReason,date:(i.receivedAt||i.firstSeenAt).toISOString()});
    already.add(id);
  }
  const viewOrders=orders.map(o=>({
    id:o.id,customer:o.distributorName,country:o.country||"",
    date:o.date,quantity:o.quantity||0,invoice:o.invoiceNumber,
    po:o.poNumber,linked:matches.filter(m=>m.orderId===o.id).length,
  }));
  return <main className="mx-auto max-w-6xl space-y-5 px-4 py-8">
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-widest text-amber-700">Admin only · Read-only evaluation</p>
      <h1 className="text-3xl font-semibold">Order → Shipment Documents Preview</h1>
      <p className="text-sm text-stone-600">
        Proposed associations are computed from the existing distributor orders and the available Gmail review queue.
        No attachments are shared or assigned. PDF contents have not been independently verified.
      </p>
      <Link href="/admin/operations" className="text-sm underline">Return to Gmail review & order search</Link>
    </div>
    <PreviewClient orders={viewOrders} matches={matches} queueCount={queue.length}
      unmatchedCount={suggested.filter(c=>!c.suggestedOrderId).length}/>
    <p className="text-xs text-stone-500">
      This is a live-data preview, not a synthetic test fixture. It only uses the emails that have already been
      scanned and retained in the queue. Older correspondence requires targeted historical scanning; a blank
      order card is not proof its documents do not exist.
    </p>
  </main>;
}
