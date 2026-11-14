import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/communication-access";
import {
  rewardFeatureEnabled, rewardPolicyPublic, REWARD_ACTIVITY,
  activityType, redemptionType, cleanShortText, cleanEvidenceLink,
  REWARD_MAX_ORDER_DISCOUNT_PERCENT, REWARD_MAX_REDEMPTION_POINTS,
} from "@/lib/partner-rewards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const out = (data: object, status = 200) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });

export async function GET() {
  const session = await getServerSession();
  if (!session || session.role !== "DISTRIBUTOR" || !session.distributorId) return out({ error: "Forbidden" }, 403);
  const policy = rewardPolicyPublic();
  if (!rewardFeatureEnabled()) return out({ ok: true, enabled: false, policy,
    wallet: { balance: 0, lifetimeEarned: 0, lifetimeRedeemed: 0 },
    annualSalesUsd: 0, ledger: [], submissions: [], redemptions: [] });
  try {
    const distributorId = session.distributorId;
    const year = new Date().getUTCFullYear();
    const [wallet, annual, ledger, submissions, redemptions] = await Promise.all([
      prisma.partnerRewardsWallet.findUnique({ where: { distributorId } }),
      prisma.partnerRewardSale.aggregate({
        where: { distributorId, invoiceDate: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) } },
        _sum: { netUsdCents: true },
      }),
      prisma.partnerRewardLedger.findMany({ where: { distributorId }, orderBy: { createdAt: "desc" }, take: 50 }),
      prisma.partnerRewardSubmission.findMany({ where: { distributorId }, orderBy: { createdAt: "desc" }, take: 50 }),
      prisma.partnerRewardRedemption.findMany({ where: { distributorId }, orderBy: { createdAt: "desc" }, take: 50 }),
    ]);
    return out({ ok: true, enabled: true, policy,
      wallet: wallet || { balance: 0, lifetimeEarned: 0, lifetimeRedeemed: 0 },
      annualSalesUsd: (annual._sum.netUsdCents || 0) / 100,
      ledger, submissions, redemptions,
    });
  } catch {
    return out({ error: "Rewards data is not available. Apply the reviewed migration before activating." }, 503);
  }
}

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session || session.role !== "DISTRIBUTOR" || !session.distributorId) return out({ error: "Forbidden" }, 403);
  if (!isSameOrigin(req)) return out({ error: "Invalid origin" }, 403);
  if (!rewardFeatureEnabled()) return out({ error: "Partner Rewards is not active. Preview is read-only." }, 403);
  const rate = checkRateLimit("partner-rewards:" + session.distributorId + ":" + getClientIp(req), 8, 60000);
  if (!rate.ok) return out({ error: "Too many requests" }, 429);
  const body = await req.json().catch(() => null);
  const distributorId = session.distributorId;

  if (body?.action === "SUBMIT_ACTIVITY") {
    const type = activityType(body.type);
    const reference = cleanShortText(body.reference, 120)?.toLowerCase().replace(/\s+/g, " ");
    const description = cleanShortText(body.description, 1500);
    const evidenceUrl = cleanEvidenceLink(body.evidenceUrl);
    if (!type || !reference || !description || reference.length < 3 || description.length < 15) {
      return out({ error: "Activity, unique project/event reference, and description (15+ characters) required" }, 400);
    }
    if ((type === "PROJECT_PHOTOS" || type === "CASE_STUDY") && !evidenceUrl) {
      return out({ error: "A secure project photo/case-study evidence link is required" }, 400);
    }
    if (body.evidenceUrl && !evidenceUrl) return out({ error: "Evidence link must be an HTTPS URL" }, 400);
    try {
      const submission = await prisma.$transaction(async tx => {
        await tx.partnerRewardsWallet.upsert({ where: { distributorId }, create: { distributorId }, update: {} });
        const year = new Date().getUTCFullYear();
        const already = await tx.partnerRewardSubmission.count({
          where: { distributorId, type, status: { in: ["PENDING", "APPROVED"] },
            createdAt: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) } },
        });
        if (already >= REWARD_ACTIVITY[type].maxPerYear) throw new Error("ACTIVITY_LIMIT");
        return tx.partnerRewardSubmission.create({
          data: { distributorId, type, reference, description, evidenceUrl,
            marketingConsent: body.marketingConsent === true },
        });
      });
      return out({ ok: true, submissionId: submission.id, status: "PENDING", earnedPoints: 0,
        message: "Submitted for review. Points are awarded only after Casadenza approval." }, 201);
    } catch (err: any) {
      if (err?.code === "P2002") return out({ error: "This activity/reference has already been submitted." }, 409);
      if (err?.message === "ACTIVITY_LIMIT") return out({ error: "Annual limit for this activity has been reached." }, 409);
      return out({ error: "Unable to submit activity." }, 503);
    }
  }

  if (body?.action === "REDEEM") {
    const type = redemptionType(body.type);
    const points = Number(body.points);
    const notes = cleanShortText(body.notes, 600);
    const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
    if (!type || !Number.isSafeInteger(points) || points < 100 || points > REWARD_MAX_REDEMPTION_POINTS || !notes || notes.length < 12) {
      return out({ error: "Select reward type, 100-10,000 points, and a detailed request." }, 400);
    }
    if (type === "SAMPLES" && body.sampleShippingAccepted !== true) {
      return out({ error: "You must confirm that all sample shipping costs are payable by the distributor." }, 400);
    }
    if (type === "DISCOUNT") {
      if (!orderId) return out({ error: "Select an existing distributor order for a discount request." }, 400);
      const order = await prisma.order.findUnique({
        where: { id: orderId }, select: { distributorId: true, status: true, notes: true, items: { select: { qty: true, unitPrice: true } } },
      });
      if (!order || order.distributorId !== distributorId || ["DELIVERED", "CANCELLED"].includes(order.status)) {
        return out({ error: "Order does not belong to you or cannot accept a new discount." }, 403);
      }
      let currency = "";
      try { currency = String(JSON.parse(order.notes || "{}").currency || "").toUpperCase(); } catch {}
      if (currency !== "USD") return out({ error: "For non-USD orders, please contact Casadenza for a manually converted discount quotation." }, 400);
      const merchandiseTotal = order.items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0);
      const discountUsd = points / 10;
      if (merchandiseTotal <= 0 || discountUsd > merchandiseTotal * REWARD_MAX_ORDER_DISCOUNT_PERCENT / 100) {
        return out({ error: "Requested points exceed the 5% merchandise-only discount cap for this order." }, 400);
      }
    }
    const requestId = typeof body.requestId === "string" && /^[0-9a-f-]{36}$/i.test(body.requestId)
      ? body.requestId : randomUUID();
    try {
      const redemption = await prisma.$transaction(async tx => {
        await tx.partnerRewardsWallet.upsert({ where: { distributorId }, create: { distributorId }, update: {} });
        const existing = await tx.partnerRewardRedemption.findUnique({ where: { id: requestId } });
        if (existing) throw new Error("DUPLICATE_REQUEST");
        const reserve = await tx.partnerRewardsWallet.updateMany({
          where: { distributorId, balance: { gte: points } },
          data: { balance: { decrement: points } },
        });
        if (reserve.count !== 1) throw new Error("NOT_ENOUGH_POINTS");
        const redemption = await tx.partnerRewardRedemption.create({
          data: { id: requestId, distributorId, type, points, notes,
            orderId: type === "DISCOUNT" ? orderId : null },
        });
        await tx.partnerRewardLedger.create({
          data: { distributorId, points: -points, kind: "REDEMPTION_RESERVED",
            sourceKey: "redemption:" + requestId,
            description: type === "SAMPLES" ? "Sample material redemption pending; shipping payable by distributor"
              : "Order discount redemption pending admin approval" },
        });
        return redemption;
      });
      return out({ ok: true, redemptionId: redemption.id, status: "REQUESTED",
        note: "Points reserved; no discount or sample has yet been issued. Distributor pays sample shipping." }, 201);
    } catch (err: any) {
      if (err?.message === "NOT_ENOUGH_POINTS") return out({ error: "Insufficient available points." }, 409);
      if (err?.message === "DUPLICATE_REQUEST" || err?.code === "P2002") return out({ error: "Request already recorded. Please refresh before retrying." }, 409);
      return out({ error: "Unable to request redemption. Please check your points history." }, 503);
    }
  }
  return out({ error: "Unsupported rewards action" }, 400);
}
