import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  const session = await getServerSession();
  if (!session?.distributorId) return jsonError("Unauthorized", 401);

  const d = await prisma.distributor.findUnique({
    where: { id: session.distributorId },
  });

  if (!d) return jsonError("Distributor not found", 404);

  return NextResponse.json({
    ok: true,
    distributor: {
      id: d.id,
      name: d.name,
      country: d.country,
      defaultCurrency: d.defaultCurrency,
      phone: d.phone,
      email: d.email,
      billing: {
        billingName: d.billingName,
        billingLine1: d.billingLine1,
        billingLine2: d.billingLine2,
        billingCity: d.billingCity,
        billingState: d.billingState,
        billingZip: d.billingZip,
        billingCountry: d.billingCountry,
      },
    },
  });
}