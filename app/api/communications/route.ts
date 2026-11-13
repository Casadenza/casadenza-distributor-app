import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCommunicationActor, communicationScope, isSameOrigin, normalizeBody } from "@/lib/communication-access";
import { notifyCommunicationMessage } from "@/lib/communication-mail";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATEGORIES = ["GENERAL", "ORDER", "PRODUCT", "DOCUMENTS", "SUPPORT"];
function error(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function GET() {
  const actor = await getCommunicationActor();
  if (!actor) return error("Unauthorized", 401);
  const isAdmin = actor.role === "ADMIN";
  const threads = await prisma.communicationThread.findMany({
    where: communicationScope(actor),
    select: {
      id: true, subject: true, category: true, status: true,
      orderId: true, lastMessageAt: true, createdAt: true,
      distributor: { select: { id: true, name: true, country: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { body: true, senderRole: true, createdAt: true },
      },
      _count: {
        select: {
          messages: {
            where: isAdmin
              ? { senderRole: "DISTRIBUTOR", readByAdminAt: null }
              : { senderRole: "ADMIN", readByDistributorAt: null },
          },
        },
      },
    },
    orderBy: { lastMessageAt: "desc" },
    take: 150,
  });
  return NextResponse.json({
    ok: true,
    items: threads.map((thread) => ({
      ...thread,
      lastMessage: thread.messages[0] || null,
      unreadCount: thread._count.messages,
      messages: undefined,
      _count: undefined,
    })),
  });
}

export async function POST(request: Request) {
  const actor = await getCommunicationActor();
  if (!actor) return error("Unauthorized", 401);
  if (!isSameOrigin(request)) return error("Invalid request origin", 403);
  if (!checkRateLimit("communications-create:" + actor.userId, 10, 60_000).ok) {
    return error("Too many messages. Try again shortly.", 429);
  }
  const data = await request.json().catch(() => null);
  const subject = normalizeBody(data?.subject, 160);
  const body = normalizeBody(data?.body);
  const category = String(data?.category || "GENERAL").toUpperCase();
  if (!subject || !body || !CATEGORIES.includes(category)) return error("Valid subject, category and message required");
  const distributorId = actor.role === "ADMIN" ? String(data?.distributorId || "") : actor.distributorId!;
  if (!distributorId) return error("Please select a distributor");
  const distributor = await prisma.distributor.findUnique({
    where: { id: distributorId },
    select: { id: true, email: true, user: { select: { email: true } } },
  });
  if (!distributor) return error("Distributor not found", 404);
  let orderId: string | null = null;
  if (data?.orderId) {
    const order = await prisma.order.findFirst({
      where: { id: String(data.orderId), distributorId },
      select: { id: true },
    });
    if (!order) return error("Order not found for distributor", 404);
    orderId = order.id;
  }
  const thread = await prisma.communicationThread.create({
    data: {
      distributorId,
      orderId,
      subject,
      category,
      status: "OPEN",
      messages: {
        create: { body, senderRole: actor.role, senderUserId: actor.userId },
      },
    },
    include: { messages: { take: 1, select: { id: true } } },
  });
  const notificationStatus = await notifyCommunicationMessage({
    messageId: thread.messages[0].id,
    threadId: thread.id,
    subject,
    body,
    senderRole: actor.role,
    distributorEmail: distributor.user.email || distributor.email,
  });
  return NextResponse.json({ ok: true, id: thread.id, notificationStatus }, { status: 201 });
}
