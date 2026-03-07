import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function requireAdmin() {
  const session = await getServerSession();
  if (!session) return { ok: false as const, res: jsonError("Unauthorized", 401) };
  if (session.role !== "ADMIN") return { ok: false as const, res: jsonError("Forbidden", 403) };
  return { ok: true as const, session };
}

// --- GET SINGLE DISTRIBUTOR ---
export async function GET(_: Request, ctx: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;

  const id = ctx.params.id;
  const distributor = await prisma.distributor.findUnique({ where: { id } });

  if (!distributor) return jsonError("Distributor not found", 404);
  return NextResponse.json({ ok: true, distributor });
}

// --- UPDATE DISTRIBUTOR (SYNC FIX) ---
export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;

  const id = ctx.params.id;
  const body = await req.json().catch(() => ({}));

  try {
    // Find linked userId (important for syncing User table)
    const existing = await prisma.distributor.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!existing) return jsonError("Distributor not found", 404);

    const email =
      body?.email !== undefined ? String(body.email || "").trim().toLowerCase() : undefined;

    const name =
      body?.name !== undefined ? String(body.name || "").trim() : undefined;

    // Distributor update data (do NOT force overwrite with undefined)
    const distData: any = {
      ...(name !== undefined ? { name } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(body?.country !== undefined ? { country: body.country } : {}),
      ...(body?.tier !== undefined ? { tier: body.tier } : {}),
      ...(body?.defaultCurrency !== undefined ? { defaultCurrency: body.defaultCurrency } : {}),
      ...(body?.phone !== undefined ? { phone: body.phone } : {}),
      ...(body?.billingName !== undefined ? { billingName: body.billingName } : {}),
      ...(body?.billingLine1 !== undefined ? { billingLine1: body.billingLine1 } : {}),
      ...(body?.billingLine2 !== undefined ? { billingLine2: body.billingLine2 } : {}),
      ...(body?.billingCity !== undefined ? { billingCity: body.billingCity } : {}),
      ...(body?.billingState !== undefined ? { billingState: body.billingState } : {}),
      ...(body?.billingZip !== undefined ? { billingZip: body.billingZip } : {}),
      ...(body?.billingCountry !== undefined ? { billingCountry: body.billingCountry } : {}),
    };

    const passwordProvided = Boolean(body?.password && String(body.password).length > 0);

    const result = await prisma.$transaction(async (tx) => {
      const updatedDistributor = await tx.distributor.update({
        where: { id },
        data: distData,
      });

      // ✅ Sync to User table (email + displayName)
      if (existing.userId) {
        const userData: any = {
          ...(email !== undefined ? { email } : {}),
          ...(name !== undefined ? { displayName: name } : {}),
        };

        if (passwordProvided) {
          const passwordHash = await bcrypt.hash(String(body.password), 10);
          userData.passwordHash = passwordHash;
          userData.forcePasswordReset = true;
        }

        if (Object.keys(userData).length > 0) {
          await tx.user.update({
            where: { id: existing.userId },
            data: userData,
          });
        }
      }

      return updatedDistributor;
    });

    return NextResponse.json({ ok: true, distributor: result });
  } catch (error: any) {
    return jsonError(error.message || "Update failed", 500);
  }
}

// --- DELETE DISTRIBUTOR (as-is) ---
export async function DELETE(req: Request, ctx: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;

  const id = ctx.params.id;

  try {
    const distributor = await prisma.distributor.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!distributor) {
      return jsonError("Distributor not found or already deleted", 404);
    }

    await prisma.$transaction(async (tx) => {
      await tx.distributor.delete({ where: { id } });

      if (distributor.userId) {
        await tx.user.delete({ where: { id: distributor.userId } });
      }
    });

    return NextResponse.json({ ok: true, message: "Deleted successfully" });
  } catch (error: any) {
    console.error("Delete Error:", error);
    if (error.code === "P2025") return jsonError("Record does not exist", 404);
    return jsonError(error.message || "Delete operation failed", 500);
  }
}