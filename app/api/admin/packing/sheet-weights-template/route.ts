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
  return { ok: true as const };
}

function csvEscape(v: any) {
  const s = String(v ?? "");
  if (s.includes('"') || s.includes(",") || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * GET /api/admin/packing/sheet-weights-template
 * CSV columns: Collection, StoneType, SizeLabel, PerSheetWeightKg, IsActive
 */
export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

  const variants = await db.productVariant.findMany({
    where: { isActive: true },
    select: {
      sizeLabel: true,
      product: { select: { collection: true, stoneType: true } },
    },
    take: 50000,
    orderBy: [{ product: { collection: "asc" } }, { product: { stoneType: "asc" } }, { sizeLabel: "asc" }],
  });

  const seen = new Set<string>();
  const rows: Array<[string, string, string]> = [];
  for (const v of variants as any[]) {
    const collection = String(v?.product?.collection ?? "").trim();
    const stoneType = String(v?.product?.stoneType ?? "").trim();
    const sizeLabel = String(v?.sizeLabel ?? "").trim();
    if (!collection || !stoneType || !sizeLabel) continue;
    const k = `${collection}|||${stoneType}|||${sizeLabel}`;
    if (seen.has(k)) continue;
    seen.add(k);
    rows.push([collection, stoneType, sizeLabel]);
  }

  const header = ["Collection", "StoneType", "SizeLabel", "PerSheetWeightKg", "IsActive"].join(",");
  const lines = rows.map(([c, s, z]) => [csvEscape(c), csvEscape(s), csvEscape(z), "", "1"].join(","));
  const csv = [header, ...lines].join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="sheet-weights-template.csv"`,
      "cache-control": "no-store",
    },
  });
}