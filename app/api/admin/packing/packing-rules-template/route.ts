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
 * GET /api/admin/packing/packing-rules-template
 * CSV columns:
 * PackingType, SizeLabel, QtyMin, QtyMax, DimLIn, DimWIn, DimHIn, PackingWeightKg, IsDefault, IsActive
 */
export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

  const variants = await db.productVariant.findMany({
    where: { isActive: true },
    select: { sizeLabel: true },
    orderBy: [{ sizeLabel: "asc" }],
    take: 50000,
  });

  const seen = new Set<string>();
  const sizes: string[] = [];
  for (const v of variants as any[]) {
    const s = String(v?.sizeLabel ?? "").trim();
    if (!s) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    sizes.push(s);
  }

  const packingTypes = ["ROLL", "PALLET", "CRATE"];

  const header = [
    "PackingType",
    "SizeLabel",
    "QtyMin",
    "QtyMax",
    "DimLIn",
    "DimWIn",
    "DimHIn",
    "PackingWeightKg",
    "IsDefault",
    "IsActive",
  ].join(",");

  const lines: string[] = [];
  for (const t of packingTypes) {
    for (const s of sizes) {
      lines.push([csvEscape(t), csvEscape(s), "", "", "", "", "", "", "0", "1"].join(","));
    }
  }

  // helpful example row (first)
  const example = ["PALLET", sizes[0] ? csvEscape(sizes[0]) : "600x300", "0", "5", "50", "25", "15", "20", "1", "1"].join(
    ","
  );

  const csv = [header, example, ...lines].join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="packing-rules-template.csv"`,
      "cache-control": "no-store",
    },
  });
}