import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/serverSession";
import { prisma } from "@/lib/db";
import { redirectUri } from "@/lib/gmail-oauth";

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (session?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed = new URL(redirectUri()).origin;
  if (request.headers.get("origin") !== allowed)
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const form = await request.formData();
  const mailbox = form.get("mailbox");
  if (mailbox !== "info")
    return NextResponse.json({ error: "Invalid mailbox" }, { status: 400 });
  await prisma.gmailMailboxConnection.deleteMany({ where: { mailbox } });
  return NextResponse.redirect(new URL("/admin/mailboxes", allowed), 303);
}
