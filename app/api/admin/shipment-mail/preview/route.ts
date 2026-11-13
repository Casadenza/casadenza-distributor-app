import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/serverSession";
import { readShipmentPdf, validMailbox, safeGmailMessageId } from "@/lib/shipment-mail";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const limit = checkRateLimit("shipment-mail-preview:" + getClientIp(request), 10, 60_000);
  if (!limit.ok) return NextResponse.json({ error: "Preview rate limit reached" }, { status: 429 });
  const q = new URL(request.url).searchParams;
  const mailbox = validMailbox(q.get("mailbox"));
  const messageId = safeGmailMessageId(q.get("messageId"));
  const partId = q.get("partId") || "";
  if (!mailbox || !messageId || !partId) return NextResponse.json({ error: "Invalid document selection" }, { status: 400 });
  try {
    const pdf = await readShipmentPdf({ mailbox, messageId, partId });
    return new NextResponse(new Uint8Array(pdf.buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline",
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "PDF cannot be previewed" }, { status: 503 });
  }
}
