import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";

export async function GET() {
  const session = await getServerSession();
  if (!session || !session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true, role: true },
  });

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dist = session.distributorId
    ? await prisma.distributor.findUnique({ where: { id: session.distributorId } })
    : null;

  return NextResponse.json({
    profile: {
      email: user.email,
      role: user.role,
      distributorId: dist?.id || null,

      name: dist?.name || "",
      country: dist?.country || null,
      defaultCurrency: dist?.defaultCurrency || "INR",
      phone: dist?.phone || null,

      billingName: dist?.billingName || null,
      billingLine1: dist?.billingLine1 || null,
      billingLine2: dist?.billingLine2 || null,
      billingCity: dist?.billingCity || null,
      billingState: dist?.billingState || null,
      billingZip: dist?.billingZip || null,
      billingCountry: dist?.billingCountry || null,
    },
  });
}

export async function PATCH(req: Request) {
  const session = await getServerSession();
  if (!session || !session.userId || !session.distributorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  // ✅ Only update fields that UI actually sends.
  // This prevents country/defaultCurrency from becoming null/INR when UI doesn't send them.
  const name =
    body?.name !== undefined ? String(body.name || "").trim() : undefined;
  const phone =
    body?.phone !== undefined
      ? (String(body.phone || "").trim() ? String(body.phone).trim() : null)
      : undefined;

  const country =
    body?.country !== undefined
      ? (String(body.country || "").trim() ? String(body.country).trim() : null)
      : undefined;

  const defaultCurrency =
    body?.defaultCurrency !== undefined
      ? (String(body.defaultCurrency || "").trim()
          ? String(body.defaultCurrency).trim()
          : null)
      : undefined;

  const billingName =
    body?.billingName !== undefined
      ? (String(body.billingName || "").trim()
          ? String(body.billingName).trim()
          : null)
      : undefined;

  const billingLine1 =
    body?.billingLine1 !== undefined
      ? (String(body.billingLine1 || "").trim()
          ? String(body.billingLine1).trim()
          : null)
      : undefined;

  const billingLine2 =
    body?.billingLine2 !== undefined
      ? (String(body.billingLine2 || "").trim()
          ? String(body.billingLine2).trim()
          : null)
      : undefined;

  const billingCity =
    body?.billingCity !== undefined
      ? (String(body.billingCity || "").trim()
          ? String(body.billingCity).trim()
          : null)
      : undefined;

  const billingState =
    body?.billingState !== undefined
      ? (String(body.billingState || "").trim()
          ? String(body.billingState).trim()
          : null)
      : undefined;

  const billingZip =
    body?.billingZip !== undefined
      ? (String(body.billingZip || "").trim()
          ? String(body.billingZip).trim()
          : null)
      : undefined;

  const billingCountry =
    body?.billingCountry !== undefined
      ? (String(body.billingCountry || "").trim()
          ? String(body.billingCountry).trim()
          : null)
      : undefined;

  if (name !== undefined && !name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const data: any = {
    ...(name !== undefined ? { name } : {}),
    ...(phone !== undefined ? { phone } : {}),
    ...(country !== undefined ? { country } : {}),
    ...(defaultCurrency !== undefined ? { defaultCurrency } : {}),

    ...(billingName !== undefined ? { billingName } : {}),
    ...(billingLine1 !== undefined ? { billingLine1 } : {}),
    ...(billingLine2 !== undefined ? { billingLine2 } : {}),
    ...(billingCity !== undefined ? { billingCity } : {}),
    ...(billingState !== undefined ? { billingState } : {}),
    ...(billingZip !== undefined ? { billingZip } : {}),
    ...(billingCountry !== undefined ? { billingCountry } : {}),
  };

  // Nothing to update
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: true });
  }

  // ✅ Keep User.displayName in sync when Distributor name changes
  await prisma.$transaction(async (tx) => {
    await tx.distributor.update({
      where: { id: session.distributorId! },
      data,
    });

    if (name !== undefined) {
      await tx.user.update({
        where: { id: session.userId! },
        data: { displayName: name },
      });
    }
  });

  return NextResponse.json({ ok: true });
}