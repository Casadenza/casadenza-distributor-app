import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await getServerSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const distributors = await prisma.distributor.findMany({
      orderBy: [{ createdAt: "desc" }],
      // ✅ IMPORTANT: billing/logistics fields include kar diye
      select: {
        id: true,
        name: true,
        email: true,
        tier: true,
        country: true,
        defaultCurrency: true,
        phone: true,

        billingName: true,
        billingLine1: true,
        billingLine2: true,
        billingCity: true,
        billingState: true,
        billingZip: true,
        billingCountry: true,
      },
    });

    return NextResponse.json({ ok: true, distributors });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const password = body.password || `Welcome@${Math.floor(1000 + Math.random() * 9000)}`;
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: String(body.email || "").toLowerCase().trim(),
          passwordHash,
          role: "DISTRIBUTOR",
          displayName: body.name,
        },
      });

      return await tx.distributor.create({
        data: {
          userId: user.id,
          name: body.name,
          email: body.email,
          tier: body.tier || "STANDARD",
          country: body.country,
          defaultCurrency: body.defaultCurrency || "USD",
          phone: body.phone,

          billingName: body.billingName,
          billingLine1: body.billingLine1,
          billingLine2: body.billingLine2,
          billingCity: body.billingCity,
          billingState: body.billingState,
          billingZip: body.billingZip,
          billingCountry: body.billingCountry,
        },
      });
    });

    return NextResponse.json({ ok: true, distributor: result, tempPassword: password });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Creation failed" }, { status: 400 });
  }
}