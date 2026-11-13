ALTER TABLE "Distributor" ADD COLUMN "zohoAccountId" TEXT;
CREATE UNIQUE INDEX "Distributor_zohoAccountId_key" ON "Distributor"("zohoAccountId");
