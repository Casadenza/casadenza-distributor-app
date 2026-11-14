import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";
import { getZohoBusiness } from "@/lib/zoho-business";
import { zohoConfigured } from "@/lib/zoho";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET() {
  const session = await getServerSession();
  if (!session || session.role !== "DISTRIBUTOR") {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!zohoConfigured()) {
    return NextResponse.json({ ok: false, code: "ZOHO_NOT_CONFIGURED", error: "Zoho integration is not configured." }, { status: 503 });
  }
  const dist = await prisma.distributor.findUnique({
    where: { userId: session.userId }, select: { zohoAccountId: true },
  });
  if (!dist?.zohoAccountId) {
    return NextResponse.json({ ok: false, code: "ZOHO_ACCOUNT_NOT_LINKED", error: "Your distributor account has not yet been linked to Zoho." }, { status: 409 });
  }
  try {
    const data = await getZohoBusiness(dist.zohoAccountId);
    return NextResponse.json({ ok: true, source: "Zoho CRM", data }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Zoho business read failed", error instanceof Error ? error.message : "Unknown");
    return NextResponse.json({ ok: false, code: "ZOHO_UNAVAILABLE", error: "Zoho data cannot be loaded at the moment. No sales total is displayed." }, { status: 503 });
  }
}
