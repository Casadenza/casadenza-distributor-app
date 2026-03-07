import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { db } from "@/lib/db";
import { getSessionFromRequest } from "@/app/api/_session";

export const runtime = "nodejs";

function normalizeCollection(sheetName: string) {
  const s = sheetName.trim().toLowerCase();
  if (s === "eco fusion") return "Eco Fusion";
  if (s === "eco lumina") return "Eco Lumina";
  if (s === "fusion") return "Fusion";
  if (s === "lumina") return "Lumina";
  return sheetName.trim();
}

function parseThicknessMm(text: any): number | null {
  if (!text) return null;
  const s = String(text).toLowerCase();
  const m = s.match(/(\d+(\.\d+)?)/);
  if (!m) return null;
  return Math.round(parseFloat(m[1]) * 10) / 10;
}

function parseSizeMm(sizeLabel: string): { widthMm?: number; heightMm?: number } {
  const s = sizeLabel.toLowerCase().replace("×", "x").replace("mm", "").trim();
  const m = s.match(/(\d+(\.\d+)?)\s*x\s*(\d+(\.\d+)?)/);
  if (!m) return {};
  return { widthMm: parseFloat(m[1]), heightMm: parseFloat(m[3]) };
}

function isHeaderRow(row: any[]) {
  const c0 = String(row?.[0] ?? "").trim().toLowerCase();
  const c1 = String(row?.[1] ?? "").trim().toLowerCase();
  return c0.includes("sr") && c1 === "name";
}

function isSectionRow(row: any[]) {
  const c0 = String(row?.[0] ?? "").trim();
  const c1 = String(row?.[1] ?? "").trim();
  const c2 = String(row?.[2] ?? "").trim();
  const c3 = String(row?.[3] ?? "").trim();
  return c0 && !c1 && !c2 && !c3;
}

function isBlankRow(row: any[]) {
  return row.every((x) => x === null || x === undefined || String(x).trim() === "");
}

export async function POST(req: Request) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required (multipart/form-data)" }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buf, { type: "buffer" });

    const imported: Array<{ sku: string; name: string; collection: string }> = [];

    for (const sheetName of workbook.SheetNames) {
      const ws = workbook.Sheets[sheetName];
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });

      const collection = normalizeCollection(sheetName);

      let headerIdx = -1;
      for (let i = 0; i < Math.min(rows.length, 50); i++) {
        if (isHeaderRow(rows[i] || [])) {
          headerIdx = i;
          break;
        }
      }
      if (headerIdx === -1) continue;

      const headerRow = rows[headerIdx];

      // sizes start from column 4 onwards (0=SR,1=NAME,2=STONE TYPE,3=THICKNESS)
      const sizeCols: { colIndex: number; sizeLabel: string }[] = [];
      for (let c = 4; c < headerRow.length; c++) {
        const label = String(headerRow[c] ?? "").trim();
        if (!label) continue;
        sizeCols.push({ colIndex: c, sizeLabel: label });
      }

      for (let r = headerIdx + 1; r < rows.length; r++) {
        const row = rows[r] || [];
        if (isBlankRow(row)) continue;

        if (isHeaderRow(row)) {
          // if header repeats, update size columns
          sizeCols.length = 0;
          for (let c = 4; c < row.length; c++) {
            const label = String(row[c] ?? "").trim();
            if (!label) continue;
            sizeCols.push({ colIndex: c, sizeLabel: label });
          }
          continue;
        }

        if (isSectionRow(row)) continue;

        const sku = String(row[0] ?? "").trim();
        const name = String(row[1] ?? "").trim();
        const stoneType = String(row[2] ?? "").trim() || null;
        const thicknessMm = parseThicknessMm(row[3]);

        if (!sku || !name) continue;

        const product = await db.product.upsert({
          where: { sku },
          update: {
            name,
            collection,
            stoneType: stoneType ?? undefined,
            thicknessMm: thicknessMm ?? undefined,
            isActive: true,
          },
          create: {
            sku,
            name,
            collection,
            stoneType,
            thicknessMm,
            isActive: true,
          },
          select: { id: true, sku: true },
        });

        for (const sc of sizeCols) {
          const sizeLabel = sc.sizeLabel;
          if (!sizeLabel) continue;

          const mm = parseSizeMm(sizeLabel);

          await db.productVariant.upsert({
            where: {
              productId_sizeLabel: {
                productId: product.id,
                sizeLabel,
              },
            },
            update: {
              isActive: true,
              widthMm: mm.widthMm ?? undefined,
              heightMm: mm.heightMm ?? undefined,
            },
            create: {
              productId: product.id,
              sizeLabel,
              widthMm: mm.widthMm,
              heightMm: mm.heightMm,
              isActive: true,
            },
          });
        }

        imported.push({ sku, name, collection });

        // Special rule: Fusion => also create 3D Fusion product with fixed size
        if (collection === "Fusion") {
          const sku3d = `${sku}-3D`;

          const product3d = await db.product.upsert({
            where: { sku: sku3d },
            update: {
              name,
              collection: "3D Fusion",
              stoneType: stoneType ?? undefined,
              thicknessMm: thicknessMm ?? undefined,
              isActive: true,
            },
            create: {
              sku: sku3d,
              name,
              collection: "3D Fusion",
              stoneType,
              thicknessMm,
              isActive: true,
            },
            select: { id: true },
          });

          const size3d = "152.4x609.6 mm";
          const mm3d = parseSizeMm(size3d);

          await db.productVariant.upsert({
            where: { productId_sizeLabel: { productId: product3d.id, sizeLabel: size3d } },
            update: { isActive: true, widthMm: mm3d.widthMm ?? undefined, heightMm: mm3d.heightMm ?? undefined },
            create: {
              productId: product3d.id,
              sizeLabel: size3d,
              widthMm: mm3d.widthMm,
              heightMm: mm3d.heightMm,
              isActive: true,
            },
          });
        }
      }
    }

    return NextResponse.json({
      ok: true,
      importedCount: imported.length,
      sheets: workbook.SheetNames,
      note: "Imported Products + Variants. Prices are not imported yet.",
    });
  } catch (e: any) {
    console.error("import-products error:", e);
    return NextResponse.json({ error: "Server error", detail: String(e?.message || e) }, { status: 500 });
  }
}
