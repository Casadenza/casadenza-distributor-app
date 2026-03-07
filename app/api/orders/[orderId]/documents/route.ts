import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";

export const runtime = "nodejs";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(_req: Request, ctx: { params: { orderId: string } }) {
  const session = await getServerSession();
  if (!session?.distributorId) return jsonError("Unauthorized", 401);

  const orderId = String(ctx.params.orderId || "");
  if (!orderId) return jsonError("Missing orderId", 400);

  const order = await prisma.order.findFirst({
    where: { id: orderId, distributorId: session.distributorId },
    include: { documents: true },
  });

  if (!order) return jsonError("Order not found", 404);

  return NextResponse.json({ ok: true, items: order.documents });
}