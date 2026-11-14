-- Automated order and shipment intake only. Apply after reviewed release.
-- This migration does NOT create portal orders, publish attachments or modify customer documents.
CREATE TABLE "OperationsInboxItem" (
    "id" TEXT NOT NULL,
    "mailbox" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "filename" TEXT,
    "sender" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "snippet" TEXT,
    "receivedAt" TIMESTAMP(3),
    "kind" TEXT NOT NULL,
    "matchState" TEXT NOT NULL DEFAULT 'NEEDS_REVIEW',
    "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "suggestedOrderId" TEXT,
    "suggestedDistributorId" TEXT,
    "matchReason" TEXT NOT NULL,
    "attachedOrderId" TEXT,
    "attachedDocumentId" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OperationsInboxItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OperationsInboxItem_mailbox_messageId_partId_key" ON "OperationsInboxItem"("mailbox","messageId","partId");
CREATE INDEX "OperationsInboxItem_reviewStatus_receivedAt_idx" ON "OperationsInboxItem"("reviewStatus","receivedAt");
CREATE INDEX "OperationsInboxItem_suggestedDistributorId_reviewStatus_idx" ON "OperationsInboxItem"("suggestedDistributorId","reviewStatus");
CREATE INDEX "OperationsInboxItem_receivedAt_idx" ON "OperationsInboxItem"("receivedAt");
CREATE TABLE "OperationsInboxScanRun" (
    "id" TEXT NOT NULL,
    "scheduledSlot" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "infoStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "alexStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "messagesScanned" INTEGER NOT NULL DEFAULT 0,
    "itemsAdded" INTEGER NOT NULL DEFAULT 0,
    "errorSummary" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "OperationsInboxScanRun_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OperationsInboxScanRun_scheduledSlot_key" ON "OperationsInboxScanRun"("scheduledSlot");
CREATE INDEX "OperationsInboxScanRun_startedAt_idx" ON "OperationsInboxScanRun"("startedAt");
