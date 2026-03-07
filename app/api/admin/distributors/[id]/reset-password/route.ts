import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";
import bcrypt from "bcryptjs";

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const distributorId = ctx.params.id;
  const body = await req.json().catch(() => ({}));
  
  // Naya password generate karein ya body se lein
  const newPassword = body.password || Math.random().toString(36).slice(-10) + "!";
  const passwordHash = await bcrypt.hash(newPassword, 10);

  const distributor = await prisma.distributor.findUnique({
    where: { id: distributorId },
    select: { userId: true }
  });

  if (!distributor?.userId) return NextResponse.json({ error: "User link not found" }, { status: 404 });

  await prisma.user.update({
    where: { id: distributor.userId },
    data: { passwordHash, forcePasswordReset: true }
  });

  return NextResponse.json({ ok: true, tempPassword: newPassword });
}