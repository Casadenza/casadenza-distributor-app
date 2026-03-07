import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";

export const runtime = "nodejs";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: Request) {
  const session = await getServerSession();
  if (!session) return jsonError("Unauthorized", 401);

  const { searchParams } = new URL(req.url);
  const type = (searchParams.get("type") || "ALL").toUpperCase();
  const category = (searchParams.get("category") || "ALL").toUpperCase();
  const q = (searchParams.get("q") || "").trim();

  const where: any = { isActive: true };

  if (type !== "ALL") where.type = type;
  if (category !== "ALL") where.category = category;

  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { collection: { contains: q, mode: "insensitive" } },
      { stoneType: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { category: { contains: q, mode: "insensitive" } },
      { type: { contains: q, mode: "insensitive" } },
    ];
  }

  const items = await prisma.marketingAsset.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 5000,
  });

  return NextResponse.json({ ok: true, items });
}