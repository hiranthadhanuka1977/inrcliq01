-- AlterTable
ALTER TABLE "ParentApprovalRequest" ADD COLUMN     "childLivesWithGuardian" BOOLEAN,
ADD COLUMN     "childLocationCountry" TEXT,
ADD COLUMN     "childLocationRegion" TEXT,
ADD COLUMN     "guardianCountry" TEXT,
ADD COLUMN     "guardianRegion" TEXT,
ADD COLUMN     "guardianUserId" TEXT,
ADD COLUMN     "idDocType" TEXT,
ADD COLUMN     "protectionLevel" TEXT;

-- CreateIndex
CREATE INDEX "ParentApprovalRequest_guardianUserId_idx" ON "ParentApprovalRequest"("guardianUserId");

-- AddForeignKey
ALTER TABLE "ParentApprovalRequest" ADD CONSTRAINT "ParentApprovalRequest_guardianUserId_fkey" FOREIGN KEY ("guardianUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
