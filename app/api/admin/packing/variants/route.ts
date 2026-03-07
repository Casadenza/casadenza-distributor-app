import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromRequest } from "@/app/api/_session";

export const runtime = "nodejs";

function roleOf(session: any) {
  return String(session?.role ?? session?.user?.role ?? "").toUpperCase();
}
async function requireAdmin(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return { ok: false as const, res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (roleOf(session) !== "ADMIN") {
    return { ok: false as const, res: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true as const, session };
}
function toInt(v: any, d: number) {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? Math.floor(n) : d;
}

/**
 * GET /api/admin/packing/variants?take=10000&active=1
 * Returns same shape as /api/packing/variants:
 * { ok:true, items:[{ variant:{id,sizeLabel,perSheetWeightKg?}, product:{collection,stoneType,...}}] }
 */
export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

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

  const items = variants.map((v: any) => ({
    variant: {
      id: v.id,
      sizeLabel: v.sizeLabel,
      perSheetWeightKg: v.perSheetWeightKg ?? v.weightPerSheetKg ?? null,
    },
    product: v.product,
  }));

  return NextResponse.json({ ok: true, items });
}