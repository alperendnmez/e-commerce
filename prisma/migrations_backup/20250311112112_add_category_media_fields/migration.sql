-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "iconUrl" TEXT,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "mobileBannerUrl" TEXT,
ALTER COLUMN "customFilters" SET DATA TYPE TEXT,
ALTER COLUMN "featuredProducts" SET DATA TYPE TEXT;
