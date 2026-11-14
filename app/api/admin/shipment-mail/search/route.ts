import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/serverSession";
import { gmailMailboxStatus, searchShipmentMailbox, type ShipmentMailbox } from "@/lib/shipment-mail";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const mailboxes = await gmailMailboxStatus();
  const importEnabled = process.env.VERCEL_ENV === "production" && process.env.ENABLE_SHIPMENT_DOCUMENT_IMPORT === "true";
  const reference = new URL(request.url).searchParams.get("reference")?.trim() || "";
  if (!reference) {
    return NextResponse.json({ ok: true, mailboxes, importEnabled, results: [] }, { headers: { "Cache-Control": "private, no-store" } });
  }
  if (reference.length < 3 || reference.length > 90 || /[\r\n]/.test(reference)) {
    return NextResponse.json({ error: "Search a 3-90 character invoice, AWB, HAWB, PO or company reference" }, { status: 400 });
  }
  const limit = checkRateLimit("shipment-mail-search:" + getClientIp(request), 12, 60_000);
  if (!limit.ok) return NextResponse.json({ error: "Too many searches. Try again in a minute." }, { status: 429 });

  const configured = mailboxes.filter((m) => m.configured);
  if (!configured.length) {
    return NextResponse.json({
      ok: false, mailboxes, importEnabled, results: [],
      error: "Connect read-only Gmail access for both mailboxes in the portal's Vercel environment.",
    }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
  const searched = await Promise.allSettled(configured.map(m => searchShipmentMailbox(m.mailbox as ShipmentMailbox, reference)));
  const results = searched.flatMap(s => s.status === "fulfilled" ? s.value : []);
  const issues = searched.flatMap((s, i) => s.status === "rejected" ? [{
    mailbox: configured[i].mailbox,
    code: s.reason instanceof Error && /^GMAIL_[A-Z_]+$/.test(s.reason.message)
      ? s.reason.message : "GMAIL_SEARCH_UNAVAILABLE",
  }] : []);
  return NextResponse.json({
    ok: true, mailboxes, importEnabled, reference, results, issues,
    note: "Matches are suggestions only. Always verify the invoice, shipper, consignee and selected portal order.",
  }, { headers: { "Cache-Control": "private, no-store" } });
}
