import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCommunicationActor, communicationScope, isSameOrigin, normalizeBody } from "@/lib/communication-access";
import { notifyCommunicationMessage } from "@/lib/communication-mail";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: { threadId: string } };
function error(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function GET(_req: Request, { params }: Context) {
  const actor = await getCommunicationActor();
  if (!actor) return error("Unauthorized", 401);
  const thread = await prisma.communicationThread.findFirst({
    where: { id: params.threadId, ...communicationScope(actor) },
    select: {
      id: true, subject: true, category: true, status: true,
      orderId: true, createdAt: true, lastMessageAt: true,
      distributor: { select: { id: true, name: true, country: true } },
      order: { select: { id: true, notes: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true, body: true, senderRole: true, createdAt: true,
          notificationStatus: true,
          sender: { select: { displayName: true, email: true } },
        },
      },
    },
  });
  if (!thread) return error("Conversation not found", 404);
  let poNumber = "";
  if (thread.order?.notes) {
    try { poNumber = String(JSON.parse(thread.order.notes)?.poNumber || ""); } catch { /* legacy notes */ }
  }
  return NextResponse.json({
    ok: true,
    thread: { ...thread, order: thread.order ? { id: thread.order.id, poNumber } : null },
  });
}

export async function POST(request: Request, { params }: Context) {
  const actor = await getCommunicationActor();
  if (!actor) return error("Unauthorized", 401);
  if (!isSameOrigin(request)) return error("Invalid request origin", 403);
  if (!checkRateLimit("communications-reply:" + actor.userId, 30, 60_000).ok) return error("Too many messages", 429);
  const data = await request.json().catch(() => null);
  const body = normalizeBody(data?.body);
  if (!body) return error("Message must be 1 to 10,000 characters");
  const thread = await prisma.communicationThread.findFirst({
    where: { id: params.threadId, ...communicationScope(actor) },
    include: { distributor: { include: { user: { select: { email: true } } } } },
  });
  if (!thread) return error("Conversation not found", 404);
  const message = await prisma.communicationMessage.create({
    data: { threadId: thread.id, body, senderRole: actor.role, senderUserId: actor.userId },
  });
  await prisma.communicationThread.update({
    where: { id: thread.id },
    data: { status: "OPEN", lastMessageAt: message.createdAt },
  });
  const notificationStatus = await notifyCommunicationMessage({
    messageId: message.id, threadId: thread.id, subject: thread.subject, body,
    senderRole: actor.role,
    distributorEmail: thread.distributor.user.email || thread.distributor.email,
  });
  return NextResponse.json({ ok: true, id: message.id, notificationStatus }, { status: 201 });
}

export async function PATCH(request: Request, { params }: Context) {
  const actor = await getCommunicationActor();
  if (!actor) return error("Unauthorized", 401);
  if (!isSameOrigin(request)) return error("Invalid request origin", 403);
  const data = await request.json().catch(() => null);
  const thread = await prisma.communicationThread.findFirst({
    where: { id: params.threadId, ...communicationScope(actor) },
    select: { id: true },
  });
  if (!thread) return error("Conversation not found", 404);
  if (data?.action === "read") {
    await prisma.communicationMessage.updateMany({
      where: {
        threadId: thread.id,
        senderRole: actor.role === "ADMIN" ? "DISTRIBUTOR" : "ADMIN",
        ...(actor.role === "ADMIN" ? { readByAdminAt: null } : { readByDistributorAt: null }),
      },
      data: actor.role === "ADMIN" ? { readByAdminAt: new Date() } : { readByDistributorAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  }
  if (data?.action === "status") {
    if (actor.role !== "ADMIN") return error("Only Casadenza admin can change status", 403);
    const status = String(data?.status || "");
    if (!["OPEN", "RESOLVED"].includes(status)) return error("Invalid conversation status");
    await prisma.communicationThread.update({ where: { id: thread.id }, data: { status } });
    return NextResponse.json({ ok: true });
  }
  return error("Invalid action");
}
