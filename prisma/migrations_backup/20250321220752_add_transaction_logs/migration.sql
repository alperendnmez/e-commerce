-- CreateTable
CREATE TABLE "TransactionLog" (
    "id" SERIAL NOT NULL,
    "transactionType" TEXT NOT NULL,
    "entityId" INTEGER NOT NULL,
    "entityCode" TEXT,
    "status" TEXT NOT NULL,
    "orderId" INTEGER,
    "userId" INTEGER,
    "amount" DOUBLE PRECISION,
    "idempotencyKey" TEXT,
    "description" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransactionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TransactionLog_transactionType_idx" ON "TransactionLog"("transactionType");

-- CreateIndex
CREATE INDEX "TransactionLog_entityId_idx" ON "TransactionLog"("entityId");

-- CreateIndex
CREATE INDEX "TransactionLog_entityCode_idx" ON "TransactionLog"("entityCode");

-- CreateIndex
CREATE INDEX "TransactionLog_status_idx" ON "TransactionLog"("status");

-- CreateIndex
CREATE INDEX "TransactionLog_orderId_idx" ON "TransactionLog"("orderId");

-- CreateIndex
CREATE INDEX "TransactionLog_userId_idx" ON "TransactionLog"("userId");

-- CreateIndex
CREATE INDEX "TransactionLog_createdAt_idx" ON "TransactionLog"("createdAt");

-- CreateIndex
CREATE INDEX "TransactionLog_idempotencyKey_idx" ON "TransactionLog"("idempotencyKey");

-- AddForeignKey
ALTER TABLE "GiftCardTransaction" ADD CONSTRAINT "GiftCardTransaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionLog" ADD CONSTRAINT "TransactionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionLog" ADD CONSTRAINT "TransactionLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
