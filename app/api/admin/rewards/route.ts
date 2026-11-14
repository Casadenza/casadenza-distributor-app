import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/communication-access";
import {
  rewardFeatureEnabled, rewardPolicyPublic, REWARD_ACTIVITY, REWARD_SALES_THRESHOLD,
  activityType, rewardSalesCurrency, cleanShortText, pointsForQualifiedSales, yearlyMilestones,
} from "@/lib/partner-rewards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const out = (data: object, status = 200) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });

export async function GET() {
  const session = await getServerSession();
  if (!session || session.role !== "ADMIN") return out({ error: "Forbidden" }, 403);
  if (!rewardFeatureEnabled()) return out({
    ok: true, enabled: false, policy: rewardPolicyPublic(),
    pendingSubmissions: [], pendingRedemptions: [], recentSales: [],
  });
  try {
    const [pendingSubmissions, pendingRedemptions, recentSales] = await Promise.all([
      prisma.partnerRewardSubmission.findMany({
        where: { status: "PENDING" }, orderBy: { createdAt: "asc" }, take: 100,
        include: { wallet: { select: { distributor: { select: { name: true, country: true } } } } },
      }),
      prisma.partnerRewardRedemption.findMany({
        where: { status: "REQUESTED" }, orderBy: { createdAt: "asc" }, take: 100,
        include: { wallet: { select: { distributor: { select: { name: true, country: true } } } } },
      }),
      prisma.partnerRewardSale.findMany({
        orderBy: { createdAt: "desc" }, take: 40,
        include: { wallet: { select: { distributor: { select: { name: true } } } } },
      }),
    ]);
    return out({ ok: true, enabled: true, policy: rewardPolicyPublic(),
      pendingSubmissions, pendingRedemptions, recentSales });
  } catch {
    return out({ error: "Rewards tables are not available; do not enable before reviewed migration." }, 503);
  }
}

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session || session.role !== "ADMIN" || !session.userId) return out({ error: "Forbidden" }, 403);
  if (!isSameOrigin(req)) return out({ error: "Invalid origin" }, 403);
  if (!rewardFeatureEnabled()) return out({ error: "Partner Rewards not active. No Preview database writes permitted." }, 403);
  const rate = checkRateLimit("admin-rewards:" + session.userId + ":" + getClientIp(req), 20, 60000);
  if (!rate.ok) return out({ error: "Too many requests" }, 429);
  const body = await req.json().catch(() => null);
  const action = body?.action;
  const reviewNote = cleanShortText(body?.reviewNote, 500) || "Reviewed by Casadenza Admin";

  if (action === "APPROVE_ACTIVITY" || action === "REJECT_ACTIVITY") {
    const id = cleanShortText(body?.id, 120);
    if (!id) return out({ error: "Activity ID required" }, 400);
    try {
      const result = await prisma.$transaction(async tx => {
        const submission = await tx.partnerRewardSubmission.findUnique({
          where: { id }, select: { distributorId: true, type: true, reference: true, status: true, marketingConsent: true, createdAt: true },
        });
        if (!submission || submission.status !== "PENDING") throw new Error("NOT_PENDING");
        const type = activityType(submission.type);
        if (!type) throw new Error("UNKNOWN_TYPE");
        if (type === "CASE_STUDY" && !submission.marketingConsent) throw new Error("CONSENT_REQUIRED");
        if (action === "APPROVE_ACTIVITY") {
          const year = submission.createdAt.getUTCFullYear();
          const approved = await tx.partnerRewardSubmission.count({
            where: { distributorId: submission.distributorId, type, status: "APPROVED",
              createdAt: { gte: new Date(Date.UTC(year,0,1)), lt: new Date(Date.UTC(year+1,0,1)) } },
          });
          if (approved >= REWARD_ACTIVITY[type].maxPerYear) throw new Error("ANNUAL_LIMIT");
        }
        const claimed = await tx.partnerRewardSubmission.updateMany({
          where: { id, status: "PENDING" },
          data: { status: action === "APPROVE_ACTIVITY" ? "APPROVED" : "REJECTED",
            awardedPoints: action === "APPROVE_ACTIVITY" ? REWARD_ACTIVITY[type].points : 0,
            reviewNote, reviewedAt: new Date() },
        });
        if (claimed.count !== 1) throw new Error("NOT_PENDING");
        if (action === "APPROVE_ACTIVITY") {
          const earned = REWARD_ACTIVITY[type].points;
          await tx.partnerRewardsWallet.update({
            where: { distributorId: submission.distributorId },
            data: { balance: { increment: earned }, lifetimeEarned: { increment: earned } },
          });
          await tx.partnerRewardLedger.create({
            data: { distributorId: submission.distributorId, kind: "ACTIVITY",
              points: earned, sourceKey: "activity:" + id,
              description: REWARD_ACTIVITY[type].label + " — " + submission.reference },
          });
        }
        return action === "APPROVE_ACTIVITY" ? REWARD_ACTIVITY[type].points : 0;
      }, { isolationLevel: "Serializable", timeout: 15000 });
      return out({ ok: true, action, pointsAwarded: result });
    } catch (e: any) {
      if (e?.message === "NOT_PENDING") return out({ error: "Activity already reviewed" }, 409);
      if (e?.message === "CONSENT_REQUIRED") return out({ error: "Case studies need permission to publish" }, 409);
      if (e?.message === "ANNUAL_LIMIT") return out({ error: "Annual activity limit already reached" }, 409);
      if (e?.code === "P2002" || e?.code === "P2034") return out({ error: "Duplicate or concurrent review; refresh and try again" }, 409);
      return out({ error: "Unable to review activity" }, 503);
    }
  }

  if (action === "FULFILL_REDEMPTION" || action === "REJECT_REDEMPTION") {
    const id = cleanShortText(body?.id, 120);
    if (!id) return out({ error: "Redemption ID required" }, 400);
    if (action === "FULFILL_REDEMPTION" && body?.fulfilledExternally !== true) {
      return out({ error: "Confirm that the approved discount or sample allocation has been fulfilled in the order process" }, 400);
    }
    try {
      const redemption = await prisma.$transaction(async tx => {
        const item = await tx.partnerRewardRedemption.findUnique({
          where: { id }, select: { distributorId: true, points: true, status: true, type: true },
        });
        if (!item || item.status !== "REQUESTED") throw new Error("NOT_PENDING");
        const update = await tx.partnerRewardRedemption.updateMany({
          where: { id, status: "REQUESTED" },
          data: { status: action === "FULFILL_REDEMPTION" ? "FULFILLED" : "REJECTED",
            reviewerNote: reviewNote, reviewedAt: new Date() },
        });
        if (update.count !== 1) throw new Error("NOT_PENDING");
        if (action === "FULFILL_REDEMPTION") {
          await tx.partnerRewardsWallet.update({
            where: { distributorId: item.distributorId },
            data: { lifetimeRedeemed: { increment: item.points } },
          });
        } else {
          await tx.partnerRewardsWallet.update({
            where: { distributorId: item.distributorId },
            data: { balance: { increment: item.points } },
          });
          await tx.partnerRewardLedger.create({
            data: { distributorId: item.distributorId, kind: "REDEMPTION_REFUND",
              points: item.points, sourceKey: "redemption-refund:" + id,
              description: "Rejected redemption; reserved points returned" },
          });
        }
        return item;
      }, { isolationLevel: "Serializable", timeout: 15000 });
      return out({ ok: true, action, points: redemption.points,
        note: action === "REJECT_REDEMPTION" ? "Reserved points restored" : "Redemption marked fulfilled" });
    } catch (e: any) {
      if (e?.message === "NOT_PENDING") return out({ error: "Redemption already reviewed" }, 409);
      return out({ error: "Unable to review redemption" }, 503);
    }
  }

  if (action === "CREDIT_PAID_INVOICE") {
    const distributorId = cleanShortText(body?.distributorId, 120);
    const invoiceId = cleanShortText(body?.invoiceId, 120);
    const currency = rewardSalesCurrency(body?.currency);
    const amount = Number(body?.netAmount);
    const amountCents = Math.round(amount * 100);
    const date = typeof body?.invoiceDate === "string" ? new Date(body.invoiceDate + "T00:00:00.000Z") : new Date("");
    if (!distributorId || !invoiceId || invoiceId.length < 4 || !currency ||
      !Number.isSafeInteger(amountCents) || amountCents <= 0 || amountCents > 500000000 ||
      !Number.isFinite(date.getTime()) || date > new Date() || date.getUTCFullYear() < 2024) {
      return out({ error: "Valid distributor, exact paid invoice ID, USD/EUR net merchandise amount, and invoice date required" }, 400);
    }
    if (body?.verifiedPaid !== true || body?.zohoInvoiceVerified !== true) {
      return out({ error: "Explicit paid-status and Zoho invoice/credit-note verification required" }, 400);
    }
    try {
      const result = await prisma.$transaction(async tx => {
        const distributor = await tx.distributor.findUnique({ where: { id: distributorId }, select: { id: true } });
        if (!distributor) throw new Error("UNKNOWN_DISTRIBUTOR");
        await tx.partnerRewardsWallet.upsert({
          where: { distributorId }, create: { distributorId }, update: {},
        });
        const year = date.getUTCFullYear();
        const prior = await tx.partnerRewardSale.aggregate({
          where: { distributorId, currency,
            invoiceDate: { gte: new Date(Date.UTC(year,0,1)), lt: new Date(Date.UTC(year+1,0,1)) } },
          _sum: { netAmountCents: true },
        });
        const earlierCents = prior._sum.netAmountCents || 0;
        const salePoints = pointsForQualifiedSales(earlierCents, amountCents);
        const milestones = yearlyMilestones(earlierCents, earlierCents + amountCents);
        const bonusPoints = milestones.reduce((a,b)=>a+b.bonus,0);
        await tx.partnerRewardSale.create({
          data: { distributorId, invoiceId, invoiceDate: date, currency,
            netAmountCents: amountCents, pointsAwarded: salePoints + bonusPoints, verifiedBy: session.userId },
        });
        const ledgerEntries = [
          ...(salePoints>0 ? [{
            distributorId, kind:"VERIFIED_SALE",points:salePoints,
            sourceKey:"paid-invoice:"+distributorId+":"+invoiceId,
            description:"Verified "+currency+" paid invoice "+invoiceId+"; annual threshold "+REWARD_SALES_THRESHOLD,
          }] : []),
          ...milestones.map(m=>({
            distributorId,kind:"ANNUAL_MILESTONE",points:m.bonus,
            sourceKey:"milestone:"+distributorId+":"+year+":"+currency+":"+m.amount,
            description:currency+" "+m.amount.toLocaleString("en-US")+" annual verified sales milestone",
          })),
        ];
        if (ledgerEntries.length) await tx.partnerRewardLedger.createMany({data:ledgerEntries});
        if (salePoints+bonusPoints>0) await tx.partnerRewardsWallet.update({
          where: { distributorId },
          data: { balance: { increment: salePoints+bonusPoints },
            lifetimeEarned: { increment: salePoints+bonusPoints } },
        });
        return {
          previousAnnualSales: earlierCents / 100, newAnnualSales: (earlierCents + amountCents) / 100,
          currency, salePoints, bonusPoints, awarded: salePoints+bonusPoints,
        };
      }, { isolationLevel: "Serializable", timeout: 15000 });
      return out({ ok: true, ...result, note: "Paid verified invoice recorded; points only on value above the annual currency threshold" },201);
    } catch (e: any) {
      if (e?.message === "UNKNOWN_DISTRIBUTOR") return out({ error: "Distributor not found" }, 404);
      if (e?.code === "P2002") return out({ error: "Invoice already credited or milestone duplicate; refresh." }, 409);
      if (e?.code === "P2034") return out({ error: "Concurrent invoice credit; retry after refreshing." }, 409);
      return out({ error: "Unable to verify invoice. Confirm database schema and Zoho details." }, 503);
    }
  }

  return out({ error: "Unsupported rewards administration action" },400);
}
