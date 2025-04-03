-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "allowProductComparison" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "compareAttributes" TEXT,
ADD COLUMN     "customAttributes" TEXT,
ADD COLUMN     "maxCompareProducts" INTEGER NOT NULL DEFAULT 4;
