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

function sanitizeFileName(value: string) {
  return String(value || "document")
    .replace(/[<>:"/\\|?*\u0000-\u001F]+/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function fileNameWithPdf(name: string) {
  return name.toLowerCase().endsWith(".pdf") ? name : `${name}.pdf`;
}

async function getAuthorizedDocument(docId: string) {
  const session = await getServerSession();
  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const doc = await prisma.orderDocument.findUnique({
    where: { id: docId },
    include: { order: true },
  });

  if (!doc || !doc.order) {
    return { error: NextResponse.json({ error: "Document not found" }, { status: 404 }) };
  }

  if (session.role !== "ADMIN") {
    if (!session.distributorId || doc.order.distributorId !== session.distributorId) {
      return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    }
  }

  return { doc };
}

export async function GET(_req: Request, ctx: { params: { docId: string } }) {
  const docId = String(ctx.params.docId || "");
  if (!docId) {
    return NextResponse.json({ error: "Missing docId" }, { status: 400 });
  }

  const { doc, error } = await getAuthorizedDocument(docId);
  if (error) return error;

  const safeName = fileNameWithPdf(sanitizeFileName(doc.title || "document"));
  const remoteUrl = String(doc.url || "").trim();

  if (remoteUrl) {
    const upstream = await fetch(remoteUrl, { cache: "no-store" });
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: "Unable to fetch file" }, { status: 404 });
    }

    return new NextResponse(upstream.body, {
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "application/pdf",
        "Content-Disposition": `inline; filename="${safeName}"`,
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
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
      "Content-Disposition": `inline; filename="${safeName}"`,
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}