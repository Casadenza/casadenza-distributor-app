import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";

export const runtime = "nodejs";

function csvEscape(v: any) {
  const s = String(v ?? "");
  if (s.includes('"') || s.includes(",") || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(req: Request) {
  const session = await getServerSession(); // ✅ await
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const tier = searchParams.get("tier") || "STANDARD";
  const currency = searchParams.get("currency") || "USD";
  const unit = (searchParams.get("unit") || "SHEET").toUpperCase(); // SHEET | SQM | SQFT

  // ✅ Template rows: SKU | Variant(SizeLabel) | Price
  const variants = await prisma.productVariant.findMany({
    orderBy: [{ product: { sku: "asc" } }],
    select: {
      sizeLabel: true,
      product: { select: { sku: true } },
    },
    take: 20000,
  });

  const header = ["SKU", "Variant", "Price"].join(",");
  const lines = variants.map((v) =>
    [csvEscape(v.product.sku), csvEscape(v.sizeLabel), ""].join(",")
  );

  const csv = [header, ...lines].join("\n");
  const filename = `prices-template_${tier}_${currency}_${unit}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
