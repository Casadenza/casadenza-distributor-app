import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCommunicationActor, isSameOrigin, normalizeBody } from "@/lib/communication-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATEGORIES = ["GENERAL", "ORDER", "PRODUCT", "DOCUMENTS", "SUPPORT"];
const MAX_RECIPIENTS = 200;
const BROADCAST_COOLDOWN_MS = 5 * 60 * 1000;

function error(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET() {
  const actor = await getCommunicationActor();
  if (!actor || actor.role !== "ADMIN") return error("Forbidden", 403);
  const count = await prisma.distributor.count({ where: { user: { role: "DISTRIBUTOR" } } });
  return NextResponse.json({ ok: true, recipientCount: count, maxRecipients: MAX_RECIPIENTS, delivery: "PORTAL_ONLY" }, {
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * Admin-only portal broadcast, one private conversation per distributor.
 * No external email is sent here: bulk SMTP must be configured, rate-limited,
 * queued and verified separately before a mail option is enabled.
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
  if (!subject || !body || !CATEGORIES.includes(category)) return error("Valid subject, category and message required");
  if (data?.confirmation !== "SEND TO ALL" || data?.delivery !== "PORTAL_ONLY") {
    return error("Explicit confirmation of portal-only delivery is required");
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(broadcastId)) {
    return error("Invalid broadcast request identifier");
  }

  const distributors = await prisma.distributor.findMany({
    where: { user: { role: "DISTRIBUTOR" } },
    select: { id: true },
    orderBy: { id: "asc" },
    take: MAX_RECIPIENTS + 1,
  });
  if (distributors.length === 0) return error("No registered distributor accounts", 409);
  if (distributors.length > MAX_RECIPIENTS) return error("More than 200 distributors. Use a reviewed queued batch delivery workflow.", 413);

  const ids = distributors.map((d) => "bcast_" + broadcastId + "_" + d.id);
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
  try {
    await prisma.$transaction(async (tx) => {
      await tx.communicationThread.createMany({
        data: distributors.map((d, i) => ({
          id: ids[i],
          distributorId: d.id,
          subject,
          category,
          status: "OPEN",
          createdAt: now,
          updatedAt: now,
          lastMessageAt: now,
        })),
      });
      await tx.communicationMessage.createMany({
        data: distributors.map((d, i) => ({
          id: "bmsg_" + randomUUID(),
          threadId: ids[i],
          senderUserId: actor.userId,
          senderRole: "ADMIN",
          body,
          notificationStatus: "SKIPPED",
          notificationError: "Portal-only broadcast: email not requested",
          createdAt: now,
        })),
      });
    }, { timeout: 15000 });
  } catch (e: any) {
    if (e?.code === "P2002") return error("This broadcast has already been recorded. Refresh the inbox.", 409);
    console.error("Portal broadcast failed", e instanceof Error ? e.name : "Unknown");
    return error("Broadcast could not be saved. Check inbox before retrying.", 503);
  }

  return NextResponse.json({
    ok: true,
    recipientCount: distributors.length,
    notificationStatus: "SKIPPED",
    delivery: "PORTAL_ONLY",
  }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
