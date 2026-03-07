// File: lib/packing/engine.ts

/**
 * Smart Packing Calculator (SQLite-safe)
 * - No enums / no Prisma types required here
 * - Engine is pure: give it packingRule + containers + qtySheets, it returns calculation result
 */

export type PackingType = "ROLL" | "CRATE" | "PALLET" | string;
export type ContainerMode = "GP20" | "GP40" | "HC40" | "LCL" | string;

export type PackingRuleDTO = {
  id: string;
  variantId: string;
  packingType: PackingType;

  sheetsPerUnit: number;
  weightPerSheetKg: number;

  unitLengthCm: number;
  unitWidthCm: number;
  unitHeightCm: number;
  unitTareKg: number;

  palletUnitsPerPallet?: number | null;
  palletLengthCm?: number | null;
  palletWidthCm?: number | null;
  palletHeightCm?: number | null;
  palletTareKg?: number | null;

  fragile: boolean;
  stackingAllowed: boolean;
};

export type ContainerTypeDTO = {
  id: string;
  mode: ContainerMode;

  volumeCbm: number;
  maxWeightKg: number;

  internalLengthCm: number;
  internalWidthCm: number;
  internalHeightCm: number;

  isActive: boolean;
};

export type PackingEngineInput = {
  qtySheets: number;
  packingRule: PackingRuleDTO;
  containers: ContainerTypeDTO[];
};

export type SuggestedContainer = {
  mode: ContainerMode;
  volumeCbm: number;
  maxWeightKg: number;
  internalDimensionsCm: { l: number; w: number; h: number };
};

export type PackingEngineResult = {
  packingType: PackingType;

  qtySheets: number;
  sheetsPerUnit: number;

  totalUnits: number; // rolls/crates/units
  unitsPerPallet?: number | null;
  totalPallets?: number | null;

  netWeightKg: number;
  grossWeightKg: number;

  totalCbm: number;

  volumeUtilizationPct?: number | null;
  weightUtilizationPct?: number | null;

  suggestedContainer?: SuggestedContainer | null;

  warnings: string[];

  meta: {
    unit: {
      lengthCm: number;
      widthCm: number;
      heightCm: number;
      tareKg: number;
      cbmEach: number;
    };
    pallet?: {
      lengthCm: number;
      widthCm: number;
      heightCm: number;
      tareKg: number;
      cbmEach: number;
    } | null;
    handling: {
      fragile: boolean;
      stackingAllowed: boolean;
    };
  };
};

// -------------------- helpers --------------------

function isFiniteNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

function clampMin(n: number, min: number) {
  return n < min ? min : n;
}

function round(n: number, digits = 3) {
  const p = Math.pow(10, digits);
  return Math.round(n * p) / p;
}

function ceilDiv(a: number, b: number) {
  if (b <= 0) return 0;
  return Math.ceil(a / b);
}

function cmDimsToCbm(lengthCm: number, widthCm: number, heightCm: number) {
  // cm -> m: /100; CBM = m3
  const l = lengthCm / 100;
  const w = widthCm / 100;
  const h = heightCm / 100;
  return l * w * h;
}

function containerSortOrder(mode: string) {
  // Prefer smallest workable container
  const key = mode.toUpperCase();
  if (key === "GP20") return 1;
  if (key === "GP40") return 2;
  if (key === "HC40") return 3;
  if (key === "LCL") return 99;
  return 50;
}

function safeUpper(s: string) {
  return (s || "").toUpperCase().trim();
}

// -------------------- engine --------------------

export function calculatePacking(input: PackingEngineInput): PackingEngineResult {
  const warnings: string[] = [];

  // Basic validation
  const qtySheetsRaw = input.qtySheets;
  const qtySheets = isFiniteNumber(qtySheetsRaw) ? Math.floor(qtySheetsRaw) : 0;
  if (qtySheets <= 0) warnings.push("Qty (Sheets) must be greater than 0.");

  const r = input.packingRule;

  const sheetsPerUnit = isFiniteNumber(r.sheetsPerUnit) ? Math.floor(r.sheetsPerUnit) : 0;
  if (sheetsPerUnit <= 0) warnings.push("Packing rule: sheetsPerUnit must be > 0.");

  const weightPerSheetKg = isFiniteNumber(r.weightPerSheetKg) ? r.weightPerSheetKg : 0;
  if (weightPerSheetKg <= 0) warnings.push("Packing rule: weightPerSheetKg must be > 0.");

  // unit dims
  const unitL = isFiniteNumber(r.unitLengthCm) ? r.unitLengthCm : 0;
  const unitW = isFiniteNumber(r.unitWidthCm) ? r.unitWidthCm : 0;
  const unitH = isFiniteNumber(r.unitHeightCm) ? r.unitHeightCm : 0;
  const unitTareKg = isFiniteNumber(r.unitTareKg) ? r.unitTareKg : 0;

  if (unitL <= 0 || unitW <= 0 || unitH <= 0) {
    warnings.push("Packing rule: unit dimensions must be > 0.");
  }
  if (unitTareKg < 0) warnings.push("Packing rule: unit tare (kg) cannot be negative.");

  const totalUnits = clampMin(ceilDiv(qtySheets, sheetsPerUnit), 0);

  const netWeightKg = qtySheets * weightPerSheetKg;
  const unitCbmEach = cmDimsToCbm(unitL, unitW, unitH);

  // Palletization
  const unitsPerPallet = r.palletUnitsPerPallet ?? null;
  const palletL = r.palletLengthCm ?? null;
  const palletW = r.palletWidthCm ?? null;
  const palletH = r.palletHeightCm ?? null;
  const palletTareKg = r.palletTareKg ?? null;

  const hasPalletPack =
    unitsPerPallet != null &&
    isFiniteNumber(unitsPerPallet) &&
    unitsPerPallet > 0;

  const totalPallets = hasPalletPack ? clampMin(ceilDiv(totalUnits, unitsPerPallet), 0) : null;

  const hasPalletDims =
    isFiniteNumber(palletL) &&
    isFiniteNumber(palletW) &&
    isFiniteNumber(palletH) &&
    (palletL ?? 0) > 0 &&
    (palletW ?? 0) > 0 &&
    (palletH ?? 0) > 0;

  const palletCbmEach = hasPalletDims
    ? cmDimsToCbm(palletL as number, palletW as number, palletH as number)
    : 0;

  // CBM logic:
  // - If pallet dimensions are provided and palletization is used, use pallet CBM as total footprint volume.
  // - Otherwise, use unit CBM * totalUnits.
  const totalCbm = hasPalletPack && hasPalletDims && totalPallets != null
    ? totalPallets * palletCbmEach
    : totalUnits * unitCbmEach;

  // Gross weight:
  // net + unit tare * units + pallet tare * pallets (if exists)
  const totalUnitTare = totalUnits * unitTareKg;
  const totalPalletTare =
    totalPallets != null && palletTareKg != null && isFiniteNumber(palletTareKg)
      ? totalPallets * palletTareKg
      : 0;

  const grossWeightKg = netWeightKg + totalUnitTare + totalPalletTare;

  // containers
  const containers = (input.containers || []).filter((c) => c && c.isActive);

  // Sort by preference
  const sorted = [...containers].sort((a, b) => {
    const ao = containerSortOrder(a.mode);
    const bo = containerSortOrder(b.mode);
    if (ao !== bo) return ao - bo;
    return a.volumeCbm - b.volumeCbm;
  });

  let suggested: ContainerTypeDTO | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  // Pick smallest container that fits both volume and weight; if none fits, pick "least-bad" (lowest max utilization)
  for (const c of sorted) {
    const volPct = c.volumeCbm > 0 ? totalCbm / c.volumeCbm : Number.POSITIVE_INFINITY;
    const wtPct = c.maxWeightKg > 0 ? grossWeightKg / c.maxWeightKg : Number.POSITIVE_INFINITY;

    const score = Math.max(volPct, wtPct);

    const fits = volPct <= 1 && wtPct <= 1;

    if (fits) {
      suggested = c;
      bestScore = score;
      break; // smallest that fits (because sorted)
    }

    // If none fits, keep least-bad
    if (score < bestScore) {
      suggested = c;
      bestScore = score;
    }
  }

  // If no containers at all, keep null and warn
  if (!suggested) {
    warnings.push("No active container types found. Please add containers in Admin > Packing > Containers.");
  }

  let volumeUtilizationPct: number | null = null;
  let weightUtilizationPct: number | null = null;

  if (suggested) {
    volumeUtilizationPct = suggested.volumeCbm > 0 ? (totalCbm / suggested.volumeCbm) * 100 : null;
    weightUtilizationPct = suggested.maxWeightKg > 0 ? (grossWeightKg / suggested.maxWeightKg) * 100 : null;

    if (volumeUtilizationPct != null && volumeUtilizationPct > 100) {
      warnings.push(
        `Over volume: ${round(volumeUtilizationPct, 1)}% of ${safeUpper(suggested.mode)} capacity.`
      );
    }
    if (weightUtilizationPct != null && weightUtilizationPct > 100) {
      warnings.push(
        `Over weight: ${round(weightUtilizationPct, 1)}% of ${safeUpper(suggested.mode)} max weight.`
      );
    }
  }

  // Handling warnings
  if (r.fragile) warnings.push("Fragile: handle with care.");
  if (!r.stackingAllowed) warnings.push("Stacking not allowed for this packing rule.");

  // Helpful warnings
  if (totalUnits === 0 && qtySheets > 0) {
    warnings.push("Total Units calculated as 0. Check sheetsPerUnit and qtySheets.");
  }

  if (hasPalletPack && !hasPalletDims) {
    warnings.push("Pallet units per pallet is set, but pallet dimensions are missing. CBM will use unit dimensions.");
  }

  return {
    packingType: r.packingType,

    qtySheets,
    sheetsPerUnit,

    totalUnits,
    unitsPerPallet: hasPalletPack ? unitsPerPallet : null,
    totalPallets,

    netWeightKg: round(netWeightKg, 3),
    grossWeightKg: round(grossWeightKg, 3),

    totalCbm: round(totalCbm, 4),

    volumeUtilizationPct: volumeUtilizationPct == null ? null : round(volumeUtilizationPct, 1),
    weightUtilizationPct: weightUtilizationPct == null ? null : round(weightUtilizationPct, 1),

    suggestedContainer: suggested
      ? {
          mode: suggested.mode,
          volumeCbm: suggested.volumeCbm,
          maxWeightKg: suggested.maxWeightKg,
          internalDimensionsCm: {
            l: suggested.internalLengthCm,
            w: suggested.internalWidthCm,
            h: suggested.internalHeightCm,
          },
        }
      : null,

    warnings,

    meta: {
      unit: {
        lengthCm: unitL,
        widthCm: unitW,
        heightCm: unitH,
        tareKg: unitTareKg,
        cbmEach: round(unitCbmEach, 6),
      },
      pallet: hasPalletDims
        ? {
            lengthCm: palletL as number,
            widthCm: palletW as number,
            heightCm: palletH as number,
            tareKg: (palletTareKg ?? 0) as number,
            cbmEach: round(palletCbmEach, 6),
          }
        : null,
      handling: {
        fragile: !!r.fragile,
        stackingAllowed: !!r.stackingAllowed,
      },
    },
  };
}