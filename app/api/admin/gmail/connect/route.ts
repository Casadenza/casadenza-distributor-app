import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/serverSession";
import { GMAIL_ADDRESSES, gmailConfigReady, googleConsentUrl, signState, type Mailbox } from "@/lib/gmail-oauth";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getServerSession();
  if (session?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!gmailConfigReady()) return NextResponse.json({ error: "Google OAuth settings are not configured yet" }, { status: 503 });
  const value = request.nextUrl.searchParams.get("mailbox");
  if (value !== "info") return NextResponse.json({ error: "Invalid mailbox" }, { status: 400 });
  const mailbox = value as Mailbox;
  if (!GMAIL_ADDRESSES[mailbox]) return NextResponse.json({ error: "Unknown mailbox" }, { status: 400 });
  const state = signState(mailbox, session.userId);
  const response = NextResponse.redirect(googleConsentUrl(state, mailbox));
  response.cookies.set("cz_gmail_oauth_state", state, {
    httpOnly: true, secure: true, sameSite: "lax", path: "/api/admin/gmail",
    maxAge: 600,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
