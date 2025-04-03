-- AlterTable
ALTER TABLE "Brand" ADD COLUMN     "bannerUrl" TEXT,
ADD COLUMN     "coverImageUrl" TEXT,
ADD COLUMN     "defaultSortOrder" TEXT,
ADD COLUMN     "productListingType" TEXT,
ADD COLUMN     "productsPerPage" INTEGER NOT NULL DEFAULT 12,
ADD COLUMN     "showInFooter" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "showInHeader" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showInSidebar" BOOLEAN NOT NULL DEFAULT true;
