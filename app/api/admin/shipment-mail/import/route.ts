import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";
import { isSameOrigin } from "@/lib/communication-access";
import { uploadBufferToCloudinary } from "@/lib/cloudinary";
import { readShipmentPdf, validMailbox, safeGmailMessageId } from "@/lib/shipment-mail";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function jsonError(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session || session.role !== "ADMIN") return jsonError("Forbidden", 403);
  if (!isSameOrigin(request)) return jsonError("Invalid origin", 403);
  // Preview uses the same database as production. Never import while preview-testing.
  if (process.env.VERCEL_ENV !== "production" || process.env.ENABLE_SHIPMENT_DOCUMENT_IMPORT !== "true") {
    return jsonError("Shipment document import is disabled until reviewed production release.", 403);
  }
  const limit = checkRateLimit("shipment-mail-import:" + getClientIp(request), 5, 60_000);
  if (!limit.ok) return jsonError("Too many imports. Try again in a minute.", 429);

  const body = await request.json().catch(() => null);
  const mailbox = validMailbox(body?.mailbox);
  const messageId = safeGmailMessageId(body?.messageId);
  const partId = typeof body?.partId === "string" ? body.partId : "";
  const orderId = typeof body?.orderId === "string" ? body.orderId.trim() : "";
  const distributorId = typeof body?.distributorId === "string" ? body.distributorId.trim() : "";
  const reference = typeof body?.reference === "string" ? body.reference.trim() : "";
  if (!mailbox || !messageId || !partId || !orderId || !distributorId || reference.length < 3 || reference.length > 90 ||
      body?.confirmation !== "SHARE DOCUMENT") {
    return jsonError("Confirm mailbox, PDF, shipment reference and the exact destination order.");
  }
  const order = await prisma.order.findUnique({
    where: { id: orderId }, select: { id: true, distributorId: true, notes: true },
  });
  if (!order || order.distributorId !== distributorId) return jsonError("Distributor and order do not match.", 403);
  try {
    const pdf = await readShipmentPdf({ mailbox, messageId, partId });
    // The subject may not contain all shipment identifiers. The admin must confirm
    // the actual attached PDF and consignee before importing; never auto-match names.
    const cleanName = pdf.filename.replace(/[\r\n<>:"\/\\|?*\u0000-\u001F]/g, "-").trim().slice(0, 140) || "shipment.pdf";
    const title = cleanName + " [email " + messageId.slice(-10) + " / " + partId.replace(/[^a-z0-9]/gi, "") + "]";
    const prior = await prisma.orderDocument.findFirst({ where: { orderId, title }, select: { id: true } });
    if (prior) return jsonError("This email attachment was already linked to this order.", 409);

    const uploaded = await uploadBufferToCloudinary({
      buffer: pdf.buffer, folder: "casadenza/documents/" + orderId,
      publicId: randomUUID(), resourceType: "raw", filename: cleanName,
    });
    const document = await prisma.orderDocument.create({
      data: { orderId, title, url: uploaded.secureUrl },
      select: { id: true, title: true, orderId: true },
    });
    return NextResponse.json({
      ok: true, document, distributorId,
      notice: "Document is now in the specified distributor's order Documents. No email was sent.",
    }, { status: 201 });
  } catch (error) {
    console.error("Shipment document import failed", error instanceof Error ? error.name : "Unknown");
    return jsonError("Unable to verify or import this PDF. Review mailbox access and document size.", 503);
  }
}
