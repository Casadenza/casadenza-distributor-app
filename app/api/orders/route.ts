import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";

/**
 * /api/orders
 * ✅ POST: create order
 *   - FIX FK: Order.distributorId = Distributor.id (resolved by Distributor.userId = session.userId)
 *   - Stores meta in order.notes JSON (includes orderType, otherCharge, signature dataUrl, signerName)
 * ✅ GET: list orders for logged-in distributor (for Repeat dropdown)
 *   - Returns { ok:true, items:[...] } so your existing Place Order UI works
 */

type PlaceOrderItem = {
  productId: string;
  variantId: string;
  qty: number;
  unit: "SHEET" | "SQFT" | "SQM";
  unitPrice: number;
};

type Party = { name?: string; contact?: string };

type ShipTo = {
  companyName?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  postal?: string;
  country?: string;
  addressType?: string;
};

type Billing = {
  billingName?: string;
  billingLine1?: string;
  billingLine2?: string;
  billingCity?: string;
  billingState?: string;
  billingZip?: string;
  billingCountry?: string;
};

type PlaceOrderBody = {
  items: PlaceOrderItem[];

  poNumber?: string;
  poDate?: string;
  buyerPoRef?: string;

  orderType?: string; // Regular/Repeat etc
  currency?: string;
  incoterm?: string;

  requestedDispatchDate?: string;
  deliveryMethod?: string;
  destinationPort?: string;

  containerType?: string;
  packingType?: string;

  notifyParty?: Party;

  shipTo?: ShipTo;
  billing?: Billing;

  notes?: string;

  freight?: number;
  insurance?: number;
  discount?: number;
  otherCharge?: number; // ✅ NEW (Other)

  itemsTotal?: number;
  grandTotal?: number;

  // ✅ signature saved in notes so admin can show
  signature?: {
    signerName?: string;
    dataUrl?: string; // "data:image/png;base64,..."
  };
  signatureInfo?: string;

  // optional (UI sends)
  itemsMeta?: any[];
  repeatOrderId?: string | null;
};

function num(v: any, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

async function resolveDistributorIdByUserId(userId: string) {
  const dist = await prisma.distributor.findUnique({
    where: { userId },
    select: { id: true },
  });
  return dist?.id ?? null;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const distributorId = await resolveDistributorIdByUserId(session.userId);
    if (!distributorId) {
      return NextResponse.json(
        { error: "Distributor not linked to this user." },
        { status: 401 }
      );
    }

    const body = (await req.json()) as PlaceOrderBody;

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: "Items required" }, { status: 400 });
    }

    const cleanItems = body.items.map((x) => ({
      productId: String(x.productId || "").trim(),
      variantId: String(x.variantId || "").trim(),
      qty: num(x.qty, 0),
      unit: (x.unit || "SHEET") as "SHEET" | "SQFT" | "SQM",
      unitPrice: num(x.unitPrice, 0),
    }));

    if (cleanItems.some((it) => !it.productId || !it.variantId || it.qty <= 0)) {
      return NextResponse.json(
        { error: "Invalid items: productId/variantId missing or qty <= 0" },
        { status: 400 }
      );
    }

    // Totals
    const fallbackItemsTotal = cleanItems.reduce((s, it) => s + it.qty * it.unitPrice, 0);

    const itemsTotal = num(body.itemsTotal, fallbackItemsTotal);
    const freight = num(body.freight, 0);
    const insurance = num(body.insurance, 0);
    const discount = num(body.discount, 0);
    const otherCharge = num(body.otherCharge, 0);

    const grandTotal = num(
      body.grandTotal,
      itemsTotal + freight + insurance + otherCharge - discount
    );

    const currency = (body.currency || "USD").toUpperCase();
    const incoterm = (body.incoterm || "FOB").toUpperCase();

    const meta = {
      poNumber: body.poNumber || null,
      poDate: body.poDate || null,
      buyerPoRef: body.buyerPoRef || null,

      orderType: body.orderType || "Regular",
      repeatOrderId: body.repeatOrderId || null,

      currency,
      incoterm,

      requestedDispatchDate: body.requestedDispatchDate || null,
      deliveryMethod: body.deliveryMethod || null,
      destinationPort: body.destinationPort || null,

      containerType: body.containerType || null,
      packingType: body.packingType || null,

      notifyParty: body.notifyParty || null,

      shipTo: body.shipTo || null,
      billing: body.billing || null,

      notes: body.notes || "",

      freight,
      insurance,
      discount,
      otherCharge,
      itemsTotal,
      grandTotal,

      // ✅ Signature stored for admin
      signatureInfo: body.signatureInfo || null,
      signerName: body.signature?.signerName || null,
      signatureDataUrl: body.signature?.dataUrl || null,

      // ✅ items meta (use UI provided OR generate)
      itemsMeta:
        Array.isArray(body.itemsMeta) && body.itemsMeta.length
          ? body.itemsMeta
          : cleanItems.map((x) => ({
              productId: x.productId,
              variantId: x.variantId,
              unit: x.unit,
              qty: x.qty,
              unitPrice: x.unitPrice,
              lineTotal: x.qty * x.unitPrice,
            })),

      createdVia: "DISTRIBUTOR_PORTAL",
    };

    // Create order + items in transaction
    const order = await prisma.$transaction(async (tx) => {
      const o = await tx.order.create({
        data: {
          distributorId, // ✅ FIXED FK
          status: "RECEIVED",
          eta: null,
          notes: JSON.stringify(meta),
        },
      });

      await tx.orderItem.createMany({
        data: cleanItems.map((it) => ({
          orderId: o.id,
          productId: it.productId,
          variantId: it.variantId,
          qty: it.qty,
          unitPrice: it.unitPrice,
        })),
      });

      return o;
    });

    // ✅ return both styles so UI never breaks
    return NextResponse.json({ ok: true, id: order.id, order, meta });
  } catch (e: any) {
    console.error("ORDER CREATE ERROR:", e);
    return NextResponse.json(
      { ok: false, error: "Server error", code: e?.code, message: e?.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const distributorId = await resolveDistributorIdByUserId(session.userId);
    if (!distributorId) {
      return NextResponse.json({ error: "Distributor not linked." }, { status: 401 });
    }

    const items = await prisma.order.findMany({
      where: { distributorId },
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: {
            product: { select: { sku: true, name: true } },
            variant: { select: { sizeLabel: true } },
          },
        },
      },
      take: 50,
    });

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    console.error("ORDERS GET ERROR:", e);
    return NextResponse.json(
      { ok: false, error: "Server error", code: e?.code, message: e?.message },
      { status: 500 }
    );
  }
}
