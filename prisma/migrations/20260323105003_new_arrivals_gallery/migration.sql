/*
  Warnings:

  - You are about to drop the `AdminPermission` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "AdminPermission" DROP CONSTRAINT "AdminPermission_userId_fkey";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "galleryJson" TEXT,
ADD COLUMN     "isNewArrival" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "newArrivalPriority" INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "AdminPermission";
