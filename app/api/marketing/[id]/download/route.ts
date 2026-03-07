import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = String(ctx.params.id || "");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const item = await prisma.marketingAsset.findUnique({ where: { id } });
  if (!item || !item.isActive) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // If external video link -> redirect
  if (String(item.type).toUpperCase() === "VIDEO" && item.externalUrl && !item.filePath) {
    return NextResponse.redirect(item.externalUrl);
  }

  if (!item.filePath) return NextResponse.json({ error: "File missing on server" }, { status: 404 });

  try {
    await stat(item.filePath);
  } catch {
    return NextResponse.json({ error: "File missing on server" }, { status: 404 });
  }

  const stream = createReadStream(item.filePath);

  const filenameBase =
    (item.title || "asset")
      .replace(/"/g, "")
      .replace(/[^\w\-. ]+/g, "")
      .trim() || "asset";

  const ext = path.extname(item.filePath) || "";

  return new NextResponse(stream as any, {
    headers: {
      "Content-Type": item.mimeType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${filenameBase}${ext}"`,
    },
  });
}