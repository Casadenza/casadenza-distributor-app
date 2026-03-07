import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";

export const runtime = "nodejs";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  const session = await getServerSession(); // ✅ MUST await
  if (!session) return jsonError("Unauthorized", 401);
  if (session.role !== "ADMIN") return jsonError("Forbidden", 403);

  const id = ctx.params.id;
  if (!id) return jsonError("Missing variant id", 400);

  const body = await req.json().catch(() => ({}));

  const data: any = {};
  if (body?.sizeLabel !== undefined) data.sizeLabel = String(body.sizeLabel || "").trim();
  if (body?.widthMm !== undefined) data.widthMm = body.widthMm === null ? null : Number(body.widthMm);
  if (body?.heightMm !== undefined) data.heightMm = body.heightMm === null ? null : Number(body.heightMm);
  if (body?.isActive !== undefined) data.isActive = !!body.isActive;

  if ("sizeLabel" in data && !data.sizeLabel) return jsonError("sizeLabel cannot be empty", 400);
  if ("widthMm" in data && data.widthMm !== null && !Number.isFinite(data.widthMm)) return jsonError("Invalid widthMm", 400);
  if ("heightMm" in data && data.heightMm !== null && !Number.isFinite(data.heightMm)) return jsonError("Invalid heightMm", 400);

  try {
    const updated = await prisma.productVariant.update({
      where: { id },
      data,
      select: {
        id: true,
        sizeLabel: true,
        widthMm: true,
        heightMm: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ ok: true, variant: updated });
  } catch (e: any) {
    // Unique constraint (productId + sizeLabel) could hit here too
    if (e?.code === "P2002") return jsonError("Duplicate sizeLabel for this product.", 409);
    return jsonError(e?.message || "Update failed", 400);
  }
}

export async function DELETE(req: Request, ctx: { params: { id: string } }) {
  const session = await getServerSession(); // ✅ MUST await
  if (!session) return jsonError("Unauthorized", 401);
  if (session.role !== "ADMIN") return jsonError("Forbidden", 403);

  const id = ctx.params.id;
  if (!id) return jsonError("Missing variant id", 400);

  try {
    await prisma.$transaction(async (tx) => {
      // ✅ delete linked prices first (safe)
      await tx.price.deleteMany({ where: { variantId: id } });

      // ✅ delete variant safely (no P2025)
      await tx.productVariant.deleteMany({ where: { id } });
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return jsonError(e?.message || "Delete failed", 400);
  }
}
