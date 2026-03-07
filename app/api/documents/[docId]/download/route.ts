import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

function docsRoot() {
  return path.join(process.cwd(), "storage", "documents");
}

export async function GET(_req: Request, ctx: { params: { docId: string } }) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const docId = String(ctx.params.docId || "");
  if (!docId) return NextResponse.json({ error: "Missing docId" }, { status: 400 });

  const doc = await prisma.orderDocument.findUnique({
    where: { id: docId },
    include: { order: true },
  });

  if (!doc || !doc.order) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Auth:
  // - ADMIN: allow
  // - DISTRIBUTOR: allow only if order belongs to session distributor
  if (session.role !== "ADMIN") {
    if (!session.distributorId || doc.order.distributorId !== session.distributorId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const filePath = path.join(docsRoot(), doc.orderId, `${docId}.pdf`);
  try {
    await stat(filePath);
  } catch {
    return NextResponse.json({ error: "File missing on server" }, { status: 404 });
  }

  const stream = createReadStream(filePath);

  return new NextResponse(stream as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${(doc.title || "document").replace(/"/g, "")}.pdf"`,
    },
  });
}