CREATE TABLE "GmailMailboxConnection" (
  "mailbox" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "encryptedRefreshToken" TEXT NOT NULL,
  "connectedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GmailMailboxConnection_pkey" PRIMARY KEY ("mailbox")
);
