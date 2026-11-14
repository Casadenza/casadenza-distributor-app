-- Casadenza Partner Rewards: schema only. Never execute on the shared Preview database.
-- No points or sales are imported by this migration.
CREATE TABLE "PartnerRewardsWallet" (
  "distributorId" TEXT NOT NULL,
  "balance" INTEGER NOT NULL DEFAULT 0,
  "lifetimeEarned" INTEGER NOT NULL DEFAULT 0,
  "lifetimeRedeemed" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PartnerRewardsWallet_pkey" PRIMARY KEY ("distributorId"),
  CONSTRAINT "PartnerRewardsWallet_nonnegative" CHECK ("balance" >= 0)
);
CREATE TABLE "PartnerRewardLedger" (
  "id" TEXT NOT NULL,
  "distributorId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "points" INTEGER NOT NULL,
  "sourceKey" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PartnerRewardLedger_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PartnerRewardLedger_nonzero" CHECK ("points" <> 0)
);
CREATE TABLE "PartnerRewardSubmission" (
  "id" TEXT NOT NULL,
  "distributorId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "evidenceUrl" TEXT,
  "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "awardedPoints" INTEGER NOT NULL DEFAULT 0,
  "reviewNote" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PartnerRewardSubmission_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PartnerRewardRedemption" (
  "id" TEXT NOT NULL,
  "distributorId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "points" INTEGER NOT NULL,
  "orderId" TEXT,
  "notes" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'REQUESTED',
  "reviewerNote" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PartnerRewardRedemption_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PartnerRewardRedemption_positive" CHECK ("points" > 0)
);
CREATE TABLE "PartnerRewardSale" (
  "id" TEXT NOT NULL,
  "distributorId" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "invoiceDate" TIMESTAMP(3) NOT NULL,
  "currency" TEXT NOT NULL,
  "netAmountCents" INTEGER NOT NULL,
  "pointsAwarded" INTEGER NOT NULL,
  "verifiedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PartnerRewardSale_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PartnerRewardSale_positive" CHECK ("netUsdCents" > 0)
);
CREATE UNIQUE INDEX "PartnerRewardLedger_sourceKey_key" ON "PartnerRewardLedger"("sourceKey");
CREATE INDEX "PartnerRewardLedger_distributorId_createdAt_idx" ON "PartnerRewardLedger"("distributorId", "createdAt");
CREATE UNIQUE INDEX "PartnerRewardSubmission_distributorId_type_reference_key" ON "PartnerRewardSubmission"("distributorId", "type", "reference");
CREATE INDEX "PartnerRewardSubmission_status_createdAt_idx" ON "PartnerRewardSubmission"("status", "createdAt");
CREATE INDEX "PartnerRewardRedemption_distributorId_status_createdAt_idx" ON "PartnerRewardRedemption"("distributorId", "status", "createdAt");
CREATE INDEX "PartnerRewardRedemption_status_createdAt_idx" ON "PartnerRewardRedemption"("status", "createdAt");
CREATE UNIQUE INDEX "PartnerRewardSale_distributorId_invoiceId_key" ON "PartnerRewardSale"("distributorId", "invoiceId");
CREATE INDEX "PartnerRewardSale_distributorId_invoiceDate_idx" ON "PartnerRewardSale"("distributorId", "invoiceDate");
ALTER TABLE "PartnerRewardsWallet" ADD CONSTRAINT "PartnerRewardsWallet_distributorId_fkey"
  FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PartnerRewardLedger" ADD CONSTRAINT "PartnerRewardLedger_distributorId_fkey"
  FOREIGN KEY ("distributorId") REFERENCES "PartnerRewardsWallet"("distributorId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PartnerRewardSubmission" ADD CONSTRAINT "PartnerRewardSubmission_distributorId_fkey"
  FOREIGN KEY ("distributorId") REFERENCES "PartnerRewardsWallet"("distributorId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PartnerRewardRedemption" ADD CONSTRAINT "PartnerRewardRedemption_distributorId_fkey"
  FOREIGN KEY ("distributorId") REFERENCES "PartnerRewardsWallet"("distributorId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PartnerRewardSale" ADD CONSTRAINT "PartnerRewardSale_distributorId_fkey"
  FOREIGN KEY ("distributorId") REFERENCES "PartnerRewardsWallet"("distributorId") ON DELETE CASCADE ON UPDATE CASCADE;
