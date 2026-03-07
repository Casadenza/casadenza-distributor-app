import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));

  const sku = String(body?.sku || "").trim();
  const name = String(body?.name || "").trim();

  if (!sku || !name) {
    return NextResponse.json({ error: "SKU and name required" }, { status: 400 });
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          sku,
          name,
          collection: body?.collection ?? null,
          stoneType: body?.stoneType ?? null,
          thicknessMm: body?.thicknessMm ?? null,
          isActive: body?.isActive ?? true,
        } as any,
        select: { id: true, sku: true, name: true },
      });

      // ✅ Auto-create default variant so product appears in Prices page
      await tx.productVariant.create({
        data: {
          productId: product.id,
          sizeLabel: "4ft x 8ft",
          widthMm: 1220,
          heightMm: 2400,
          isActive: true,
        } as any,
      });

      return product;
    });

    return NextResponse.json({ ok: true, product: created });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Create failed" }, { status: 400 });
  }
}
