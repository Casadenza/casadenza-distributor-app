import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";
import { gmailMailboxStatus, scanRecentMailbox, searchOperationsMailbox, type ShipmentMailbox } from "@/lib/shipment-mail";
import { deriveOperationsCandidates, type OperationsOrder } from "@/lib/operations-matcher";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({error:"Forbidden"},{status:403});
  const rate = checkRateLimit("operations-inbox:" + session.userId + ":" + getClientIp(request), 12, 60000);
  if (!rate.ok) return NextResponse.json({error:"Too many requests"},{status:429});

  const ref = new URL(request.url).searchParams.get("reference")?.trim() || "";
  if (ref && (ref.length<3 || ref.length>90 || /[\r\n]/.test(ref))) {
    return NextResponse.json({error:"Search by a 3-90 character reference"},{status:400});
  }
  const mailboxes=gmailMailboxStatus();
  // When the production cron is activated, the admin reads a persistent inbox.
  // Simply opening this page no longer triggers Gmail polling.
  const queueMode = process.env.VERCEL_ENV === "production" &&
    process.env.AUTO_INBOX_SCAN_ENABLED === "true";
  if (queueMode && !ref) {
    try {
      const [items, latestRun] = await Promise.all([
        prisma.operationsInboxItem.findMany({
          where:{reviewStatus:"PENDING"},
          orderBy:[{receivedAt:"desc"},{firstSeenAt:"desc"}],
          take:250,
        }),
        prisma.operationsInboxScanRun.findFirst({orderBy:{startedAt:"desc"}}),
      ]);
      const distributorIds=[...new Set(items.flatMap(i=>i.suggestedDistributorId?[i.suggestedDistributorId]:[]))];
      const distributors=distributorIds.length
        ? await prisma.distributor.findMany({where:{id:{in:distributorIds}},select:{id:true,name:true}})
        : [];
      const names=new Map(distributors.map(d=>[d.id,d.name]));
      return NextResponse.json({
        ok:true,mailboxes,queueMode:true,scanMode:"scheduled",
        lastScanAt:latestRun?.startedAt?.toISOString()||null,
        lastScanStatus:latestRun?.status||"NOT_RUN",
        lastScanIssues:latestRun?.errorSummary||null,
        items:items.map(i=>({
          id:i.mailbox+":"+i.messageId+":"+i.partId,
          queueItemId:i.id,
          mailbox:i.mailbox,messageId:i.messageId,
          partId:i.partId==="body"?null:i.partId,
          filename:i.filename,subject:i.subject,from:i.sender,
          date:i.receivedAt?.toISOString()||i.firstSeenAt.toISOString(),
          snippet:i.snippet||"",kind:i.kind,state:i.matchState,
          suggestedOrderId:i.suggestedOrderId,
          suggestedDistributorId:i.suggestedDistributorId,
          suggestedDistributorName:i.suggestedDistributorId?names.get(i.suggestedDistributorId)||null:null,
          reason:i.matchReason,
        })),
        issues:[],scannedMessages:latestRun?.messagesScanned||0,
        sharingEnabled:process.env.ENABLE_SHIPMENT_DOCUMENT_IMPORT==="true",
        note:"Auto-scanned queue. Every attachment requires customer and order verification before sharing.",
      },{headers:{"Cache-Control":"private, no-store"}});
    } catch {
      return NextResponse.json({ok:false,mailboxes,items:[],
        error:"Scheduled inbox queue is not ready. Apply the approved migration before activation."},
        {status:503,headers:{"Cache-Control":"private, no-store"}});
    }
  }
  const configured=mailboxes.filter(m=>m.configured);
  if (!configured.length) return NextResponse.json({
    ok:true,mailboxes,items:[],issues:[],
    scanMode:ref?"reference":"recent",
    note:"Both mailboxes require independent read-only Gmail OAuth in Vercel. No Gmail credentials are currently configured for this deployment.",
    sharingEnabled:false,
  },{headers:{"Cache-Control":"private, no-store"}});

  const [orders, searched] = await Promise.all([
    prisma.order.findMany({
      select:{id:true,distributorId:true,createdAt:true,notes:true,distributor:{select:{name:true,country:true}}},
      orderBy:{createdAt:"desc"},take:1500,
    }),
    Promise.allSettled(configured.map(async mailbox => {
      if (!ref) return scanRecentMailbox(mailbox.mailbox as ShipmentMailbox);
      return searchOperationsMailbox(mailbox.mailbox as ShipmentMailbox,ref);
    })),
  ]);
  const options:OperationsOrder[]=orders.map(o=>{
    let meta:any={};
    try{meta=JSON.parse(o.notes||"{}")}catch{}
    return {
      id:o.id,distributorId:o.distributorId,distributorName:o.distributor.name,country:o.distributor.country,
      poNumber:String(meta.poNumber||meta.po||""),
      invoiceNumber:String(meta.invoiceNumber||meta.invoiceNo||""),
      buyerPoRef:String(meta.buyerPoRef||""),
      date:o.createdAt.toISOString().slice(0,10),
    };
  });
  const messages=searched.flatMap(s=>s.status==="fulfilled"?s.value:[]);
  const issues=searched.flatMap((s,i)=>s.status==="rejected"?[{mailbox:configured[i].mailbox,code:
    s.reason instanceof Error&&/^GMAIL_[A-Z_]+$/.test(s.reason.message)?s.reason.message:"GMAIL_SCAN_FAILED"}]:[]);
  return NextResponse.json({
    ok:true,mailboxes,items:deriveOperationsCandidates(messages,options),issues,
    scanMode:ref?"reference":"recent",scannedMessages:messages.length,
    sharingEnabled:process.env.VERCEL_ENV==="production"&&process.env.ENABLE_SHIPMENT_DOCUMENT_IMPORT==="true",
    note:"Suggestions only. Never publish attachments without verifying the consignee inside the PDF and matching the exact distributor order.",
  },{headers:{"Cache-Control":"private, no-store"}});
}
