import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromRequest } from "@/app/api/_session";

export const runtime = "nodejs";

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
 * GET /api/admin/packing/containers?take=200
 */
export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

  const url = new URL(req.url);
  const take = Math.min(500, Math.max(1, Number(url.searchParams.get("take") || 200)));

  const items = await db.containerType.findMany({
    orderBy: [{ mode: "asc" }],
    take,
  });

  return NextResponse.json({ ok: true, items });
}

/**
 * POST /api/admin/packing/containers
 * Upsert by id if present, else create.
 */
export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

  const body = await req.json().catch(() => ({}));
  const id = str(body?.id);

  const data: any = {
    mode: str(body?.mode) || "SEA",
    volumeCbm: toNum(body?.volumeCbm, 0) ?? 0,
    maxWeightKg: toNum(body?.maxWeightKg, 0) ?? 0,
    internalLengthCm: toNum(body?.internalLengthCm, 0) ?? 0,
    internalWidthCm: toNum(body?.internalWidthCm, 0) ?? 0,
    internalHeightCm: toNum(body?.internalHeightCm, 0) ?? 0,
    isActive: body?.isActive !== false,
  };

  if (id) {
    await db.containerType.update({ where: { id }, data });
    return NextResponse.json({ ok: true });
  }

  await db.containerType.create({ data });
  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/admin/packing/containers
 * Body: { id }
 */
export async function DELETE(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

  const body = await req.json().catch(() => ({}));
  const id = str(body?.id);
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  await db.containerType.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
