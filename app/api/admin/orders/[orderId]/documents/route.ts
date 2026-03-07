import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function docsRoot() {
  // project root/storage/documents
  return path.join(process.cwd(), "storage", "documents");
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

  // 1) create DB record first (need docId for deterministic filename)
  const created = await prisma.orderDocument.create({
    data: {
      orderId,
      title: title || type.replaceAll("_", " "),
      url: "", // will update after save
    },
  });

  // 2) save file to storage/documents/{orderId}/{docId}.pdf
  const dir = path.join(docsRoot(), orderId);
  await mkdir(dir, { recursive: true });

  const buf = Buffer.from(await file.arrayBuffer());
  const filePath = path.join(dir, `${created.id}.pdf`);
  await writeFile(filePath, buf);

  // 3) update URL to secure download endpoint
  const url = `/api/documents/${created.id}/download`;
  const updated = await prisma.orderDocument.update({
    where: { id: created.id },
    data: { url },
  });

  return NextResponse.json({ ok: true, document: updated });
}