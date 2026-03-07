import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";

export const runtime = "nodejs";

type Unit = "SHEET" | "SQM" | "SQFT";

function unitToField(unit: Unit) {
  if (unit === "SHEET") return "priceSheet";
  if (unit === "SQM") return "priceSqm";
  return "priceSqft";
}

function norm(s: any) {
  return String(s ?? "").trim();
}

export async function POST(req: Request) {
  const session = await getServerSession(); // ✅ MUST await
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const form = await req.formData();

  const file = form.get("file");
  const tier = norm(form.get("tier") || "STANDARD");
  const currency = norm(form.get("currency") || "USD");
  const unit = norm(form.get("unit") || "SQM").toUpperCase() as Unit;

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }
  if (!["SHEET", "SQM", "SQFT"].includes(unit)) {
    return NextResponse.json({ error: "Invalid unit" }, { status: 400 });
  }

  const field = unitToField(unit);

  // ✅ Read Excel (.xlsx/.xls) using xlsx
  const buf = Buffer.from(await file.arrayBuffer());
  const xlsx = await import("xlsx");
  const wb = xlsx.read(buf, { type: "buffer" });

  const sheetName = wb.SheetNames[0];
  if (!sheetName) return NextResponse.json({ error: "No sheet found" }, { status: 400 });

  const ws = wb.Sheets[sheetName];
  const json: any[] = xlsx.utils.sheet_to_json(ws, { defval: "" });

  // Expected columns: SKU | Variant | Price
  let updated = 0;
  let skipped = 0;

  // ✅ Optimization: preload all variants once (fast)
  const variants = await prisma.productVariant.findMany({
    select: {
      id: true,
      sizeLabel: true,
      product: { select: { sku: true } },
    },
    take: 50000,
  });

  const key = (sku: string, size: string) =>
    `${sku.trim().toLowerCase()}__${size.trim().toLowerCase()}`;

  const variantMap = new Map<string, string>();
  for (const v of variants) {
    variantMap.set(key(v.product.sku, v.sizeLabel), v.id);
  }

  for (const r of json) {
    const sku = norm(r.SKU || r.sku);
    const variantLabel = norm(r.Variant || r.variant || r.SizeLabel || r.sizeLabel);
    const priceRaw = r.Price ?? r.price ?? r.Amount ?? r.amount;

    const priceNum =
      priceRaw === "" || priceRaw === null || priceRaw === undefined
        ? null
        : Number(String(priceRaw).trim());

    if (!sku || !variantLabel) {
      skipped++;
      continue;
    }
    if (priceNum !== null && !Number.isFinite(priceNum)) {
      skipped++;
      continue;
    }

    const variantId = variantMap.get(key(sku, variantLabel));
    if (!variantId) {
      skipped++;
      continue;
    }

    const existing = await prisma.price.findFirst({
      where: { variantId, tier, currency },
      select: { id: true },
    });

    const data: any = {
      variantId,
      tier,
      currency,
      [field]: priceNum,
    };

    if (existing) {
      await prisma.price.update({ where: { id: existing.id }, data });
    } else {
      await prisma.price.create({ data });
    }

    updated++;
  }

  return NextResponse.json({ ok: true, updated, skipped });
}
