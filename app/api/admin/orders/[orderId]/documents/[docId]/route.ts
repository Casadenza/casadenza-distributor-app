import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";
import { unlink } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function docsRoot() {
  return path.join(process.cwd(), "storage", "documents");
}

export async function DELETE(
  _req: Request,
  ctx: { params: { orderId: string; docId: string } }
) {
  const session = await getServerSession();
  if (!session || session.role !== "ADMIN") return jsonError("Unauthorized", 401);

  const orderId = String(ctx.params.orderId || "");
  const docId = String(ctx.params.docId || "");
  if (!orderId || !docId) return jsonError("Missing params", 400);

  const doc = await prisma.orderDocument.findUnique({ where: { id: docId } });
  if (!doc || doc.orderId !== orderId) return jsonError("Document not found", 404);

  // delete DB first
  await prisma.orderDocument.delete({ where: { id: docId } });

  // delete file (if exists)
  const filePath = path.join(docsRoot(), orderId, `${docId}.pdf`);
  try {
    await unlink(filePath);
  } catch {
    // ignore if file missing
  }

  return NextResponse.json({ ok: true });
}