-- AlterTable
ALTER TABLE "User" ADD COLUMN     "kvkkAgreementAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "userAgreementAccepted" BOOLEAN NOT NULL DEFAULT false;
