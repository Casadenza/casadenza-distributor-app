CREATE TABLE "CommunicationThread" (
    "id" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "orderId" TEXT,
    "subject" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommunicationThread_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CommunicationMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderUserId" TEXT,
    "senderRole" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readByAdminAt" TIMESTAMP(3),
    "readByDistributorAt" TIMESTAMP(3),
    "notificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "notificationSentAt" TIMESTAMP(3),
    "notificationError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommunicationMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CommunicationThread_distributorId_lastMessageAt_idx" ON "CommunicationThread"("distributorId", "lastMessageAt");
CREATE INDEX "CommunicationThread_orderId_idx" ON "CommunicationThread"("orderId");
CREATE INDEX "CommunicationMessage_threadId_createdAt_idx" ON "CommunicationMessage"("threadId", "createdAt");
CREATE INDEX "CommunicationMessage_senderUserId_idx" ON "CommunicationMessage"("senderUserId");
ALTER TABLE "CommunicationThread" ADD CONSTRAINT "CommunicationThread_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunicationThread" ADD CONSTRAINT "CommunicationThread_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommunicationMessage" ADD CONSTRAINT "CommunicationMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "CommunicationThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunicationMessage" ADD CONSTRAINT "CommunicationMessage_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
