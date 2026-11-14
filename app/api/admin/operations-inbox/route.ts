import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";
import { gmailMailboxStatus, scanRecentMailbox, searchShipmentMailbox, type IntakeMessage, type ShipmentMailbox } from "@/lib/shipment-mail";
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
      const results=await searchShipmentMailbox(mailbox.mailbox as ShipmentMailbox,ref);
      return results.map(m=>({
        mailbox:m.mailbox,messageId:m.messageId,subject:m.subject,from:m.from,
        date:m.date,snippet:"",pdfs:m.attachments,
      } satisfies IntakeMessage));
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
