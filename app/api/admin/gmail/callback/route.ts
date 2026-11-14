import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getServerSession } from "@/lib/serverSession";
import { exchangeCode, gmailConfigReady, storeMailbox, verifyGoogleMailbox, verifyState } from "@/lib/gmail-oauth";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getServerSession();
  const target = new URL("/admin/mailboxes", request.nextUrl.origin);
  const respond = (message: string) => {
    target.searchParams.set("result", message);
    const response = NextResponse.redirect(target);
    response.cookies.set("cz_gmail_oauth_state", "", {
      httpOnly: true, secure: true, sameSite: "lax", path: "/api/admin/gmail",
      maxAge: 0,
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  };
  if (session?.role !== "ADMIN") return respond("unauthorized");
  const state = request.nextUrl.searchParams.get("state") || "";
  const cookie = request.cookies.get("cz_gmail_oauth_state")?.value || "";
  const a = Buffer.from(state, "utf8"), b = Buffer.from(cookie, "utf8");
  if (!state || a.length !== b.length || !timingSafeEqual(a, b))
    return respond("invalid_state");
  const mailbox = verifyState(state, session.userId);
  if (!mailbox) return respond("expired_state");
  if (request.nextUrl.searchParams.has("error")) return respond("permission_denied");
  if (!gmailConfigReady()) return respond("configuration_missing");
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return respond("missing_code");
  try {
    const tokens = await exchangeCode(code);
    await verifyGoogleMailbox(tokens.accessToken, mailbox);
    await storeMailbox(mailbox, tokens.refreshToken, session.userId);
    return respond(mailbox + "_connected");
  } catch (error) {
    // No codes, access tokens or refresh tokens are ever logged or returned.
    console.error("Gmail OAuth completion failed", error instanceof Error ? error.message : "Unknown error");
    return respond("connection_failed");
  }
}
