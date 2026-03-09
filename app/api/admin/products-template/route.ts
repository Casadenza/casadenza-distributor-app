import { NextResponse } from "next/server";

export async function GET() {
  const headers = [
    "sku",
    "name",
    "collection",
    "stoneType",
    "thicknessMm",
    "isActive",
    "image"
  ];

  const sample = [
    [
      "CST-001",
      "Metallic Copper",
      "Fusion",
      "Quartzite",
      "1.5",
      "true",
      "https://your-image-url.jpg"
    ]
  ];

  const csv =
    headers.join(",") +
    "\n" +
    sample.map((row) => row.join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=products-template.csv"
    }
  });
}