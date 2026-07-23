-- AlterTable
ALTER TABLE "ParentApprovalRequest" ADD COLUMN IF NOT EXISTS "continueTokenHash" TEXT;
ALTER TABLE "ParentApprovalRequest" ADD COLUMN IF NOT EXISTS "continueTokenExpiresAt" TIMESTAMP(3);
ALTER TABLE "ParentApprovalRequest" ADD COLUMN IF NOT EXISTS "continueTokenUsedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ParentApprovalRequest_continueTokenHash_key" ON "ParentApprovalRequest"("continueTokenHash");
