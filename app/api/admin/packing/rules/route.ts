import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromRequest } from "@/app/api/_session";

export const runtime = "nodejs";

function toInt(v: any, d: number | null) {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? Math.floor(n) : d;
}
function toNum(v: any, d: number | null) {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : d;
}
function str(v: any) {
  return String(v ?? "").trim();
}

async function requireAdmin(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session) return { ok: false as const, res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (session.role !== "ADMIN") return { ok: false as const, res: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { ok: true as const, session };
}

/**
 * GET /api/admin/packing/rules?take=2000
 */
export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

  const url = new URL(req.url);
  const take = Math.min(5000, Math.max(1, toInt(url.searchParams.get("take"), 2000) || 2000));

  const items = await db.packingRule.findMany({
    include: {
      variant: {
        select: {
          id: true,
          sizeLabel: true,
          product: { select: { sku: true, name: true, collection: true, stoneType: true } },
        },
      },
    },
    orderBy: [{ packingType: "asc" }, { variantId: "asc" }],
    take,
  });

  return NextResponse.json({ ok: true, items });
}

/**
 * POST /api/admin/packing/rules
 * Upsert by composite key variantId + packingType.
 */
export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

  const body = await req.json().catch(() => ({}));

  const id = str(body?.id);
  const variantId = str(body?.variantId);
  const packingType = str(body?.packingType).toUpperCase();
  if (!variantId) return NextResponse.json({ error: "variantId is required" }, { status: 400 });
  if (!packingType) return NextResponse.json({ error: "packingType is required" }, { status: 400 });

  const data: any = {
    variantId,
    packingType,
    sheetsPerUnit: toInt(body?.sheetsPerUnit, 1) ?? 1,
    weightPerSheetKg: toNum(body?.weightPerSheetKg, 0) ?? 0,
    unitLengthCm: toNum(body?.unitLengthCm, null),
    unitWidthCm: toNum(body?.unitWidthCm, null),
    unitHeightCm: toNum(body?.unitHeightCm, null),
    unitTareKg: toNum(body?.unitTareKg, null),
    palletUnitsPerPallet: toInt(body?.palletUnitsPerPallet, null),
    palletLengthCm: toNum(body?.palletLengthCm, null),
    palletWidthCm: toNum(body?.palletWidthCm, null),
    palletHeightCm: toNum(body?.palletHeightCm, null),
    palletTareKg: toNum(body?.palletTareKg, null),
    fragile: !!body?.fragile,
    stackingAllowed: body?.stackingAllowed !== false,
  };

  if (id) {
    await db.packingRule.update({ where: { id }, data });
    return NextResponse.json({ ok: true });
  }

  // Upsert by unique composite variantId_packingType
  await db.packingRule.upsert({
    where: { variantId_packingType: { variantId, packingType } },
    create: data,
    update: data,
  });

  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/admin/packing/rules
 * Body: { id }
 */
export async function DELETE(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

  const body = await req.json().catch(() => ({}));
  const id = str(body?.id);
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  await db.packingRule.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
