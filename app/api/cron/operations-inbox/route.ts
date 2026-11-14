import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { gmailMailboxStatus, scanRecentMailbox, type ShipmentMailbox } from "@/lib/shipment-mail";
import { deriveOperationsCandidates, type OperationsOrder } from "@/lib/operations-matcher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function json(data: object, status = 200) {
  return NextResponse.json(data, {status, headers: {"Cache-Control": "private, no-store"}});
}
function checkSecret(auth: string | null) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32 || !auth?.startsWith("Bearer ")) return false;
  const got = Buffer.from(auth.slice(7), "utf8");
  const expected = Buffer.from(secret, "utf8");
  return got.length === expected.length && timingSafeEqual(got, expected);
}
function scheduledSlot(now: Date) {
  const minute = Math.floor(now.getUTCMinutes()/15)*15;
  const slot = new Date(now.getTime());
  slot.setUTCMinutes(minute, 0, 0);
  return slot.toISOString();
}

/**
 * Vercel Schedules: every 15 minutes (available on Hobby as public beta).
 * Authorized production-only read of the info@ Gmail inbox and persistence of
 * unverified candidate metadata. Never creates orders or shares documents.
 * Requires reviewed migration + AUTO_INBOX_SCAN_ENABLED=true + CRON_SECRET.
 */
export async function GET(request: Request) {
  if (!checkSecret(request.headers.get("authorization"))) return json({error:"Unauthorized"},401);
  if (process.env.VERCEL_ENV !== "production" ||
      process.env.AUTO_INBOX_SCAN_ENABLED !== "true") {
    return json({ok:false,active:false,reason:"Scheduled inbox scanning not enabled for this environment."},503);
  }
  const mailboxes = (await gmailMailboxStatus()).filter(m => m.mailbox === "info");
  if (mailboxes.length !== 1 || mailboxes.some(m=>!m.configured)) {
    return json({ok:false,active:false,reason:"The info@casadenza.com Gmail connection must be authorized."},503);
  }
  // Administrator-only diagnostic through the same cron bearer; never persists data.
  // Return only sanitized error categories, never Gmail tokens or email contents.
  if (new URL(request.url).searchParams.get("diagnose") === "1") {
    try {
      const sample = await scanRecentMailbox("info", {days:1,limit:1});
      return json({ok:true,mailbox:"info",sampleMessages:sample.length});
    } catch (error) {
      const code = error instanceof Error && /^GMAIL_[A-Z_]+$/.test(error.message)
        ? error.message : "SCAN_FAILED";
      console.error("Operations inbox diagnostic",code);
      return json({ok:false,mailbox:"info",error:code},503);
    }
  }
  const slot = scheduledSlot(new Date());
  let scanRun: {id:string};
  try {
    scanRun = await prisma.operationsInboxScanRun.create({data:{scheduledSlot:slot},select:{id:true}});
  } catch (e:any) {
    if (e?.code === "P2002") return json({ok:true,duplicateInvocation:true,slot});
    return json({ok:false,error:"Scan history database not ready. Apply the approved migration first."},503);
  }
  try {
    const priorInfo = await prisma.operationsInboxScanRun.findFirst({
      where:{infoStatus:"SUCCESS"},orderBy:{startedAt:"desc"},select:{startedAt:true},
    });
    const previous=[priorInfo];
    const now=Date.now();
    const backfillDays=3;
    const overlapMs=30*60*1000;
    const oldestAllowed=now-backfillDays*24*60*60*1000;
    const gaps=previous.flatMap((p,i)=>p&&p.startedAt.getTime()<oldestAllowed
      ? [mailboxes[i].mailbox+":Gap longer than three days; older messages need manual backfill."] : []);
    const [orders, scanResults] = await Promise.all([
      prisma.order.findMany({
        select:{id:true,distributorId:true,createdAt:true,notes:true,
          distributor:{select:{name:true,country:true}}},
        orderBy:{createdAt:"desc"},take:1500,
      }),
      Promise.allSettled(
        mailboxes.map((m,i)=>{
          const previousAt=previous[i]?.startedAt.getTime();
          const afterEpochSeconds=previousAt
            ? Math.floor(Math.max(oldestAllowed,previousAt-overlapMs)/1000):undefined;
          return scanRecentMailbox(m.mailbox as ShipmentMailbox,{days:backfillDays,limit:80,afterEpochSeconds});
        })
      ),
    ]);
    const orderInfo:OperationsOrder[] = orders.map(o=>{
      let notes:Record<string,unknown>={};
      try { const parsed=JSON.parse(o.notes||"{}");if(parsed&&typeof parsed==="object")notes=parsed; } catch {}
      return {
        id:o.id,distributorId:o.distributorId,
        distributorName:o.distributor.name,country:o.distributor.country,
        poNumber:String(notes.poNumber||notes.po||""),
        invoiceNumber:String(notes.invoiceNumber||notes.invoiceNo||""),
        buyerPoRef:String(notes.buyerPoRef||""),
        date:o.createdAt.toISOString().slice(0,10),
      };
    });
    const allMessages=scanResults.flatMap(s=>s.status==="fulfilled"?s.value:[]);
    const items=deriveOperationsCandidates(allMessages,orderInfo);
    const rows=items.map(c=>({
      mailbox:c.mailbox,messageId:c.messageId,partId:c.partId||"body",
      filename:c.filename, sender:c.from,subject:c.subject,
      snippet:c.snippet,receivedAt:Number.isFinite(Date.parse(c.date))?new Date(c.date):null,
      kind:c.kind,matchState:c.state,suggestedOrderId:c.suggestedOrderId,
      suggestedDistributorId:c.suggestedDistributorId,
      matchReason:c.reason,
    }));
    // Unique Gmail account + message ID + part ID ensures safe overlapping scans.
    const added=rows.length ? await prisma.operationsInboxItem.createMany({data:rows,skipDuplicates:true}) : {count:0};
    const issueCodes=scanResults.flatMap((s,i)=>s.status==="rejected"
      ? [mailboxes[i].mailbox+":"+(s.reason instanceof Error && /^GMAIL_[A-Z_]+$/.test(s.reason.message)
        ? s.reason.message:"SCAN_FAILED")] : []);
    const partialMailbox=scanResults.some(s=>s.status==="fulfilled"&&s.value.length>=80);
    if(issueCodes.length) console.error("Operations inbox scan issue codes",issueCodes);
    const status=issueCodes.length===mailboxes.length?"FAILED":(issueCodes.length>0||partialMailbox||gaps.length>0?"PARTIAL":"SUCCESS");
    await prisma.operationsInboxScanRun.update({
      where:{id:scanRun.id},
      data:{status,infoStatus:scanResults[0]?.status==="fulfilled"?"SUCCESS":"FAILED",
        alexStatus:"SKIPPED",
        messagesScanned:allMessages.length,itemsAdded:added.count,
        errorSummary:[...issueCodes,...gaps,...(partialMailbox?["The info inbox hit the 80-message scan cap; increase capacity if this persists."]:[])].join("; ")||null,
        completedAt:new Date()},
    });
    console.info("Operations inbox scan", {slot,status,messages:allMessages.length,candidates:rows.length,added:added.count});
    return json({ok:status==="SUCCESS",slot,status,messages:allMessages.length,
      candidates:rows.length,added:added.count,partialMailboxScan:partialMailbox},status==="FAILED"?503:200);
  } catch {
    await prisma.operationsInboxScanRun.update({
      where:{id:scanRun.id},data:{status:"FAILED",errorSummary:"Inbox scan failed; review private runtime logs.",
        completedAt:new Date()},
    }).catch(()=>{});
    return json({ok:false,error:"Inbox scan failed. No order or document was published."},503);
  }
}
