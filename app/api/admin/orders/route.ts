import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";

const ADMIN_STATUSES = [
  "RECEIVED",
  "CONFIRMED",
  "IN_PRODUCTION",
  "PACKED",
  "DISPATCHED",
  "DELIVERED",
  "CANCELLED",
] as const;

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function canAccessOrders(role: string) {
  return role === "ADMIN" || role === "ORDER_ADMIN";
}

export async function GET() {
  const session = await getServerSession();
  const role = String(session?.role || "");

  if (!session || !canAccessOrders(role)) {
    return jsonError("Unauthorized", 401);
  }

  const items = await prisma.order.findMany({
    include: {
      distributor: true,
      items: {
        include: {
          product: true,
          variant: true,
        },
      },
      documents: true,
    },
    orderBy: { createdAt: "desc" },
    take: 2000,
  });

  return NextResponse.json({ ok: true, items });
}

export async function PATCH(req: Request) {
  const session = await getServerSession();
  const role = String(session?.role || "");

  if (!session || !canAccessOrders(role)) {
    return jsonError("Unauthorized", 401);
  }

  const body = await req.json();
  const id = String(body?.id || "");
  const status = body?.status ? String(body.status).toUpperCase() : null;
  const eta = body?.eta !== undefined ? (body.eta ? String(body.eta) : null) : undefined;

  if (!id) return jsonError("Missing id", 400);
  if (status && !ADMIN_STATUSES.includes(status as any)) {
    return jsonError("Invalid status", 400);
  }

  const updated = await prisma.order.update({
    where: { id },
    data: {
      ...(status ? { status } : {}),
      ...(eta !== undefined ? { eta } : {}),
    },
  });

  return NextResponse.json({ ok: true, order: updated });
}