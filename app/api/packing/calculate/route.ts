import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromRequest } from "@/app/api/_session";

export const runtime = "nodejs";

type PackingType = "ROLL" | "PALLET" | "CRATE";

function S(v: any) {
  return String(v ?? "").trim();
}
function N(v: any, d = 0) {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : d;
}
function I(v: any, d = 0) {
  const n = N(v, NaN as any);
  return Number.isFinite(n) ? Math.floor(n) : d;
}
function normPackingType(v: any): PackingType {
  const t = S(v).toUpperCase();
  return (t === "ROLL" || t === "PALLET" || t === "CRATE" ? t : "PALLET") as PackingType;
}

function inchToCbm(Lin: number, Win: number, Hin: number) {
  // inches -> cm (2.54), then cm^3 -> m^3 ( / 1e6 )
  const Lcm = Lin * 2.54;
  const Wcm = Win * 2.54;
  const Hcm = Hin * 2.54;
  return (Lcm * Wcm * Hcm) / 1_000_000;
}

function pickRule(rules: any[], qty: number) {
  const active = (rules || []).filter((r) => r.isActive !== false);

  // Range match first
  const match = active.filter((r) => qty >= r.qtyMin && qty <= r.qtyMax);
  if (match.length) {
    match.sort((a, b) => (a.qtyMax - a.qtyMin) - (b.qtyMax - b.qtyMin) || a.qtyMin - b.qtyMin);
    return { rule: match[0], mode: "RANGE" as const };
  }

  // Default fallback
  const def = active.find((r) => r.isDefault);
  if (def) return { rule: def, mode: "DEFAULT" as const };

  return { rule: null, mode: "NONE" as const };
}

function buildPackRows(opts: {
  rules: any[];
  packingType: PackingType;
  sizeLabel: string;
  qtySheets: number;
  perSheetWeightKg: number | null;
}) {
  const { rules, packingType, sizeLabel, qtySheets, perSheetWeightKg } = opts;

  const rows: Array<{
    no: number;
    qtySheets: number;
    dimensionsIn: string | null;
    netWeightKg: number | null;
    grossWeightKg: number | null;
    cbm: number | null;
    ruleMode: "RANGE" | "DEFAULT" | "NONE";
    packingWeightKg: number | null;
  }> = [];

  const active = (rules || []).filter((r) => r.isActive !== false);

  // choose max capacity (highest qtyMax) for chunking (0–5, 6–10 etc)
  const maxCap = active.reduce((m, r) => Math.max(m, Number(r.qtyMax || 0)), 0);

  let remaining = qtySheets;
  let no = 1;

  // If no rules or no capacity => single row
  if (!active.length || !maxCap || maxCap <= 0) {
    const rr = pickRule(active, qtySheets);
    const net = perSheetWeightKg != null ? qtySheets * perSheetWeightKg : null;
    const packW = rr.rule?.packingWeightKg ?? null;
    const gross = net != null && packW != null ? net + packW : null;
    const cbm =
      rr.rule && rr.rule.dimLIn && rr.rule.dimWIn && rr.rule.dimHIn
        ? inchToCbm(rr.rule.dimLIn, rr.rule.dimWIn, rr.rule.dimHIn)
        : null;

    rows.push({
      no,
      qtySheets,
      dimensionsIn: rr.rule ? `${rr.rule.dimLIn}×${rr.rule.dimWIn}×${rr.rule.dimHIn}` : null,
      netWeightKg: net,
      grossWeightKg: gross,
      cbm,
      ruleMode: rr.mode,
      packingWeightKg: packW,
    });
    return rows;
  }

  // Chunk into multiple packs
  while (remaining > 0) {
    const chunk = Math.min(remaining, maxCap);
    const rr = pickRule(active, chunk);

    const net = perSheetWeightKg != null ? chunk * perSheetWeightKg : null;
    const packW = rr.rule?.packingWeightKg ?? null;
    const gross = net != null && packW != null ? net + packW : null;
    const cbm =
      rr.rule && rr.rule.dimLIn && rr.rule.dimWIn && rr.rule.dimHIn
        ? inchToCbm(rr.rule.dimLIn, rr.rule.dimWIn, rr.rule.dimHIn)
        : null;

    rows.push({
      no,
      qtySheets: chunk,
      dimensionsIn: rr.rule ? `${rr.rule.dimLIn}×${rr.rule.dimWIn}×${rr.rule.dimHIn}` : null,
      netWeightKg: net,
      grossWeightKg: gross,
      cbm,
      ruleMode: rr.mode,
      packingWeightKg: packW,
    });

    remaining -= chunk;
    no += 1;
  }

  return rows;
}

function suggestContainer(totalCbm: number, totalGrossKg: number, containers: any[]) {
  const active = (containers || []).filter((c) => c.isActive !== false);

  // sort by volume ascending (smallest fit first)
  active.sort((a, b) => (a.volumeCbm || 0) - (b.volumeCbm || 0));

  for (const c of active) {
    const vCap = Number(c.volumeCbm || 0);
    const wCap = Number(c.maxWeightKg || 0);
    if (vCap <= 0 || wCap <= 0) continue;
    if (totalCbm <= vCap && totalGrossKg <= wCap) {
      return {
        container: c,
        volumeUtilizationPct: vCap ? Math.min(100, (totalCbm / vCap) * 100) : null,
        weightUtilizationPct: wCap ? Math.min(100, (totalGrossKg / wCap) * 100) : null,
      };
    }
  }

  // fallback
  const lcl = active.find((x) => String(x.mode).toUpperCase() === "LCL");
  if (lcl) {
    return { container: lcl, volumeUtilizationPct: null, weightUtilizationPct: null };
  }

  return { container: null, volumeUtilizationPct: null, weightUtilizationPct: null };
}

export async function POST(req: Request) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role !== "ADMIN" && session.role !== "DISTRIBUTOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));

    // Accept both shapes:
    // A) { lines:[...] }
    // B) { collection, stoneType, sizeLabel/size, qtySheets/qty, packingType, variantId }
    let lines: any[] = Array.isArray(body?.lines) ? body.lines : [];

    if (!lines.length) {
      lines = [
        {
          collection: body?.collection,
          stoneType: body?.stoneType,
          sizeLabel: body?.sizeLabel ?? body?.size,
          qtySheets: body?.qtySheets ?? body?.qty,
          packingType: body?.packingType,
          variantId: body?.variantId,
        },
      ];
    }

    // Normalize + allow missing collection/stoneType if variantId provided
    const normalized = [];
    for (const l of lines) {
      let collection = S(l?.collection);
      let stoneType = S(l?.stoneType);
      let sizeLabel = S(l?.sizeLabel ?? l?.size);
      const packingType = normPackingType(l?.packingType);
      const qtySheets = I(l?.qtySheets ?? l?.qty, 0);
      const variantId = S(l?.variantId);

      if ((!collection || !stoneType || !sizeLabel) && variantId) {
        const v = await db.productVariant.findUnique({
          where: { id: variantId },
          include: { product: true },
        });
        if (v?.product) {
          collection = collection || S(v.product.collection);
          stoneType = stoneType || S(v.product.stoneType);
        }
        sizeLabel = sizeLabel || S((v as any)?.sizeLabel);
      }

      normalized.push({ collection, stoneType, sizeLabel, packingType, qtySheets, variantId });
    }

    // Validation
    for (const l of normalized) {
      if (!l.collection || !l.stoneType || !l.sizeLabel) {
        return NextResponse.json({ error: "collection/stoneType/sizeLabel required", line: l }, { status: 400 });
      }
      if (!l.qtySheets || l.qtySheets <= 0) {
        return NextResponse.json({ error: "qtySheets must be > 0", line: l }, { status: 400 });
      }
    }

    // Load masters
    const sheetWeights = await db.sheetWeightMaster.findMany({ where: { isActive: true } });
    const swMap = new Map(sheetWeights.map((r: any) => [`${r.collection}|||${r.stoneType}|||${r.sizeLabel}`, r]));

    const uniqRuleKeys = Array.from(new Set(normalized.map((l) => `${l.packingType}|||${l.sizeLabel}`)));
    const rules = await db.packingRuleMaster.findMany({
      where: {
        OR: uniqRuleKeys.map((k) => {
          const [packingType, sizeLabel] = k.split("|||");
          return { packingType, sizeLabel };
        }),
      },
    });
    const rulesMap = new Map<string, any[]>();
    for (const r of rules) {
      const k = `${r.packingType}|||${r.sizeLabel}`;
      const arr = rulesMap.get(k) || [];
      arr.push(r);
      rulesMap.set(k, arr);
    }

    const containers = await db.containerType.findMany({ where: { isActive: true }, take: 100 });

    // Build lineItems + packRows
    const lineItems = normalized.map((l) => {
      const sw = swMap.get(`${l.collection}|||${l.stoneType}|||${l.sizeLabel}`);
      const perSheetWeightKg = sw?.perSheetWeightKg ?? null;
      const netWeightKg = perSheetWeightKg != null ? l.qtySheets * perSheetWeightKg : null;

      const rr = pickRule(rulesMap.get(`${l.packingType}|||${l.sizeLabel}`) || [], l.qtySheets);
      const packingWeightKg = rr.rule?.packingWeightKg ?? null;
      const grossWeightKg = netWeightKg != null && packingWeightKg != null ? netWeightKg + packingWeightKg : null;

      return {
        collection: l.collection,
        stoneType: l.stoneType,
        sizeLabel: l.sizeLabel,
        packingType: l.packingType,
        qtySheets: l.qtySheets,
        perSheetWeightKg,
        netWeightKg,
        packingWeightKg,
        grossWeightKg,
        packingDimensionsIn: rr.rule ? { L: rr.rule.dimLIn, W: rr.rule.dimWIn, H: rr.rule.dimHIn } : null,
        ruleMode: rr.mode,
        missing: {
          sheetWeight: perSheetWeightKg == null,
          packingRule: rr.rule == null,
        },
      };
    });

    const packRows = normalized.flatMap((l) => {
      const sw = swMap.get(`${l.collection}|||${l.stoneType}|||${l.sizeLabel}`);
      const perSheetWeightKg = sw?.perSheetWeightKg ?? null;
      const rulesFor = rulesMap.get(`${l.packingType}|||${l.sizeLabel}`) || [];
      const rows = buildPackRows({
        rules: rulesFor,
        packingType: l.packingType,
        sizeLabel: l.sizeLabel,
        qtySheets: l.qtySheets,
        perSheetWeightKg,
      });

      // attach friendly fields for table
      return rows.map((r) => ({
        no: r.no,
        packingType: l.packingType,
        sizeLabel: l.sizeLabel,
        qtySheets: r.qtySheets,
        dimensions: r.dimensionsIn ?? "—",
        netWeightKg: r.netWeightKg ?? 0,
        grossWeightKg: r.grossWeightKg ?? 0,
        cbm: r.cbm ?? 0,
      }));
    });

    const totalUnits = packRows.length; // packs
    const totalPallets = normalized.some((x) => x.packingType === "PALLET") ? totalUnits : null;

    const netWeightKg = lineItems.reduce((s, x) => s + (x.netWeightKg || 0), 0);
    const grossWeightKg = packRows.reduce((s, x) => s + (x.grossWeightKg || 0), 0);
    const totalCbm = packRows.reduce((s, x) => s + (x.cbm || 0), 0);

    const warnings: string[] = [];
    const missingSW = lineItems.some((x) => x.missing.sheetWeight);
    const missingRule = lineItems.some((x) => x.missing.packingRule);
    if (missingSW) warnings.push("Some lines missing Sheet Weight Master.");
    if (missingRule) warnings.push("Some lines missing Packing Rules (qty range/default).");

    const sug = suggestContainer(totalCbm, grossWeightKg, containers);

    // UI-compatible "result"
    const result = {
      totalUnits,
      totalPallets,
      netWeightKg,
      grossWeightKg,
      totalCbm,
      suggestedContainer: sug.container ? sug.container.mode : "LCL",
      volumeUtilizationPct: sug.volumeUtilizationPct,
      weightUtilizationPct: sug.weightUtilizationPct,
      warnings,
      packRows,
      lineItems,
      totals: {
        totalPacks: totalUnits,
        netWeightKg,
        grossWeightKg,
        totalCbm,
      },
    };

    return NextResponse.json({
      ok: true,
      result,
      // extra aliases (safe)
      packRows,
      lineItems,
      totals: result.totals,
    });
  } catch (e: any) {
    return NextResponse.json({ error: "Server error", detail: String(e?.message || e) }, { status: 500 });
  }
}