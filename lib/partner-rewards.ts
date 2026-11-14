/**
 * CASADENZA Partner Rewards - proposed policy, subject to commercial approval.
 * Financial entitlement is never inferred from a portal order alone.
 * Production-only activation requires PAID invoice verification and a DB migration.
 */
export const REWARD_POINTS_PER_100_USD = 10;
export const REWARD_USD_CENTS_PER_POINT = 10; // One point = US$0.10
export const REWARD_MAX_REDEMPTION_POINTS = 10000;
export const REWARD_MAX_ORDER_DISCOUNT_PERCENT = 5;
export const REWARD_ACTIVITY = {
  TESTIMONIAL: { label: "Written testimonial", points: 100, maxPerYear: 2 },
  PROJECT_PHOTOS: { label: "Verified project photos", points: 300, maxPerYear: 5 },
  CASE_STUDY: { label: "Approved case study", points: 500, maxPerYear: 2 },
  WEBINAR: { label: "Attended Casadenza webinar", points: 50, maxPerYear: 6 },
  PROJECT_LEAD: { label: "Qualified new project lead", points: 100, maxPerYear: 10 },
} as const;
export type RewardActivityType = keyof typeof REWARD_ACTIVITY;
export type RewardRedemptionType = "DISCOUNT" | "SAMPLES";
export const REWARD_MILESTONES = [
  { usd: 10000, bonus: 100 },
  { usd: 25000, bonus: 300 },
  { usd: 50000, bonus: 700 },
  { usd: 100000, bonus: 1500 },
] as const;

export function rewardFeatureEnabled() {
  // A preview currently may share the Production database. Never mutate it here.
  return process.env.VERCEL_ENV === "production" && process.env.PARTNER_REWARDS_ENABLED === "true";
}
export function pointsForVerifiedUsdCents(cents: number) {
  if (!Number.isSafeInteger(cents) || cents <= 0) return 0;
  return Math.floor(cents / 1000);
}
export function yearlyMilestones(previousUsdCents: number, currentUsdCents: number) {
  return REWARD_MILESTONES.filter(m => previousUsdCents < m.usd * 100 && currentUsdCents >= m.usd * 100);
}
export function activityType(raw: unknown): RewardActivityType | null {
  return typeof raw === "string" && Object.prototype.hasOwnProperty.call(REWARD_ACTIVITY, raw)
    ? raw as RewardActivityType : null;
}
export function redemptionType(raw: unknown): RewardRedemptionType | null {
  return raw === "DISCOUNT" || raw === "SAMPLES" ? raw : null;
}
export function cleanShortText(raw: unknown, max: number) {
  if (typeof raw !== "string") return null;
  const value = raw.trim().replace(/[\u0000-\u001F]/g, " ");
  return value && value.length <= max ? value : null;
}
export function cleanEvidenceLink(raw: unknown) {
  if (!raw) return null;
  if (typeof raw !== "string" || raw.length > 900) return null;
  try {
    const url = new URL(raw.trim());
    return url.protocol === "https:" && url.username === "" && url.password === "" ? url.toString() : null;
  } catch { return null; }
}
export function rewardPolicyPublic() {
  return {
    pointsPer100Usd: REWARD_POINTS_PER_100_USD,
    usdCentsPerPoint: REWARD_USD_CENTS_PER_POINT,
    maxOrderDiscountPercent: REWARD_MAX_ORDER_DISCOUNT_PERCENT,
    maxRedemptionPoints: REWARD_MAX_REDEMPTION_POINTS,
    activity: REWARD_ACTIVITY,
    milestones: REWARD_MILESTONES,
    sampleShippingPaidByDistributor: true,
    pointsExpire: false,
    yearBasis: "Calendar year (UTC)",
    status: "Proposed policy - not activated",
  };
}
