import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCommunicationActor, isSameOrigin, normalizeBody } from "@/lib/communication-access";
import { notifyCommunicationMessage } from "@/lib/communication-mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CATEGORIES = ["GENERAL", "ORDER", "PRODUCT", "DOCUMENTS", "SUPPORT"];
const MAX_RECIPIENTS = 200;
const MAX_EMAIL_RECIPIENTS = 15;
const BROADCAST_COOLDOWN_MS = 5 * 60 * 1000;

function emailAvailable() {
  // No real distributor receives Preview test email.
  return process.env.VERCEL_ENV === "production" &&
    process.env.ENABLE_BROADCAST_EMAIL_NOTIFICATIONS === "true" &&
    process.env.CASADENZA_INBOX_EMAIL_NOTIFICATIONS !== "false" &&
    !!process.env.SMTP_USER && !!process.env.SMTP_PASS;
}

function error(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET() {
  const actor = await getCommunicationActor();
  if (!actor || actor.role !== "ADMIN") return error("Forbidden", 403);
  const count = await prisma.distributor.count({ where: { user: { role: "DISTRIBUTOR" } } });
  return NextResponse.json({
    ok: true, recipientCount: count, maxRecipients: MAX_RECIPIENTS,
    emailDefaultEnabled: process.env.CASADENZA_INBOX_EMAIL_NOTIFICATIONS !== "false",
    emailAvailable: emailAvailable() && count <= MAX_EMAIL_RECIPIENTS,
    maxEmailRecipients: MAX_EMAIL_RECIPIENTS,
  }, { headers: { "Cache-Control": "no-store" } });
}

/**
 * One private portal thread per distributor. In production, SMTP notice is
 * automatic by default where the feature is enabled and recipient volume is
 * within the verified limit. A durable queue is required for larger batches.
 * A failed SMTP request never removes the saved message.
 */
export async function POST(request: Request) {
  const actor = await getCommunicationActor();
  if (!actor || actor.role !== "ADMIN") return error("Forbidden", 403);
  if (!isSameOrigin(request)) return error("Invalid request origin", 403);

  const data = await request.json().catch(() => null);
  const subject = normalizeBody(data?.subject, 160);
  const body = normalizeBody(data?.body);
  const category = String(data?.category || "GENERAL").toUpperCase();
  const broadcastId = typeof data?.broadcastId === "string" ? data.broadcastId.trim() : "";
  const automaticDelivery = data?.delivery === "AUTO";
  const portalOnly = data?.delivery === "PORTAL_ONLY";
  if (!subject || !body || !CATEGORIES.includes(category)) return error("Valid subject, category and message required");
  if (data?.confirmation !== "SEND TO ALL" || (!automaticDelivery && !portalOnly)) {
    return error("Explicit recipient confirmation and supported delivery mode required");
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(broadcastId)) {
    return error("Invalid broadcast request identifier");
  }
  const distributors = await prisma.distributor.findMany({
    where: { user: { role: "DISTRIBUTOR" } },
    select: { id: true, email: true, user: { select: { email: true } } },
    orderBy: { id: "asc" },
    take: MAX_RECIPIENTS + 1,
  });
  if (distributors.length === 0) return error("No registered distributor accounts", 409);
  if (distributors.length > MAX_RECIPIENTS) return error("More than 200 distributors. Use a reviewed queued delivery workflow.", 413);
  const deliverEmail = automaticDelivery && emailAvailable() && distributors.length <= MAX_EMAIL_RECIPIENTS;
  // All recipients always get a private portal thread. If email is unavailable,
  // or the group is too large for the bounded SMTP path, no email is sent.
  const ids = distributors.map(d => "bcast_" + broadcastId + "_" + d.id);
  const existing = await prisma.communicationThread.count({ where: { id: { in: ids } } });
  if (existing) return error("This broadcast was already recorded. Refresh your conversations.", 409);

  const recentBroadcast = await prisma.communicationMessage.count({
    where: {
      senderUserId: actor.userId,
      createdAt: { gte: new Date(Date.now() - BROADCAST_COOLDOWN_MS) },
      thread: { id: { startsWith: "bcast_" } },
    },
  });
  if (recentBroadcast > 0) return error("Only one portal broadcast can be sent every five minutes.", 429);

  const now = new Date();
  const records = distributors.map((d, i) => ({
    id: "bmsg_" + randomUUID(),
    threadId: ids[i],
    senderUserId: actor.userId,
    senderRole: "ADMIN",
    body,
    notificationStatus: deliverEmail ? "PENDING" : "SKIPPED",
    notificationError: deliverEmail ? null : "Portal-only broadcast",
    createdAt: now,
  }));
  try {
    await prisma.$transaction(async tx => {
      await tx.communicationThread.createMany({
        data: distributors.map((d, i) => ({
          id: ids[i], distributorId: d.id, subject, category, status: "OPEN",
          createdAt: now, updatedAt: now, lastMessageAt: now,
        })),
      });
      await tx.communicationMessage.createMany({ data: records });
    }, { timeout: 15000 });
  } catch (e: any) {
    if (e?.code === "P2002") return error("This broadcast has already been recorded. Refresh the inbox.", 409);
    console.error("Portal broadcast failed", e instanceof Error ? e.name : "Unknown");
    return error("Broadcast could not be saved. Check inbox before retrying.", 503);
  }

  let smtpAccepted = 0;
  let smtpFailed = 0;
  if (deliverEmail) {
    // Small bounded batches only; never send in Preview, never use client supplied addresses.
    for (let start = 0; start < distributors.length; start += 3) {
      const attempts = await Promise.allSettled(distributors.slice(start, start + 3).map((d, index) => {
        const i = start + index;
        return notifyCommunicationMessage({
          messageId: records[i].id,
          threadId: ids[i],
          subject,
          body, // Ignored in email: the content stays inside the secure portal.
          senderRole: "ADMIN",
          distributorEmail: d.user.email || d.email,
        });
      }));
      for (const result of attempts) {
        if (result.status === "fulfilled" && result.value === "SENT") smtpAccepted++;
        else smtpFailed++;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    recipientCount: distributors.length,
    delivery: deliverEmail ? "EMAIL_AND_PORTAL" : "PORTAL_ONLY",
    smtpAccepted, smtpFailed,
    note: deliverEmail
      ? "SMTP accepted notifications; final inbox delivery is not guaranteed. Check failures before retrying."
      : "No email was sent; all recipients have separate private portal conversations.",
  }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
