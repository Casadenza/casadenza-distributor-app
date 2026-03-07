import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromRequest } from "@/app/api/_session";

export const runtime = "nodejs";

function toInt(v: any, d: number) {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? Math.floor(n) : d;
}

/**
 * GET /api/packing/variants?take=10000&active=1
 * Distributor-accessible list for dropdowns.
 */
export async function GET(req: Request) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role !== "ADMIN" && session.role !== "DISTRIBUTOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const take = Math.min(10000, Math.max(1, toInt(url.searchParams.get("take"), 5000)));
    const active = url.searchParams.get("active");

    const where: any = {};
    if (active === "1") where.isActive = true;

    const variants = await db.productVariant.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            collection: true,
            stoneType: true,
            thicknessMm: true,
            isActive: true,
          },
        },
      },
      orderBy: [{ product: { sku: "asc" } }, { sizeLabel: "asc" }],
      take,
    });

    // Keep payload small but enough for dropdowns + weights
    const items = variants.map((v: any) => ({
      variant: {
        id: v.id,
        sizeLabel: v.sizeLabel,
        // optional (if you have these columns)
        perSheetWeightKg: v.perSheetWeightKg ?? v.weightPerSheetKg ?? null,
        sheetsPerPallet: v.sheetsPerPallet ?? null,
        palletTareKg: v.palletTareKg ?? null,
        palletDimensions: v.palletDimensions ?? null,
      },
      product: v.product,
    }));

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Server error", detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}
