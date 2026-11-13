import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";
import { getZohoBusiness } from "@/lib/zoho-business";
import { zohoConfigured } from "@/lib/zoho";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  if (!zohoConfigured()) {
    return NextResponse.json({ ok: false, error: "Zoho integration is not configured" }, { status: 503 });
  }
  const distributor = await prisma.distributor.findUnique({
    where: { id: params.id }, select: { zohoAccountId: true },
  });
  if (!distributor) return NextResponse.json({ ok: false, error: "Distributor not found" }, { status: 404 });
  if (!distributor.zohoAccountId) {
    return NextResponse.json({ ok: false, error: "Link a verified Zoho Account first" }, { status: 409 });
  }
  try {
    const data = await getZohoBusiness(distributor.zohoAccountId);
    return NextResponse.json({ ok: true, source: "Zoho CRM", data }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Zoho admin data unavailable", error instanceof Error ? error.message : "Unknown");
    return NextResponse.json({ ok: false, error: "Zoho information is unavailable" }, { status: 503 });
  }
}
