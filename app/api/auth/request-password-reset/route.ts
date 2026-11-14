import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { createPasswordResetToken } from "@/lib/password-reset";
import { isSameOrigin } from "@/lib/communication-access";

export const runtime = "nodejs";
const GENERIC_MESSAGE = "If an account uses that email address, a reset link will be sent shortly.";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ ok: false, error: "Invalid request origin" }, { status: 403 });
  }
  const ip = getClientIp(request);
  if (!checkRateLimit("password-reset-ip:" + ip, 5, 15 * 60 * 1000).ok) {
    return NextResponse.json({ ok: false, error: "Too many requests. Try again later." }, { status: 429 });
  }
  const input = await request.json().catch(() => null);
  const email = String(input?.email || "").trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "Enter a valid email address." }, { status: 400 });
  }
  const emailKey = createHash("sha256").update(email).digest("hex");
  if (!checkRateLimit("password-reset-account:" + emailKey, 3, 60 * 60 * 1000).ok) {
    return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
  }
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  if (!smtpUser || !smtpPass) {
    return NextResponse.json({ ok: false, error: "Password recovery email is not configured." }, { status: 503 });
  }
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, passwordHash: true },
    });
    if (user?.passwordHash) {
      const origin = new URL(request.url);
      // Never send a token link using an untrusted Host.
      if (!(origin.hostname === "portal.casadenza.app" ||
            origin.hostname === "admin.casadenza.app" ||
            origin.hostname.endsWith(".vercel.app"))) {
        throw new Error("Untrusted password reset URL");
      }
      const token = await createPasswordResetToken(user);
      const url = new URL("/reset-password", origin.origin);
      // Fragment token stays out of HTTP requests, server logs and referrer headers.
      url.hash = "token=" + encodeURIComponent(token);
      const port = Number(process.env.SMTP_PORT || 465);
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port, secure: port === 465,
        auth: { user: smtpUser, pass: smtpPass },
        connectionTimeout: 15000,
      });
      await transporter.sendMail({
        from: '"Casadenza Distributor Portal" <' + smtpUser + '>',
        to: user.email,
        subject: "Reset your Casadenza Portal password",
        text: "A password reset was requested for your Casadenza Distributor Portal account.\n\n" +
          "Open the following link within 15 minutes:\n" + url.toString() +
          "\n\nIf you did not request this, you can ignore this email. Never share the link.",
        html: "<div style=\"font:14px Arial,sans-serif;max-width:600px\">" +
          "<h2>Reset your Casadenza Portal password</h2>" +
          "<p>This one-time link expires after 15 minutes.</p>" +
          "<p><a href=\"" + url.toString().replace(/&/g, "&amp;") + "\">Set a new password</a></p>" +
          "<p>If you did not request this, ignore this email. Never share the link.</p></div>",
      });
    }
  } catch (error) {
    // Do not disclose whether an email has an account or whether email delivery failed.
    console.error("Password recovery request failed", error instanceof Error ? error.name : "Unknown");
  }
  return NextResponse.json({ ok: true, message: GENERIC_MESSAGE }, {
    headers: { "Cache-Control": "no-store" },
  });
}
