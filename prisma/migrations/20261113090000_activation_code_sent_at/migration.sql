-- AlterTable
ALTER TABLE "ParentApprovalRequest" ADD COLUMN IF NOT EXISTS "activationCodeSentAt" TIMESTAMP(3);
