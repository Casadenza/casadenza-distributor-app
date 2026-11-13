import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";
import { isSameOrigin } from "@/lib/communication-access";
import { verifyZohoAccount } from "@/lib/zoho-business";
export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  if (!isSameOrigin(request)) {
    return NextResponse.json({ ok: false, error: "Invalid origin" }, { status: 403 });
  }
  const distributor = await prisma.distributor.findUnique({
    where: { id: params.id }, select: { id: true },
  });
  if (!distributor) return NextResponse.json({ ok: false, error: "Distributor not found" }, { status: 404 });
  const input = await request.json().catch(() => null);
  if (typeof input?.zohoAccountId !== "string") {
    return NextResponse.json({ ok: false, error: "Zoho Account ID required" }, { status: 400 });
  }
  const accountId = input.zohoAccountId.trim();
  if (accountId && !/^\d{12,22}$/.test(accountId)) {
    return NextResponse.json({ ok: false, error: "Invalid Zoho Account ID" }, { status: 400 });
  }
  try {
    const verified = accountId ? await verifyZohoAccount(accountId) : null;
    const linked = await prisma.distributor.update({
      where: { id: params.id },
      data: { zohoAccountId: accountId || null },
      select: { zohoAccountId: true },
    });
    return NextResponse.json({ ok: true, linkedAccount: verified, distributor: linked });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ ok: false, error: "Zoho Account already linked to another distributor" }, { status: 409 });
    }
    console.error("Zoho account verification failed", error instanceof Error ? error.message : "Unknown");
    return NextResponse.json({ ok: false, error: "Could not verify this Zoho Account" }, { status: 503 });
  }
}
