import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  const session = await getServerSession(); // ✅ must await
  if (!session) return jsonError("Unauthorized", 401);
  if (session.role !== "ADMIN") return jsonError("Forbidden", 403);

  const userId = (session as any).userId;
  if (!userId) return jsonError("Session missing userId", 401);

  const body = await req.json().catch(() => ({}));
  const currentPassword = String(body?.currentPassword || "").trim();
  const newPassword = String(body?.newPassword || "").trim();

  if (!currentPassword || !newPassword) {
    return jsonError("currentPassword and newPassword are required", 400);
  }
  if (newPassword.length < 8) {
    return jsonError("New password must be at least 8 characters", 400);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, passwordHash: true },
  });
  if (!user) return jsonError("User not found", 404);
  if (!user.passwordHash) return jsonError("Password not set", 400);

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) return jsonError("Current password is incorrect", 401);

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      forcePasswordReset: false,
    },
  });

  return NextResponse.json({ ok: true });
}
