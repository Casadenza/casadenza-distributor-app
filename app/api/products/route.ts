import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromRequest } from "@/app/api/_session";

export async function GET(req: Request) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const items = await db.product.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, sku: true },
    });

    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
