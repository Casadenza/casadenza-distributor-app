import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromRequest } from "@/app/api/_session";

export async function GET(req: Request) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const collection = (url.searchParams.get("collection") || "").trim();
    const q = (url.searchParams.get("q") || "").trim().toLowerCase();

    const items = await db.productVariant.findMany({
      where: {
        isActive: true,
        product: {
          isActive: true,
          ...(collection ? { collection } : {}),
          ...(q
            ? {
                OR: [
                  { name: { contains: q, mode: "insensitive" } },
                  { sku: { contains: q, mode: "insensitive" } },
                ],
              }
            : {}),
        },
      },
      select: {
        id: true,
        sizeLabel: true,
        product: {
          select: {
            sku: true,
            name: true,
            collection: true,
            stoneType: true,
            thicknessMm: true,
          },
        },
      },
      orderBy: [{ product: { name: "asc" } }, { sizeLabel: "asc" }],
      take: 500,
    });

    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ error: "Server error", detail: String(e?.message || e) }, { status: 500 });
  }
}
