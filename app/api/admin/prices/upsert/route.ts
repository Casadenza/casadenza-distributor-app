import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";

export const runtime = "nodejs";

type Unit = "SHEET" | "SQM" | "SQFT";

function unitToField(unit: Unit) {
  if (unit === "SHEET") return "priceSheet";
  if (unit === "SQM") return "priceSqm";
  return "priceSqft";
}

export async function POST(req: Request) {
  const session = await getServerSession(); // ✅ MUST await
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));

  const variantId = String(body.variantId || "");
  const tier = String(body.tier || "STANDARD");
  const currency = String(body.currency || "USD");
  const unit = String(body.unit || "SQM").toUpperCase() as Unit;

  const amount =
    body.amount === null || body.amount === undefined || body.amount === ""
      ? null
      : Number(body.amount);

  if (!variantId) return NextResponse.json({ error: "variantId required" }, { status: 400 });
  if (!["SHEET", "SQM", "SQFT"].includes(unit)) {
    return NextResponse.json({ error: "Invalid unit" }, { status: 400 });
  }
  if (amount !== null && !Number.isFinite(amount)) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const field = unitToField(unit);

  const existing = await prisma.price.findFirst({
    where: { variantId, tier, currency },
    select: { id: true },
  });

  const data: any = {
    variantId,
    tier,
    currency,
    [field]: amount, // ✅ update only selected column
  };

  const saved = existing
    ? await prisma.price.update({
        where: { id: existing.id },
        data,
        select: {
          id: true,
          variantId: true,
          priceSheet: true,
          priceSqm: true,
          priceSqft: true,
          updatedAt: true,
        },
      })
    : await prisma.price.create({
        data,
        select: {
          id: true,
          variantId: true,
          priceSheet: true,
          priceSqm: true,
          priceSqft: true,
          updatedAt: true,
        },
      });

  return NextResponse.json({
    ok: true,
    row: {
      priceId: saved.id,
      variantId: saved.variantId,
      priceSheet: saved.priceSheet ?? null,
      priceSqm: saved.priceSqm ?? null,
      priceSqft: saved.priceSqft ?? null,
      updatedAt: saved.updatedAt ? new Date(saved.updatedAt).toISOString() : null,
    },
  });
}
