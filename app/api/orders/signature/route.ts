import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session?.distributorId) return jsonError("Unauthorized", 401);

  const form = await req.formData();
  const orderId = String(form.get("orderId") || "");
  const signerName = String(form.get("signerName") || "").trim();
  const file = form.get("file") as File | null;

  if (!orderId) return jsonError("Missing orderId", 400);
  if (!signerName) return jsonError("Missing signerName", 400);
  if (!file) return jsonError("Missing file", 400);

  const order = await prisma.order.findFirst({
    where: { id: orderId, distributorId: session.distributorId },
  });
  if (!order) return jsonError("Order not found", 404);

  const buf = Buffer.from(await file.arrayBuffer());
  const mime = file.type || "image/png";
  const dataUrl = `data:${mime};base64,${buf.toString("base64")}`;

  let meta: any = {};
  try {
    meta = order.notes ? JSON.parse(order.notes) : {};
  } catch {
    meta = {};
  }

  meta.signature = {
    signerName,
    dataUrl,
    uploadedAt: new Date().toISOString(),
  };

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { notes: JSON.stringify(meta) },
  });

  await prisma.orderDocument.create({
    data: {
      orderId,
      title: `Signature - ${signerName}`,
      url: dataUrl,
    },
  });

  return NextResponse.json({ ok: true, order: updated });
}