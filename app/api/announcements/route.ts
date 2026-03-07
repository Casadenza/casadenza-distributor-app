import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromRequest } from "@/app/api/_session";

export async function GET() {
  const items = await prisma.announcement.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req);

  if (session?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { title, message } = await req.json();

  if (!title || !message) {
    return NextResponse.json(
      { error: "title and message required" },
      { status: 400 }
    );
  }

  const created = await prisma.announcement.create({
    data: {
      title,
      message,
      isActive: true,
    },
  });

  return NextResponse.json({ created });
}

export async function PATCH(req: Request) {
  const session = await getSessionFromRequest(req);

  if (session?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, isActive } = await req.json();

  const updated = await prisma.announcement.update({
    where: { id },
    data: { isActive: Boolean(isActive) },
  });

  return NextResponse.json({ updated });
}