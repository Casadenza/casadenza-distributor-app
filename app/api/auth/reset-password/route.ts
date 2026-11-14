import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { currentPasswordProof, verifyPasswordResetToken } from "@/lib/password-reset";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/communication-access";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ ok: false, error: "Invalid request origin" }, { status: 403 });
  }
  if (!checkRateLimit("password-change:" + getClientIp(request), 10, 15 * 60 * 1000).ok) {
    return NextResponse.json({ ok: false, error: "Too many attempts. Try later." }, { status: 429 });
  }
  const input = await request.json().catch(() => null);
  const token = typeof input?.token === "string" ? input.token : "";
  const password = typeof input?.password === "string" ? input.password : "";
  if (token.length < 50 || token.length > 4096 || password.length < 12 || password.length > 128) {
    return NextResponse.json({ ok: false, error: "Use a valid reset link and a password of 12 to 128 characters." }, { status: 400 });
  }
  try {
    const { userId, proof } = await verifyPasswordResetToken(token);
    const user = await prisma.user.findUnique({
      where: { id: userId }, select: { id: true, passwordHash: true },
    });
    if (!user || proof !== currentPasswordProof(user)) {
      return NextResponse.json({ ok: false, error: "This reset link is invalid or has already been used." }, { status: 400 });
    }
    const nextHash = await bcrypt.hash(password, 12);
    const updated = await prisma.user.updateMany({
      where: { id: user.id, passwordHash: user.passwordHash },
      data: { passwordHash: nextHash, forcePasswordReset: false },
    });
    if (updated.count !== 1) {
      return NextResponse.json({ ok: false, error: "This reset link has already been used." }, { status: 400 });
    }
    return NextResponse.json({ ok: true, message: "Password changed. You can now sign in." }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Reset link expired or invalid. Request a fresh link." }, { status: 400 });
  }
}
