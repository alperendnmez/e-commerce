/*
  Warnings:

  - Added the required column `billingAddress` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shippingAddress` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "billingAddress" TEXT NOT NULL,
ADD COLUMN     "shippingAddress" TEXT NOT NULL;
