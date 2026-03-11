import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";
import { uploadBufferToCloudinary } from "@/lib/cloudinary";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const MAX_PDF_SIZE_MB = 10;
const MAX_PDF_SIZE_BYTES = MAX_PDF_SIZE_MB * 1024 * 1024;

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request, ctx: { params: { orderId: string } }) {
  const session = await getServerSession();
  if (!session || session.role !== "ADMIN") return jsonError("Unauthorized", 401);

  const ip = getClientIp(req);
  const limit = checkRateLimit(`documents-upload:${ip}`, 10, 60 * 1000);
  if (!limit.ok) {
    return jsonError("Too many upload attempts. Please try again in 1 minute.", 429);
  }

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
  if (!file.size || file.size <= 0) return jsonError("Empty file not allowed", 400);
  if (file.size > MAX_PDF_SIZE_BYTES) {
    return jsonError(`PDF too large. Maximum allowed size is ${MAX_PDF_SIZE_MB} MB.`, 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!buffer.length) return jsonError("Failed to read file", 400);

  const uploaded = await uploadBufferToCloudinary({
    buffer,
    folder: `casadenza/documents/${orderId}`,
    publicId: crypto.randomUUID(),
    resourceType: "raw",
    filename: `${crypto.randomUUID()}.pdf`,
  });

  const created = await prisma.orderDocument.create({
    data: {
      orderId,
      title: title || type.replaceAll("_", " "),
      url: uploaded.secureUrl,
    },
  });

  return NextResponse.json({ ok: true, document: created });
}