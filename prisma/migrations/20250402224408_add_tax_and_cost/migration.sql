-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "costPerItem" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "taxIncluded" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN     "costPerItem" DOUBLE PRECISION DEFAULT 0;
