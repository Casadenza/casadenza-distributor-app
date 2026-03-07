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

function norm(v: any) {
  return String(v ?? "").trim();
}
function toNum(v: any) {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : null;
}
function toBool(v: any, d = true) {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "") return d;
  if (["1", "true", "yes", "y", "active"].includes(s)) return true;
  if (["0", "false", "no", "n", "inactive"].includes(s)) return false;
  return d;
}

/**
 * POST /api/admin/packing/import-sheet-weights
 * FormData: file(.xlsx/.xls)
 * Expected columns: Collection | StoneType | SizeLabel | PerSheetWeightKg | IsActive
 */
export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

  const form = await req.formData();
  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const xlsx = await import("xlsx");
  const wb = xlsx.read(buf, { type: "buffer" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return NextResponse.json({ error: "No sheet found" }, { status: 400 });
  const ws = wb.Sheets[sheetName];
  const json: any[] = xlsx.utils.sheet_to_json(ws, { defval: "" });

  let updated = 0;
  let skipped = 0;

  for (const r of json) {
    const collection = norm(r.Collection ?? r.collection);
    const stoneType = norm(r.StoneType ?? r.stoneType ?? r["Stone Type"]);
    const sizeLabel = norm(r.SizeLabel ?? r.sizeLabel ?? r.Size ?? r.size);
    const w = toNum(r.PerSheetWeightKg ?? r.perSheetWeightKg ?? r.WeightKg ?? r.weightKg ?? r["Weight (KG)"]);
    const isActive = toBool(r.IsActive ?? r.isActive ?? r.Active ?? r.active, true);

    if (!collection || !stoneType || !sizeLabel) {
      skipped++;
      continue;
    }
    if (w == null || w <= 0) {
      skipped++;
      continue;
    }

    await db.sheetWeightMaster.upsert({
      where: { collection_stoneType_sizeLabel: { collection, stoneType, sizeLabel } },
      create: { collection, stoneType, sizeLabel, perSheetWeightKg: w, isActive },
      update: { perSheetWeightKg: w, isActive },
    });

    updated++;
  }

  return NextResponse.json({ ok: true, updated, skipped });
}