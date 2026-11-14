import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/serverSession";
import { gmailMailboxStatus, searchAlexOrderInbox } from "@/lib/shipment-mail";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const session = await getServerSession();
  const role = String(session?.role || "");
  if (!session || (role !== "ADMIN" && role !== "ORDER_ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const alex = (await gmailMailboxStatus()).find(m => m.mailbox === "alex");
  if (!alex?.configured) return NextResponse.json({
    ok: false, connected: false, items: [], error: "Connect alex@casadenza.in with read-only Gmail OAuth for this Preview."
  }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  const ip = getClientIp(request);
  const rate = checkRateLimit("order-intake:" + ip, 12, 60000);
  if (!rate.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  try {
    const items = await searchAlexOrderInbox();
    return NextResponse.json({
      ok: true, connected: true, items,
      note: "Unverified email candidates only. No portal order has been created or modified.",
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (err) {
    const code = err instanceof Error && /^GMAIL_[A-Z_]+$/.test(err.message) ? err.message : "GMAIL_ORDER_SEARCH_FAILED";
    return NextResponse.json({ ok: false, connected: true, items: [], error: code }, {
      status: 503, headers: { "Cache-Control": "private, no-store" },
    });
  }
}
