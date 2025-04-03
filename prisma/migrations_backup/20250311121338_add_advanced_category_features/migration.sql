-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "allowedBrands" TEXT,
ADD COLUMN     "deliveryOptions" TEXT,
ADD COLUMN     "freeShipping" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "freeShippingThreshold" DOUBLE PRECISION,
ADD COLUMN     "paymentOptions" TEXT,
ADD COLUMN     "priceRanges" TEXT,
ADD COLUMN     "showOutOfStock" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "stockFilterEnabled" BOOLEAN NOT NULL DEFAULT true;
