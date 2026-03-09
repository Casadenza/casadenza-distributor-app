import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const products = await prisma.product.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        variants: {
          select: {
            id: true,
            sizeLabel: true,
            widthMm: true,
            heightMm: true,
            isActive: true,
          },
        },
      },
    });

    const shaped = products.map((p: any) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      image: p.image ?? null,
      collection: p.collection ?? null,
      stoneType: p.stoneType ?? null,
      thicknessMm: p.thicknessMm ?? null,
      isActive: p.isActive,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      variants: p.variants ?? [],
      variantsCount: Array.isArray(p.variants) ? p.variants.length : 0,
    }));

    return NextResponse.json({ products: shaped });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to load products" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
          image: body?.image ?? null,
        } as any,
        select: {
          id: true,
          sku: true,
          name: true,
          image: true,
          collection: true,
          stoneType: true,
          thicknessMm: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

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