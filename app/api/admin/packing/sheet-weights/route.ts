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
function toInt(v: any, d: number) {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? Math.floor(n) : d;
}

/**
 * GET /api/admin/packing/sheet-weights?take=5000
 */
export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

  const url = new URL(req.url);
  const take = Math.min(5000, Math.max(1, toInt(url.searchParams.get("take"), 2000)));

  const items = await db.sheetWeightMaster.findMany({
    orderBy: [{ collection: "asc" }, { stoneType: "asc" }, { sizeLabel: "asc" }],
    take,
  });

  return NextResponse.json({ ok: true, items });
}

/**
 * POST /api/admin/packing/sheet-weights
 * Body: { id?, collection, stoneType, sizeLabel, perSheetWeightKg, isActive }
 * Upsert by unique (collection, stoneType, sizeLabel)
 */
export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

  const body = await req.json().catch(() => ({}));

  const id = str(body?.id);
  const collection = str(body?.collection);
  const stoneType = str(body?.stoneType);
  const sizeLabel = str(body?.sizeLabel);
  const perSheetWeightKg = num(body?.perSheetWeightKg, null);
  const isActive = body?.isActive !== false;

  if (!collection) return NextResponse.json({ error: "collection is required" }, { status: 400 });
  if (!stoneType) return NextResponse.json({ error: "stoneType is required" }, { status: 400 });
  if (!sizeLabel) return NextResponse.json({ error: "sizeLabel is required" }, { status: 400 });
  if (perSheetWeightKg == null || perSheetWeightKg <= 0)
    return NextResponse.json({ error: "perSheetWeightKg must be > 0" }, { status: 400 });

  const data: any = { collection, stoneType, sizeLabel, perSheetWeightKg, isActive };

  if (id) {
    await db.sheetWeightMaster.update({ where: { id }, data });
    return NextResponse.json({ ok: true });
  }

  await db.sheetWeightMaster.upsert({
    where: { collection_stoneType_sizeLabel: { collection, stoneType, sizeLabel } },
    create: data,
    update: data,
  });

  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/admin/packing/sheet-weights
 * Body: { id }
 */
export async function DELETE(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

  const body = await req.json().catch(() => ({}));
  const id = str(body?.id);
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  await db.sheetWeightMaster.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}