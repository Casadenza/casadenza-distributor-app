import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromRequest } from "@/app/api/_session";

export const runtime = "nodejs";

function roleOf(session: any) {
  return String(session?.role ?? session?.user?.role ?? "").toUpperCase();
}
async function requireAdmin(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session) return { ok: false as const, res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (roleOf(session) !== "ADMIN")
    return { ok: false as const, res: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { ok: true as const, session };
}

function str(v: any) {
  return String(v ?? "").trim();
}
function num(v: any, d: number | null = null) {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : d;
}
function toInt(v: any, d: number | null = null) {
  const n = num(v, null);
  return n == null ? d : Math.floor(n);
}

/**
 * GET /api/admin/packing/packing-rules?take=5000
 */
export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

  const url = new URL(req.url);
  const take = Math.min(5000, Math.max(1, Number(url.searchParams.get("take") || 2000)));

  const items = await db.packingRuleMaster.findMany({
    orderBy: [{ packingType: "asc" }, { sizeLabel: "asc" }, { qtyMin: "asc" }],
    take,
  });

  return NextResponse.json({ ok: true, items });
}

/**
 * POST /api/admin/packing/packing-rules
 * Body: { id?, packingType, sizeLabel, qtyMin, qtyMax, dimLIn, dimWIn, dimHIn, packingWeightKg, isDefault, isActive }
 *
 * Validation:
 * - qtyMax >= qtyMin
 * - no overlap for same (packingType + sizeLabel) excluding self
 * - if isDefault=true => unset other defaults for same (packingType + sizeLabel)
 */
export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

  const body = await req.json().catch(() => ({}));

  const id = str(body?.id);
  const packingType = str(body?.packingType).toUpperCase();
  const sizeLabel = str(body?.sizeLabel);

  const qtyMin = toInt(body?.qtyMin, null);
  const qtyMax = toInt(body?.qtyMax, null);

  const dimLIn = num(body?.dimLIn, null);
  const dimWIn = num(body?.dimWIn, null);
  const dimHIn = num(body?.dimHIn, null);

  const packingWeightKg = num(body?.packingWeightKg, null);

  const isDefault = !!body?.isDefault;
  const isActive = body?.isActive !== false;

  if (!packingType) return NextResponse.json({ error: "packingType is required" }, { status: 400 });
  if (!sizeLabel) return NextResponse.json({ error: "sizeLabel is required" }, { status: 400 });

  if (qtyMin == null || qtyMin < 0) return NextResponse.json({ error: "qtyMin invalid" }, { status: 400 });
  if (qtyMax == null || qtyMax <= 0) return NextResponse.json({ error: "qtyMax invalid" }, { status: 400 });
  if (qtyMax < qtyMin) return NextResponse.json({ error: "qtyMax must be >= qtyMin" }, { status: 400 });

  if (![dimLIn, dimWIn, dimHIn].every((x) => x != null && x > 0))
    return NextResponse.json({ error: "Dimensions (inch) must be > 0" }, { status: 400 });

  if (packingWeightKg == null || packingWeightKg < 0)
    return NextResponse.json({ error: "packingWeightKg must be >= 0" }, { status: 400 });

  // Overlap validation
  const existing = await db.packingRuleMaster.findMany({
    where: {
      packingType,
      sizeLabel,
      ...(id ? { NOT: { id } } : {}),
      isActive: true,
    },
    select: { id: true, qtyMin: true, qtyMax: true },
    take: 5000,
  });

  const overlaps = existing.some((r) => !(qtyMax < r.qtyMin || qtyMin > r.qtyMax));
  if (overlaps) {
    return NextResponse.json(
      { error: "Qty range overlaps with an existing rule. Use non-overlapping ranges (e.g., 0–5 and 6–10)." },
      { status: 400 }
    );
  }

  // If default, unset other defaults for same key
  if (isDefault) {
    await db.packingRuleMaster.updateMany({
      where: { packingType, sizeLabel, isDefault: true, ...(id ? { NOT: { id } } : {}) },
      data: { isDefault: false },
    });
  }

  const data: any = {
    packingType,
    sizeLabel,
    qtyMin,
    qtyMax,
    dimLIn,
    dimWIn,
    dimHIn,
    packingWeightKg,
    isDefault,
    isActive,
  };

  if (id) {
    await db.packingRuleMaster.update({ where: { id }, data });
    return NextResponse.json({ ok: true });
  }

  await db.packingRuleMaster.create({ data });
  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/admin/packing/packing-rules
 * Body: { id }
 */
export async function DELETE(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

  const body = await req.json().catch(() => ({}));
  const id = str(body?.id);
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  await db.packingRuleMaster.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}