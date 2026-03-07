import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";

export const runtime = "nodejs";

// ✅ 1. UPDATE PRODUCT (PATCH)
export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  const session = await getServerSession();
  
  // Admin Authorization check
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = ctx.params.id;
  if (!id) return NextResponse.json({ error: "Missing product id" }, { status: 400 });

  try {
    const body = await req.json();
    const data: any = {};
    
    // Frontend se bheje gaye fields ko map karna
    if (body.sku !== undefined) data.sku = String(body.sku).trim();
    if (body.name !== undefined) data.name = String(body.name).trim();
    
    // ✅ IMAGE UPDATE LOGIC: Local upload ke baad image URL yahan save hoga
    if (body.image !== undefined) {
      data.image = body.image ? String(body.image).trim() : null;
    }
    
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);

    const updated = await prisma.product.update({
      where: { id },
      data,
      select: { 
        id: true, 
        sku: true, 
        name: true, 
        image: true, 
        isActive: true, 
        thicknessMm: true, 
        collection: true, 
        stoneType: true 
      }
    });

    return NextResponse.json({ ok: true, product: updated });
  } catch (e: any) {
    console.error("Update Error:", e);
    return NextResponse.json({ error: e.message || "Failed to update product" }, { status: 400 });
  }
}

// ✅ 2. DELETE PRODUCT (DELETE)
export async function DELETE(req: Request, ctx: { params: { id: string } }) {
  const session = await getServerSession();
  
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = ctx.params.id;

  try {
    await prisma.$transaction(async (tx) => {
      // Variants find karein
      const variants = await tx.productVariant.findMany({
        where: { productId: id },
        select: { id: true }
      });
      const variantIds = variants.map(v => v.id);

      if (variantIds.length > 0) {
        // Variants se jude prices delete karein
        await tx.price.deleteMany({ where: { variantId: { in: variantIds } } });
        // Variants delete karein
        await tx.productVariant.deleteMany({ where: { productId: id } });
      }

      // Main product delete karein
      await tx.product.delete({ where: { id } });
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("Delete Error:", e);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 400 });
  }
}