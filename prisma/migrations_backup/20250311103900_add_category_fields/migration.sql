-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "bannerUrl" TEXT,
ADD COLUMN     "customFilters" JSONB,
ADD COLUMN     "defaultSortOrder" TEXT,
ADD COLUMN     "featuredProducts" JSONB,
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "productsPerPage" INTEGER NOT NULL DEFAULT 12,
ADD COLUMN     "seoKeywords" TEXT,
ADD COLUMN     "showInFooter" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "showInHeader" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "showInSidebar" BOOLEAN NOT NULL DEFAULT true;
