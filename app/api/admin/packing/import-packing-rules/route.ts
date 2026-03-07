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
function toInt(v: any) {
  const n = toNum(v);
  return n == null ? null : Math.floor(n);
}
function toBool(v: any, d = false) {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "") return d;
  if (["1", "true", "yes", "y"].includes(s)) return true;
  if (["0", "false", "no", "n"].includes(s)) return false;
  return d;
}

function overlaps(aMin: number, aMax: number, bMin: number, bMax: number) {
  return !(aMax < bMin || aMin > bMax);
}

/**
 * POST /api/admin/packing/import-packing-rules
 * FormData: file(.xlsx/.xls)
 * Expected columns:
 * PackingType | SizeLabel | QtyMin | QtyMax | DimLIn | DimWIn | DimHIn | PackingWeightKg | IsDefault | IsActive
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

  // per (packingType|sizeLabel) ranges to avoid overlaps inside same import file
  const batchRanges = new Map<string, Array<{ qtyMin: number; qtyMax: number }>>();

  for (const r of json) {
    const packingType = norm(r.PackingType ?? r.packingType).toUpperCase();
    const sizeLabel = norm(r.SizeLabel ?? r.sizeLabel ?? r.Size ?? r.size);

    const qtyMin = toInt(r.QtyMin ?? r.qtyMin);
    const qtyMax = toInt(r.QtyMax ?? r.qtyMax);

    const dimLIn = toNum(r.DimLIn ?? r.dimLIn ?? r.L ?? r["L (In)"]);
    const dimWIn = toNum(r.DimWIn ?? r.dimWIn ?? r.W ?? r["W (In)"]);
    const dimHIn = toNum(r.DimHIn ?? r.dimHIn ?? r.H ?? r["H (In)"]);

    const packingWeightKg = toNum(r.PackingWeightKg ?? r.packingWeightKg ?? r.WeightKg ?? r["Weight (KG)"]);

    const isDefault = toBool(r.IsDefault ?? r.isDefault, false);
    const isActive = toBool(r.IsActive ?? r.isActive, true);

    if (!packingType || !sizeLabel) {
      skipped++;
      continue;
    }
    if (!["ROLL", "PALLET", "CRATE"].includes(packingType)) {
      skipped++;
      continue;
    }
    if (qtyMin == null || qtyMin < 0 || qtyMax == null || qtyMax <= 0 || qtyMax < qtyMin) {
      skipped++;
      continue;
    }
    if (![dimLIn, dimWIn, dimHIn].every((x) => x != null && x > 0)) {
      skipped++;
      continue;
    }
    if (packingWeightKg == null || packingWeightKg < 0) {
      skipped++;
      continue;
    }

    const key = `${packingType}|||${sizeLabel}`;

    // DB overlap check (active only)
    const existing = await db.packingRuleMaster.findMany({
      where: { packingType, sizeLabel, isActive: true },
      select: { qtyMin: true, qtyMax: true },
      take: 5000,
    });
    if (existing.some((x) => overlaps(qtyMin, qtyMax, x.qtyMin, x.qtyMax))) {
      skipped++;
      continue;
    }

    // batch overlap check
    const list = batchRanges.get(key) || [];
    if (list.some((x) => overlaps(qtyMin, qtyMax, x.qtyMin, x.qtyMax))) {
      skipped++;
      continue;
    }
    list.push({ qtyMin, qtyMax });
    batchRanges.set(key, list);

    // If default, unset other defaults for same key
    if (isDefault) {
      await db.packingRuleMaster.updateMany({
        where: { packingType, sizeLabel, isDefault: true },
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

    // update if exact range already exists, else create
    const exact = await db.packingRuleMaster.findFirst({
      where: { packingType, sizeLabel, qtyMin, qtyMax },
      select: { id: true },
    });

    if (exact?.id) {
      await db.packingRuleMaster.update({ where: { id: exact.id }, data });
    } else {
      await db.packingRuleMaster.create({ data });
    }

    updated++;
  }

  return NextResponse.json({ ok: true, updated, skipped });
}