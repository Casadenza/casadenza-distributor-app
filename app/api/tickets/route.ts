import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromRequest } from "@/app/api/_session";

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);

  if (!session?.distributorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await prisma.ticket.findMany({
    where: { distributorId: session.distributorId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req);

  if (!session?.distributorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { type, subject, description } = await req.json();

  if (!type || !subject || !description) {
    return NextResponse.json(
      { error: "type, subject, description required" },
      { status: 400 }
    );
  }

  const ticket = await prisma.ticket.create({
    data: {
      distributorId: session.distributorId,
      type,
      subject,
      description,
    },
  });

  return NextResponse.json({ ticket });
}