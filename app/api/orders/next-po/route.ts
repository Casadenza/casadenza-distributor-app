import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromRequest } from "@/app/api/_session";

function pad3(n: number) {
  return String(n).padStart(3, "0");
}

// Prefer distributor.code like "DB1" / "DB2" if available.
// Fallback: "DB" + last 2 chars of distributorId.
function deriveDistributorCode(d: any) {
  const code = (d?.code || d?.shortCode || "").toString().trim();
  if (code) return code.toUpperCase();
  const id = (d?.id || "").toString();
  return ("DB" + id.slice(-2)).toUpperCase();
}

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session?.distributorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const distributor = await prisma.distributor.findUnique({
    where: { id: session.distributorId },
  });

  const distCode = deriveDistributorCode(distributor);

  // sequence = orders count + 1 (per distributor)
  const count = await prisma.order.count({
    where: { distributorId: session.distributorId },
  });

  const seq = count + 1;
  const poNumber = `${distCode}/CST/${pad3(seq)}`;

  const today = new Date();
  const poDate = today.toISOString().slice(0, 10); // YYYY-MM-DD

  return NextResponse.json({ ok: true, poNumber, poDate });
}