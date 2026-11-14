import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCommunicationActor } from "@/lib/communication-access";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const actor = await getCommunicationActor();
  if (!actor) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const query = new URL(request.url).searchParams;
  const distributorId = actor.role === "ADMIN" ? query.get("distributorId") : actor.distributorId;
  if (!distributorId) return NextResponse.json({ ok: true, items: [] });
  if (actor.role === "ADMIN") {
    const exists = await prisma.distributor.findUnique({ where: { id: distributorId }, select: { id: true } });
    if (!exists) return NextResponse.json({ ok: false, error: "Distributor not found" }, { status: 404 });
  }
  const orders = await prisma.order.findMany({
    where: { distributorId },
    select: { id: true, notes: true, createdAt: true, status: true },
    orderBy: { createdAt: "desc" },
    take: 60,
  });
  return NextResponse.json({
    ok: true,
    items: orders.map((order) => {
      let poNumber = "";
      try { poNumber = String(JSON.parse(order.notes || "{}")?.poNumber || ""); } catch { /* legacy notes */ }
      return { id: order.id, label: poNumber || ("Order " + order.id.slice(-6)), status: order.status };
    }),
  });
}
