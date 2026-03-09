import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getServerSession } from "@/lib/serverSession";

export const runtime = "nodejs";

// This template matches the importer: /api/admin/import-products
// Sheets = collections (Fusion/Lumina/ECO Fusion/ECO Lumina). Each sheet contains:
// SR | NAME | STONE TYPE | THICKNESS | <Size Columns...>

function makeSheet() {
  const header = [
    "SR",
    "NAME",
    "STONE TYPE",
    "THICKNESS",
    "1220x2400 mm",
    "610x1220 mm",
    "305x610 mm",
  ];

  const example = ["CST 01", "METALLIC COPPER", "QUARTZITE", "1 mm", "x", "x", ""];

  const note1 = [
    "",
    "",
    "",
    "",
    "Put any value (x/yes/1) under a size column to create/activate that size variant.",
  ];
  const note2 = [
    "",
    "",
    "",
    "",
    "Fusion sheet will also auto-create 3D Fusion (SKU-3D) with size 152.4x609.6 mm.",
  ];

  return XLSX.utils.aoa_to_sheet([header, example, [], note1, note2]);
}

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const wb = XLSX.utils.book_new();
  const sheetNames = ["Fusion", "Lumina", "ECO Fusion", "ECO Lumina"];
  for (const name of sheetNames) {
    XLSX.utils.book_append_sheet(wb, makeSheet(), name);
  }

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const filename = `products-template_${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}