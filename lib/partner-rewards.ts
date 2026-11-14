/**
 * Casadenza Partner Rewards - PROPOSED, NOT LIVE.
 * Sales reward qualification is strictly > 50,000 USD or EUR paid-net annually.
 * Each currency tracked independently, without undisclosed FX conversion.
 * Only net amount exceeding the relevant currency threshold earns purchase points.
 * Non-sales activities may earn separately after review.
 */
export const REWARD_SALES_THRESHOLD = 50000;
export const REWARD_ALLOWED_CURRENCIES = ["USD", "EUR"] as const;
export type RewardSalesCurrency = typeof REWARD_ALLOWED_CURRENCIES[number];
export const REWARD_POINTS_PER_100_CURRENCY = 10;
export const REWARD_USD_CENTS_PER_POINT = 10; // One point redeems for US$0.10.
export const REWARD_MAX_REDEMPTION_POINTS = 10000;
export const REWARD_MAX_ORDER_DISCOUNT_PERCENT = 5;
export const REWARD_ACTIVITY = {
  TESTIMONIAL: { label: "Approved written testimonial", points: 100, maxPerYear: 2 },
  PROJECT_PHOTOS: { label: "Verified installation/project photos", points: 300, maxPerYear: 5 },
  CASE_STUDY: { label: "Published project case study", points: 500, maxPerYear: 2 },
  WEBINAR: { label: "Attended Casadenza webinar", points: 50, maxPerYear: 6 },
  TRAINING_SEMINAR: { label: "Attended Casadenza training seminar", points: 75, maxPerYear: 6 },
  PROJECT_LEAD: { label: "Qualified project referral", points: 100, maxPerYear: 10 },
} as const;
export type RewardActivityType = keyof typeof REWARD_ACTIVITY;
export type RewardRedemptionType = "DISCOUNT" | "SAMPLES";
// Milestones start AFTER the qualification threshold; no earlier $10k milestone.
export const REWARD_MILESTONES = [
  { amount: 75000, bonus: 300 },
  { amount: 100000, bonus: 700 },
  { amount: 200000, bonus: 1500 },
] as const;

export function rewardFeatureEnabled() {
  // Preview currently shares the production DB. Never mutate in Preview.
  return process.env.VERCEL_ENV === "production" && process.env.PARTNER_REWARDS_ENABLED === "true";
}
export function rewardSalesCurrency(raw: unknown): RewardSalesCurrency | null {
  return raw === "USD" || raw === "EUR" ? raw : null;
}
export function pointsForQualifiedSales(previousAnnualCents: number, currentSaleCents: number) {
  // Only paid net sales strictly in excess of 50,000 currency units are rewarded.
  if (!Number.isSafeInteger(previousAnnualCents) || !Number.isSafeInteger(currentSaleCents) ||
      previousAnnualCents < 0 || currentSaleCents <= 0) return 0;
  const qualifyingBefore = Math.max(0, previousAnnualCents - REWARD_SALES_THRESHOLD * 100);
  const qualifyingAfter = Math.max(0, previousAnnualCents + currentSaleCents - REWARD_SALES_THRESHOLD * 100);
  return Math.floor(qualifyingAfter / 1000) - Math.floor(qualifyingBefore / 1000);
}
export function yearlyMilestones(previousAnnualCents: number, currentAnnualCents: number) {
  return REWARD_MILESTONES.filter(m => previousAnnualCents < m.amount * 100 && currentAnnualCents >= m.amount * 100);
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
    salesThreshold: { USD: REWARD_SALES_THRESHOLD, EUR: REWARD_SALES_THRESHOLD },
    pointsPer100CurrencyAboveThreshold: REWARD_POINTS_PER_100_CURRENCY,
    usdCentsPerPoint: REWARD_USD_CENTS_PER_POINT,
    maxOrderDiscountPercent: REWARD_MAX_ORDER_DISCOUNT_PERCENT,
    maxRedemptionPoints: REWARD_MAX_REDEMPTION_POINTS,
    activity: REWARD_ACTIVITY,
    milestones: REWARD_MILESTONES,
    sampleShippingPaidByDistributor: true,
    pointsExpire: false,
    annualSalesCalculation: "Paid verified invoice net sales, excluding tax, shipping and refunded amounts",
    currencyRule: "USD and EUR tracked separately, not automatically combined",
    yearBasis: "Calendar year (UTC)",
    status: "Proposed policy - not activated",
  };
}
