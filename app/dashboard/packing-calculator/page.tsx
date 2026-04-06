"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Plus,
  Printer,
  RefreshCw,
  Trash2,
  Layers,
} from "lucide-react";

type PackingType = "ROLL" | "PALLET" | "CRATE";

type Variant = {
  id: string;
  collection: string;
  stoneType: string;
  sizeLabel: string;
};

type LineDraft = {
  id: string;
  variantId: string;
  collection: string;
  stoneType: string;
  sizeLabel: string;
  packingType: PackingType;
  unit: "PER_SHEET";
  qty: number;
};

type PackRow = {
  no: number;
  packingType: string;
  sizeLabel: string;
  qtySheets: number;
  dimensions: string;
  netWeightKg: number;
  grossWeightKg: number;
};

type CalcResponseResult = {
  totalUnits: number;
  totalPallets: number | null;
  netWeightKg: number;
  grossWeightKg: number;
  packRows: PackRow[];
};

const toNum = (v: unknown, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const round = (n: unknown, d = 2) =>
  Number(Math.round(Number(`${n}e${d}`)) + `e-${d}`) || 0;

const PACKING_ORDER: PackingType[] = ["PALLET", "CRATE", "ROLL"];

export default function PackingCalculatorPage() {
  const printRef = useRef<HTMLDivElement | null>(null);
  const [isPending, startTransition] = useTransition();
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);

  const [collection, setCollection] = useState("");
  const [stoneType, setStoneType] = useState("");
  const [sizeLabel, setSizeLabel] = useState("");
  const [packingType, setPackingType] = useState<PackingType>("ROLL");
  const [qty, setQty] = useState<number>(20);

  const [lines, setLines] = useState<LineDraft[]>([]);
  const [result, setResult] = useState<CalcResponseResult | null>(null);
  const [calcErr, setCalcErr] = useState<string | null>(null);

  async function loadVariants() {
    setLoading(true);
    try {
      const res = await fetch(`/api/packing/variants?take=10000&active=1`);
      const data = await res.json();

      const items = (data?.items || data || [])
        .map((it: any) => ({
          id: String(it.variant?.id || it.id),
          collection: String(it.product?.collection || it.collection || ""),
          stoneType: String(it.product?.stoneType || it.stoneType || ""),
          sizeLabel: String(it.variant?.sizeLabel || it.sizeLabel || ""),
        }))
        .filter((v: Variant) => v.id && v.collection);

      setVariants(items);
    } catch {
      setCalcErr("Sync failed.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadVariants();
  }, []);

  const collections = useMemo(
    () => Array.from(new Set(variants.map((v) => v.collection))).sort(),
    [variants]
  );

  const stoneTypes = useMemo(
    () =>
      Array.from(
        new Set(
          variants
            .filter((v) => !collection || v.collection === collection)
            .map((v) => v.stoneType)
        )
      ).sort(),
    [variants, collection]
  );

  const sizes = useMemo(
    () =>
      Array.from(
        new Set(
          variants
            .filter(
              (v) =>
                (!collection || v.collection === collection) &&
                (!stoneType || v.stoneType === stoneType)
            )
            .map((v) => v.sizeLabel)
        )
      ).sort(),
    [variants, collection, stoneType]
  );

  const selectedVariant = useMemo(
    () =>
      variants.find(
        (v) =>
          v.collection === collection &&
          v.stoneType === stoneType &&
          v.sizeLabel === sizeLabel
      ),
    [variants, collection, stoneType, sizeLabel]
  );

  const groupedScreenRows = useMemo(() => {
    if (!result?.packRows?.length) return [];

    const grouped = PACKING_ORDER.map((type) => {
      const rows = result.packRows.filter(
        (row) => String(row.packingType).toUpperCase() === type
      );

      return {
        type,
        rows: rows.map((row, index) => ({
          ...row,
          displayNo: index + 1,
        })),
      };
    }).filter((group) => group.rows.length > 0);

    return grouped;
  }, [result]);

  const packMix = useMemo(() => {
    const mix = {
      PALLET: 0,
      CRATE: 0,
      ROLL: 0,
    };

    for (const row of result?.packRows || []) {
      const key = String(row.packingType).toUpperCase() as PackingType;
      if (key in mix) mix[key] += 1;
    }

    return mix;
  }, [result]);

  const printSpecRows = useMemo(() => {
    const map = new Map<
      string,
      {
        collection: string;
        stoneType: string;
        sizeLabel: string;
        qty: number;
        packingTypes: Set<PackingType>;
      }
    >();

    for (const line of lines) {
      const key = `${line.collection}__${line.stoneType}__${line.sizeLabel}`;
      const existing = map.get(key);

      if (existing) {
        existing.qty += line.qty;
        existing.packingTypes.add(line.packingType);
      } else {
        map.set(key, {
          collection: line.collection,
          stoneType: line.stoneType,
          sizeLabel: line.sizeLabel,
          qty: line.qty,
          packingTypes: new Set([line.packingType]),
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      const c = a.collection.localeCompare(b.collection);
      if (c !== 0) return c;
      const s = a.stoneType.localeCompare(b.stoneType);
      if (s !== 0) return s;
      return a.sizeLabel.localeCompare(b.sizeLabel);
    });
  }, [lines]);

  function addLine() {
    if (!selectedVariant) return;

    setLines((prev) => [
      ...prev,
      {
        id: Math.random().toString(36),
        variantId: selectedVariant.id,
        collection,
        stoneType,
        sizeLabel,
        packingType,
        unit: "PER_SHEET",
        qty,
      },
    ]);

    setResult(null);
  }

  async function calculate() {
    setCalcErr(null);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/packing/calculate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            unit: "PER_SHEET",
            lines: lines.map((l) => ({
              variantId: l.variantId,
              qty: l.qty,
              packingType: l.packingType,
            })),
          }),
        });

        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "Calculation failed");
        setResult(data.result);
      } catch (e: any) {
        setCalcErr(e.message);
      }
    });
  }

  const handlePrint = () => {
    if (!result) return;

    const win = window.open("", "_blank");
    if (!win) return;

    const groupedRowsForPrint = PACKING_ORDER.map((type) => {
      const rows = result.packRows.filter(
        (row) => String(row.packingType).toUpperCase() === type
      );

      return {
        type,
        rows: rows.map((row, index) => ({
          ...row,
          displayNo: index + 1,
        })),
      };
    }).filter((group) => group.rows.length > 0);

    const specRowsHtml =
      printSpecRows.length > 0
        ? printSpecRows
            .map(
              (row) => `
              <tr>
                <td>${row.collection}</td>
                <td>${row.stoneType}</td>
                <td>${row.sizeLabel}</td>
                <td style="text-align:right;">${row.qty}</td>
                <td style="text-align:center;">${Array.from(row.packingTypes).join(" / ")}</td>
              </tr>
            `
            )
            .join("")
        : `
            <tr>
              <td colspan="5" style="text-align:center; color:#666;">No specification rows</td>
            </tr>
          `;

    const rowsHtml = groupedRowsForPrint
      .map(
        (group) => `
          <tr class="group-row">
            <td colspan="6">${group.type}</td>
          </tr>
          ${group.rows
            .map(
              (p) => `
                <tr>
                  <td># ${p.displayNo}</td>
                  <td style="text-transform: uppercase;">${p.packingType}</td>
                  <td style="text-align: right;"><b>${p.qtySheets}</b></td>
                  <td style="text-align: center;">${
                    p.dimensions ? `${p.dimensions}″` : `${p.sizeLabel}″`
                  }</td>
                  <td style="text-align: right;">${round(p.netWeightKg, 1)} kg</td>
                  <td style="text-align: right;"><b>${round(
                    p.grossWeightKg > 0 ? p.grossWeightKg : p.netWeightKg * 1.05,
                    1
                  )} kg</b></td>
                </tr>
              `
            )
            .join("")}
        `
      )
      .join("");

    win.document.write(`
      <html>
        <head>
          <title>Packing List - Casadenza</title>
          <style>
            body {
              font-family: 'Inter', 'Segoe UI', sans-serif;
              padding: 28px 36px;
              color: #1a1a1a;
              line-height: 1.35;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              border-bottom: 2px solid #1a1a1a;
              padding-bottom: 14px;
              margin-bottom: 22px;
            }
            .brand {
              font-size: 26px;
              font-weight: 800;
              letter-spacing: -0.02em;
            }
            .brand span {
              color: #6f7782;
            }
            .meta {
              text-align: right;
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
              color: #666;
              line-height: 1.6;
            }
            .title-box {
              text-align: center;
              margin: 26px 0 18px;
            }
            .title-box h1 {
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.28em;
              border: 1px solid #1a1a1a;
              display: inline-block;
              padding: 7px 26px;
              font-weight: 800;
            }
            .spec-block {
              margin: 0 0 16px;
            }
            .spec-title {
              font-size: 9px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.14em;
              margin-bottom: 8px;
              color: #666;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            .spec-table,
            .packing-table {
              border: 1px solid #000;
              margin-top: 10px;
            }
            .spec-table th,
            .packing-table th {
              background: #f6f6f4;
              padding: 8px 9px;
              border: 1px solid #000;
              font-size: 9px;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              text-align: left;
            }
            .spec-table td,
            .packing-table td {
              padding: 8px 9px;
              border-left: 1px solid #000;
              border-right: 1px solid #000;
              border-bottom: 1px solid #d9d9d9;
              font-size: 10px;
            }
            .packing-table tr:last-child td {
              border-bottom: 1px solid #000;
            }
            .group-row td {
              background: #faf8f4;
              font-size: 9px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.16em;
              color: #8f7441;
              border-top: 1px solid #000;
              border-bottom: 1px solid #000;
            }
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              margin-top: 22px;
              border: 1px solid #000;
            }
            .sum-item {
              padding: 12px 14px;
              text-align: center;
              border-right: 1px solid #000;
            }
            .sum-item:last-child {
              border-right: none;
            }
            .sum-label {
              font-size: 8px;
              text-transform: uppercase;
              letter-spacing: 0.12em;
              color: #666;
              margin-bottom: 5px;
              display: block;
              font-weight: 800;
            }
            .sum-val {
              font-size: 15px;
              font-weight: 800;
            }
            .accent {
              color: #b28536;
            }
            .footer {
              margin-top: 36px;
              font-size: 8px;
              color: #7f7f7f;
              text-transform: uppercase;
              text-align: center;
              letter-spacing: 0.08em;
              line-height: 1.5;
            }
            @media print {
              body {
                padding: 20px 24px;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand">CASADENZA <span>PACKING LIST</span></div>
            <div class="meta">
              Date: ${new Date().toLocaleDateString()}<br />
              Ref: CPT${Date.now().toString().slice(-4)}
            </div>
          </div>

          <div class="title-box">
            <h1>Official Packing Specification</h1>
          </div>

          <div class="spec-block">
            <div class="spec-title">Material Specification</div>
            <table class="spec-table">
              <thead>
                <tr>
                  <th>Collection</th>
                  <th>Stone Type</th>
                  <th>Size</th>
                  <th style="text-align:right;">Sheets</th>
                  <th style="text-align:center;">Packing</th>
                </tr>
              </thead>
              <tbody>
                ${specRowsHtml}
              </tbody>
            </table>
          </div>

          <table class="packing-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Type</th>
                <th style="text-align:right;">Sheets</th>
                <th style="text-align:center;">Dimensions</th>
                <th style="text-align:right;">Net Wt</th>
                <th style="text-align:right;">Gross Wt</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="summary-grid">
            <div class="sum-item">
              <span class="sum-label">Total Packs</span>
              <div class="sum-val">${result.totalUnits}</div>
            </div>
            <div class="sum-item">
              <span class="sum-label">Net Weight</span>
              <div class="sum-val">${round(result.netWeightKg, 1)} kg</div>
            </div>
            <div class="sum-item">
              <span class="sum-label accent">Gross Weight</span>
              <div class="sum-val accent">${round(
                result.grossWeightKg > 0 ? result.grossWeightKg : result.netWeightKg * 1.05,
                1
              )} kg</div>
            </div>
            <div class="sum-item">
              <span class="sum-label">Pack Mix</span>
              <div class="sum-val">P ${packMix.PALLET} · C ${packMix.CRATE} · R ${packMix.ROLL}</div>
            </div>
          </div>

          <div class="footer">
            Computer generated specification - Casadenza Logistics Division - This is only for your information and not the actual packing list.
          </div>
        </body>
      </html>
    `);

    win.document.close();
    win.print();
  };

  return (
    <div className="min-h-screen bg-[#FBFBF9] text-[#1A1A1A]">
      <header className="sticky top-0 z-50 border-b border-[#EAE7E2] bg-white/90 px-6 py-4 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between">
          <div>
            <h1 className="text-lg font-light uppercase tracking-[0.2em]">
              Packing <span className="font-bold text-[#C5A267]">Calculator</span>
            </h1>
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#A39E93]">
              Protocol v2.1
            </p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={loadVariants}
              className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#8C877D] hover:text-black"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
              Sync
            </button>

            {result ? (
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 rounded bg-black px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.1em] text-white transition-all hover:bg-[#C5A267]"
              >
                <Printer className="h-3.5 w-3.5" />
                Print Specification
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] space-y-6 p-6">
        <div className="grid grid-cols-1 items-end gap-3 rounded border border-[#EAE7E2] bg-white p-5 shadow-sm md:grid-cols-12">
          <div className="md:col-span-3">
            <label className="mb-1 block text-[9px] font-bold uppercase text-[#A39E93]">
              Collection
            </label>
            <select
              className="w-full rounded border border-[#EAE7E2] bg-white px-3 py-1.5 text-[11px] font-semibold outline-none focus:border-[#C5A267]"
              value={collection}
              onChange={(e) => setCollection(e.target.value)}
              disabled={loading}
            >
              <option value="">Select</option>
              {collections.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="mb-1 block text-[9px] font-bold uppercase text-[#A39E93]">
              Stone Type
            </label>
            <select
              className="w-full rounded border border-[#EAE7E2] px-3 py-1.5 text-[11px] font-semibold outline-none focus:border-[#C5A267]"
              value={stoneType}
              onChange={(e) => setStoneType(e.target.value)}
              disabled={!collection}
            >
              <option value="">Select</option>
              {stoneTypes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-[9px] font-bold uppercase text-[#A39E93]">
              Size
            </label>
            <select
              className="w-full rounded border border-[#EAE7E2] px-3 py-1.5 text-[11px] font-semibold outline-none focus:border-[#C5A267]"
              value={sizeLabel}
              onChange={(e) => setSizeLabel(e.target.value)}
              disabled={!stoneType}
            >
              <option value="">Select</option>
              {sizes.map((sz) => (
                <option key={sz} value={sz}>
                  {sz}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-[9px] font-bold uppercase text-[#A39E93]">
              Packing
            </label>
            <select
              className="w-full rounded border border-[#EAE7E2] px-3 py-1.5 text-[11px] font-semibold outline-none focus:border-[#C5A267]"
              value={packingType}
              onChange={(e) => setPackingType(e.target.value as PackingType)}
            >
              <option value="ROLL">ROLL</option>
              <option value="PALLET">PALLET</option>
              <option value="CRATE">CRATE</option>
            </select>
          </div>

          <div className="md:col-span-1">
            <label className="mb-1 block text-[9px] font-bold uppercase text-[#A39E93]">
              Qty
            </label>
            <input
              type="number"
              className="w-full rounded border border-[#EAE7E2] px-3 py-1.5 text-[12px] font-bold outline-none focus:border-[#C5A267]"
              value={qty}
              onChange={(e) => setQty(toNum(e.target.value, 1))}
            />
          </div>

          <div className="md:col-span-1">
            <button
              onClick={addLine}
              disabled={!selectedVariant}
              className="flex h-[34px] w-full items-center justify-center rounded bg-black text-white transition-all hover:bg-[#C5A267] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {calcErr ? (
          <div className="rounded border border-[#F1D6D6] bg-[#FFF8F8] px-4 py-3 text-[11px] font-medium text-[#A04E4E]">
            {calcErr}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="h-fit overflow-hidden rounded border border-[#EAE7E2] bg-white">
            <div className="flex items-center justify-between border-b border-[#EAE7E2] bg-[#FBFAF8] px-4 py-2.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#C5A267]">
                Items to Pack
              </span>
              <button
                onClick={calculate}
                disabled={!lines.length || isPending}
                className="rounded bg-black px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-white transition-all hover:bg-[#C5A267] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? "..." : "Calculate"}
              </button>
            </div>

            <div className="max-h-[320px] divide-y divide-[#F3F1ED] overflow-y-auto">
              {lines.length ? (
                lines.map((l) => (
                  <div key={l.id} className="flex items-center justify-between p-3">
                    <div className="min-w-0">
                      <div className="truncate text-[11px] font-bold text-[#1A1A1A]">
                        {l.collection}
                        <span className="ml-1 text-[9px] font-medium text-[#AAA294]">
                          ({l.sizeLabel})
                        </span>
                      </div>
                      <div className="mt-0.5 truncate text-[9px] uppercase tracking-[0.08em] text-[#A39E93]">
                        {l.stoneType} · {l.packingType}
                      </div>
                    </div>

                    <div className="ml-3 flex items-center gap-3">
                      <span className="rounded bg-[#FAFAFA] px-2 py-0.5 font-mono text-[11px] font-bold">
                        {l.qty}
                      </span>
                      <button
                        onClick={() =>
                          setLines((prev) => prev.filter((x) => x.id !== l.id))
                        }
                        className="text-red-300 transition hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-10 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-[#B3ADA3]">
                  No items added
                </div>
              )}
            </div>
          </div>

          <div className="xl:col-span-2">
            {result ? (
              <div className="space-y-4">
                <div
                  className="overflow-hidden rounded border border-[#EAE7E2] bg-white shadow-sm"
                  ref={printRef}
                >
                  <table className="w-full text-left text-[11px]">
                    <thead className="border-b border-[#EAE7E2] bg-[#FBFAF8] text-[9px] font-bold uppercase tracking-widest text-[#A39E93]">
                      <tr>
                        <th className="px-5 py-3">No</th>
                        <th className="px-5 py-3">Type</th>
                        <th className="px-5 py-3 text-right">Sheets</th>
                        <th className="px-5 py-3 text-center">Dimensions</th>
                        <th className="px-5 py-3 text-right">Net Wt</th>
                        <th className="px-5 py-3 text-right">Gross Wt</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-[#F3F1ED]">
                      {groupedScreenRows.map((group) => (
                        <FragmentGroup key={group.type}>
                          <tr className="border-y border-[#EEE6D8] bg-[#FCFAF6]">
                            <td
                              colSpan={6}
                              className="px-5 py-2 text-[9px] font-bold uppercase tracking-[0.18em] text-[#B08A4D]"
                            >
                              {group.type}
                            </td>
                          </tr>

                          {group.rows.map((p, i) => (
                            <tr key={`${group.type}-${i}`}>
                              <td className="px-5 py-2.5 font-bold text-[#888]">
                                # {p.displayNo}
                              </td>
                              <td className="px-5 py-2.5 font-medium uppercase">
                                {p.packingType}
                              </td>
                              <td className="px-5 py-2.5 text-right font-mono font-bold">
                                {p.qtySheets}
                              </td>
                              <td className="px-5 py-2.5 text-center font-mono text-gray-500">
                                {p.dimensions ? `${p.dimensions}″` : `${p.sizeLabel}″`}
                              </td>
                              <td className="px-5 py-2.5 text-right font-mono">
                                {round(p.netWeightKg, 1)} kg
                              </td>
                              <td className="px-5 py-2.5 text-right font-mono font-bold text-[#C5A267]">
                                {round(
                                  p.grossWeightKg > 0
                                    ? p.grossWeightKg
                                    : p.netWeightKg * 1.05,
                                  1
                                )}{" "}
                                kg
                              </td>
                            </tr>
                          ))}
                        </FragmentGroup>
                      ))}
                    </tbody>
                  </table>

                  <div className="grid grid-cols-4 items-center gap-4 bg-black px-6 py-4 text-white">
                    <div>
                      <span className="block text-[8px] uppercase tracking-widest text-gray-500">
                        Packs
                      </span>
                      <div className="text-lg font-bold">{result.totalUnits}</div>
                    </div>

                    <div>
                      <span className="block text-[8px] uppercase tracking-widest text-gray-500">
                        Net Total
                      </span>
                      <div className="text-lg font-bold">
                        {round(result.netWeightKg, 1)} <span className="text-[9px]">KG</span>
                      </div>
                    </div>

                    <div>
                      <span className="block text-[8px] uppercase tracking-widest text-[#C5A267]">
                        Gross Total
                      </span>
                      <div className="text-lg font-bold text-[#C5A267]">
                        {round(
                          result.grossWeightKg > 0
                            ? result.grossWeightKg
                            : result.netWeightKg * 1.05,
                          1
                        )}{" "}
                        <span className="text-[9px]">KG</span>
                      </div>
                    </div>

                    <div>
                      <span className="block text-[8px] uppercase tracking-widest text-gray-500">
                        Pack Mix
                      </span>
                      <div className="text-lg font-bold">
                        P {packMix.PALLET} · C {packMix.CRATE} · R {packMix.ROLL}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-[250px] flex-col items-center justify-center rounded border-2 border-dashed border-[#EAE7E2] bg-white text-[#A39E93]">
                <Layers className="mb-2 h-8 w-8 opacity-20" />
                <p className="text-[9px] font-bold uppercase tracking-widest">
                  Ready for Calculation
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function FragmentGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}