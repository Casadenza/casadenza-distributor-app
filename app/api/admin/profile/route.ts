import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";

export const runtime = "nodejs";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  const session = await getServerSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (session.role !== "ADMIN") return jsonError("Forbidden", 403);

  const userId = (session as any).userId;
  if (!userId) return jsonError("Session missing userId", 401);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      forcePasswordReset: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) return jsonError("User not found", 404);

  return NextResponse.json({ ok: true, profile: user });
}

export async function PATCH(req: Request) {
  const session = await getServerSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (session.role !== "ADMIN") return jsonError("Forbidden", 403);

  const userId = (session as any).userId;
  if (!userId) return jsonError("Session missing userId", 401);

  const body = await req.json().catch(() => ({}));

  // ✅ UI usually updates displayName only
  const displayName =
    body?.displayName !== undefined ? String(body.displayName || "").trim() : undefined;

  if (displayName !== undefined && displayName.length === 0) {
    return jsonError("displayName cannot be empty", 400);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(displayName !== undefined ? { displayName } : {}),
    },
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      forcePasswordReset: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ ok: true, profile: updated });
}
