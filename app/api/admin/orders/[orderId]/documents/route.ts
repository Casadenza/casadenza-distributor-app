import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";
import { uploadBufferToCloudinary } from "@/lib/cloudinary";

export const runtime = "nodejs";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request, ctx: { params: { orderId: string } }) {
  const session = await getServerSession();
  if (!session || session.role !== "ADMIN") return jsonError("Unauthorized", 401);

  const orderId = String(ctx.params.orderId || "");
  if (!orderId) return jsonError("Missing orderId", 400);

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return jsonError("Order not found", 404);

  const form = await req.formData();
  const type = String(form.get("type") || "OTHER").trim();
  const title = String(form.get("title") || "").trim();
  const file = form.get("file") as File | null;

  if (!file) return jsonError("Missing file", 400);
  if (file.type !== "application/pdf") return jsonError("Only PDF allowed", 400);

  const created = await prisma.orderDocument.create({
    data: {
      orderId,
      title: title || type.replaceAll("_", " "),
      url: "",
    },
  });

  const buffer = Buffer.from(await file.arrayBuffer());

  const uploaded = await uploadBufferToCloudinary({
    buffer,
    folder: `casadenza/documents/${orderId}`,
    publicId: created.id,
    resourceType: "raw",
    filename: `${created.id}.pdf`,
  });

  const updated = await prisma.orderDocument.update({
    where: { id: created.id },
    data: {
      url: uploaded.secureUrl,
    },
  });

  return NextResponse.json({ ok: true, document: updated });
}