/*
  Warnings:

  - You are about to drop the column `applicableCategories` on the `Campaign` table. All the data in the column will be lost.
  - You are about to drop the column `applicableProducts` on the `Campaign` table. All the data in the column will be lost.
  - You are about to drop the column `maxUsageLimit` on the `Campaign` table. All the data in the column will be lost.
  - You are about to drop the column `minimumOrderAmount` on the `Campaign` table. All the data in the column will be lost.
  - You are about to drop the column `slug` on the `Campaign` table. All the data in the column will be lost.
  - You are about to drop the column `usageCount` on the `Campaign` table. All the data in the column will be lost.
  - The `value` column on the `Campaign` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- DropIndex
DROP INDEX "Campaign_slug_key";

-- AlterTable
ALTER TABLE "Campaign" DROP COLUMN "applicableCategories",
DROP COLUMN "applicableProducts",
DROP COLUMN "maxUsageLimit",
DROP COLUMN "minimumOrderAmount",
DROP COLUMN "slug",
DROP COLUMN "usageCount",
ADD COLUMN     "categoryId" INTEGER,
ADD COLUMN     "minOrderAmount" DOUBLE PRECISION,
ADD COLUMN     "productId" INTEGER,
ADD COLUMN     "userId" INTEGER,
DROP COLUMN "value",
ADD COLUMN     "value" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "SystemLog" ADD COLUMN     "metadata" TEXT;

-- CreateIndex
CREATE INDEX "Campaign_type_idx" ON "Campaign"("type");

-- CreateIndex
CREATE INDEX "Campaign_isActive_idx" ON "Campaign"("isActive");

-- CreateIndex
CREATE INDEX "Campaign_startDate_endDate_idx" ON "Campaign"("startDate", "endDate");

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
