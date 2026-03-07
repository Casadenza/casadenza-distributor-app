import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";
import { unlink } from "fs/promises";

export const runtime = "nodejs";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function isAdminSession(session: any) {
  return !!session?.isAdmin || session?.role === "ADMIN" || session?.user?.role === "ADMIN";
}

export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  const session = await getServerSession();
  if (!isAdminSession(session)) return jsonError("Unauthorized", 401);

  const id = String(ctx.params.id || "");
  if (!id) return jsonError("Missing id", 400);

  const item = await prisma.marketingAsset.findUnique({ where: { id } });
  if (!item) return jsonError("Not found", 404);

  await prisma.marketingAsset.delete({ where: { id } });

  // delete file if uploaded
  if (item.filePath) {
    try {
      await unlink(item.filePath);
    } catch {
      // ignore
    }
  }

  return NextResponse.json({ ok: true });
}