import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await getServerSession(); // ✅ await
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);

  const tier = searchParams.get("tier") || "STANDARD";
  const currency = searchParams.get("currency") || "USD";
  const q = (searchParams.get("q") || "").trim().toLowerCase();

  const variants = await prisma.productVariant.findMany({
    orderBy: [{ product: { sku: "asc" } }],
    select: {
      id: true,
      sizeLabel: true,
      product: {
        select: { sku: true, name: true, collection: true, stoneType: true },
      },
    },
    take: 5000,
  });

  const prices = await prisma.price.findMany({
    where: { tier, currency },
    select: {
      id: true,
      variantId: true,
      priceSheet: true,
      priceSqm: true,
      priceSqft: true,
      updatedAt: true,
    },
    take: 10000,
  });

  const map = new Map<string, any>();
  for (const p of prices) {
    map.set(p.variantId, {
      id: p.id,
      priceSheet: p.priceSheet ?? null,
      priceSqm: p.priceSqm ?? null,
      priceSqft: p.priceSqft ?? null,
      updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : null,
    });
  }

  let rows = variants.map((v) => {
    const p = map.get(v.id);
    return {
      variantId: v.id,
      priceId: p?.id ?? null,
      productSku: v.product.sku,
      productName: v.product.name,
      collection: v.product.collection ?? null,
      stoneType: v.product.stoneType ?? null,
      sizeLabel: v.sizeLabel,
      tier,
      currency,
      priceSheet: p?.priceSheet ?? null,
      priceSqm: p?.priceSqm ?? null,
      priceSqft: p?.priceSqft ?? null,
      updatedAt: p?.updatedAt ?? null,
    };
  });

  if (q) {
    rows = rows.filter((r) =>
      r.productSku.toLowerCase().includes(q) ||
      r.productName.toLowerCase().includes(q) ||
      (r.sizeLabel ?? "").toLowerCase().includes(q) ||
      (r.collection ?? "").toLowerCase().includes(q) ||
      (r.stoneType ?? "").toLowerCase().includes(q)
    );
  }

  return NextResponse.json({ ok: true, rows });
}
