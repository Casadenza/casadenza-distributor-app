import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";

export const runtime = "nodejs";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function norm(v: any) {
  return String(v ?? "").trim();
}

async function nextUniqueLabel(productId: string, base: string) {
  // base = "NEW" etc
  const existing = await prisma.productVariant.findMany({
    where: { productId, sizeLabel: { startsWith: base } },
    select: { sizeLabel: true },
    take: 5000,
  });

  const set = new Set(existing.map((x) => x.sizeLabel));
  if (!set.has(base)) return base;

  // NEW-2, NEW-3...
  let i = 2;
  while (set.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

export async function GET(req: Request, ctx: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (session.role !== "ADMIN") return jsonError("Forbidden", 403);

  const productId = ctx.params.id;
  if (!productId) return jsonError("Missing product id");

  const variants = await prisma.productVariant.findMany({
    where: { productId },
    orderBy: [{ sizeLabel: "asc" }],
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

  return NextResponse.json({ ok: true, variants });
}

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (session.role !== "ADMIN") return jsonError("Forbidden", 403);

  const productId = ctx.params.id;
  if (!productId) return jsonError("Missing product id");

  const body = await req.json().catch(() => ({}));

  let sizeLabel = norm(body?.sizeLabel);
  const widthMm =
    body?.widthMm === null || body?.widthMm === undefined ? null : Number(body.widthMm);
  const heightMm =
    body?.heightMm === null || body?.heightMm === undefined ? null : Number(body.heightMm);
  const isActive = body?.isActive === undefined ? true : !!body.isActive;

  if (widthMm !== null && !Number.isFinite(widthMm)) return jsonError("Invalid widthMm");
  if (heightMm !== null && !Number.isFinite(heightMm)) return jsonError("Invalid heightMm");

  // ✅ If UI sends empty or "NEW", we keep but ensure unique
  if (!sizeLabel) sizeLabel = "NEW";

  // ✅ Ensure unique per product (productId + sizeLabel)
  sizeLabel = await nextUniqueLabel(productId, sizeLabel);

  try {
    const created = await prisma.productVariant.create({
      data: { productId, sizeLabel, widthMm, heightMm, isActive },
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

    return NextResponse.json({ ok: true, variant: created });
  } catch (e: any) {
    // In case of rare race condition (double click same millisecond), try once more
    if (e?.code === "P2002") {
      const retryLabel = await nextUniqueLabel(productId, sizeLabel);
      const created = await prisma.productVariant.create({
        data: { productId, sizeLabel: retryLabel, widthMm, heightMm, isActive },
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
      return NextResponse.json({ ok: true, variant: created });
    }

    return jsonError(e?.message || "Create failed", 400);
  }
}

// ✅ EXISTING GET aur POST ke niche ye add karein:

export async function PATCH(req: Request) {
  const session = await getServerSession();
  if (!session || session.role !== "ADMIN") return jsonError("Forbidden", 403);

  try {
    const body = await req.json();
    const { id, ...data } = body; // id body se aayegi

    const updated = await prisma.productVariant.update({
      where: { id },
      data: {
        sizeLabel: data.sizeLabel,
        widthMm: data.widthMm,
        heightMm: data.heightMm,
        isActive: data.isActive
      }
    });

    return NextResponse.json({ ok: true, variant: updated });
  } catch (e: any) {
    return jsonError(e.message || "Update failed", 500);
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession();
  if (!session || session.role !== "ADMIN") return jsonError("Forbidden", 403);

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return jsonError("Missing variant ID", 400);

  try {
    await prisma.productVariant.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return jsonError(e.message || "Delete failed", 500);
  }
}