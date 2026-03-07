import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";

export const runtime = "nodejs";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function normCountry(input: any) {
  return String(input ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

// Minimal EU country set (extend anytime)
const EU_COUNTRIES = new Set(
  [
    "AUSTRIA",
    "BELGIUM",
    "BULGARIA",
    "CROATIA",
    "CYPRUS",
    "CZECH REPUBLIC",
    "CZECHIA",
    "DENMARK",
    "ESTONIA",
    "FINLAND",
    "FRANCE",
    "GERMANY",
    "GREECE",
    "HUNGARY",
    "IRELAND",
    "ITALY",
    "LATVIA",
    "LITHUANIA",
    "LUXEMBOURG",
    "MALTA",
    "NETHERLANDS",
    "POLAND",
    "PORTUGAL",
    "ROMANIA",
    "SLOVAKIA",
    "SLOVENIA",
    "SPAIN",
    "SWEDEN",
  ].map((c) => c.toUpperCase())
);

function allowedCurrenciesByCountry(countryRaw: any): string[] {
  const country = normCountry(countryRaw);

  if (country === "INDIA") return ["INR", "USD"];

  if (
    country === "UNITED KINGDOM" ||
    country === "UK" ||
    country === "GREAT BRITAIN" ||
    country === "ENGLAND"
  )
    return ["GBP", "USD"];

  if (EU_COUNTRIES.has(country)) return ["EUR", "USD"];

  return ["USD"];
}

function safeTier(tierRaw: any) {
  const t = String(tierRaw ?? "STANDARD").trim().toUpperCase();
  if (t === "GOLD" || t === "PLATINUM" || t === "STANDARD") return t;
  return "STANDARD";
}

export async function GET(req: Request) {
  const session = await getServerSession();
  if (!session) return jsonError("Unauthorized", 401);

  const userId = (session as any).userId;
  if (!userId) return jsonError("Unauthorized", 401);

  const user = await prisma.user.findUnique({
    where: { id: String(userId) },
    include: { distributor: true },
  });

  if (!user?.distributor) return jsonError("Distributor profile not found", 404);

  const distributorTier = safeTier(user.distributor.tier);
  const distributorCountry = user.distributor.country ?? "";
  const allowedCurrencies = allowedCurrenciesByCountry(distributorCountry);

  const url = new URL(req.url);
  const requestedCurrency = (url.searchParams.get("currency") || "USD").toUpperCase();
  const currency = allowedCurrencies.includes(requestedCurrency) ? requestedCurrency : "USD";

  // ✅ 1) Fetch ALL active variants (so collections always appear)
  const variants = await prisma.productVariant.findMany({
    where: {
      product: { isActive: true },
    },
    select: {
      id: true,
      sizeLabel: true,
      widthMm: true,
      heightMm: true,
      product: {
        select: {
          sku: true,
          name: true,
          collection: true,
          stoneType: true,
          isActive: true,
        },
      },
    },
    orderBy: [
      { product: { name: "asc" } },
      { sizeLabel: "asc" },
    ],
    take: 50000,
  });

  const variantIds = variants.map((v) => v.id);

  // ✅ 2) Fetch prices only for this distributor tier + currency
  const prices = await prisma.price.findMany({
    where: {
      tier: distributorTier,
      currency,
      variantId: { in: variantIds },
    },
    select: {
      variantId: true,
      id: true,
      tier: true,
      currency: true,
      priceSheet: true,
      priceSqm: true,
      priceSqft: true,
      updatedAt: true,
    },
    take: 50000,
  });

  const priceByVariantId = new Map<string, typeof prices[number]>();
  for (const p of prices) priceByVariantId.set(p.variantId, p);

  // ✅ 3) Merge: every variant returns, price may be null
  const merged = variants.map((v) => {
    const p = priceByVariantId.get(v.id) || null;

    return {
      variant: {
        id: v.id,
        sizeLabel: v.sizeLabel,
        widthMm: v.widthMm ?? null,
        heightMm: v.heightMm ?? null,
      },
      product: {
        sku: v.product.sku,
        name: v.product.name,
        collection: v.product.collection ?? "",
        stoneType: v.product.stoneType ?? "",
      },
      price: p
        ? {
            id: p.id,
            tier: p.tier,
            currency: p.currency,
            unitPrices: {
              SHEET: p.priceSheet ?? null,
              SQM: p.priceSqm ?? null,
              SQFT: p.priceSqft ?? null,
            },
            updatedAt: p.updatedAt,
          }
        : {
            id: null,
            tier: distributorTier,
            currency,
            unitPrices: {
              SHEET: null,
              SQM: null,
              SQFT: null,
            },
            updatedAt: null,
          },
    };
  });

  return NextResponse.json({
    ok: true,
    distributor: {
      tier: distributorTier,
      country: distributorCountry,
      allowedCurrencies,
      currency,
    },
    rows: merged, // ✅ UI will use rows now
  });
}
