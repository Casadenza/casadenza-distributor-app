ALTER TABLE "Order" ADD COLUMN "emailNotificationState" TEXT NOT NULL DEFAULT 'NOT_SENT';
ALTER TABLE "Order" ADD COLUMN "emailNotificationRequestedAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "emailNotificationAdminSentAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "emailNotificationDistributorSentAt" TIMESTAMP(3);
