-- CreateEnum
CREATE TYPE "DmDeliveryStatus" AS ENUM ('DELIVERED', 'PENDING_REVIEW', 'NOT_DELIVERED');

-- CreateEnum
CREATE TYPE "DmHoldStatus" AS ENUM ('PENDING', 'ALLOWED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DmRecipientTreatment" AS ENUM ('WITHHELD', 'MASKED_PLACEHOLDER');

-- CreateEnum
CREATE TYPE "SafetyAlertStatus" AS ENUM ('AWAITING_DECISION', 'AWAITING_ACKNOWLEDGEMENT', 'ACKNOWLEDGED', 'ALLOWED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DmRestrictionScope" AS ENUM ('MINORS');

-- CreateEnum
CREATE TYPE "SafetyReviewStatus" AS ENUM ('NONE', 'PENDING_REVIEW', 'CLEARED', 'ACTIONED');

-- CreateEnum
CREATE TYPE "SafetyReportStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'CLOSED');

-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "deliveryStatus" "DmDeliveryStatus" NOT NULL DEFAULT 'DELIVERED',
ADD COLUMN     "moderationHoldId" TEXT;

-- AlterTable: convert GuardianSafetyAlert.status from text to enum, preserving existing rows
ALTER TABLE "GuardianSafetyAlert" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "GuardianSafetyAlert"
  ALTER COLUMN "status" TYPE "SafetyAlertStatus"
  USING (CASE "status"
           WHEN 'acknowledged' THEN 'ACKNOWLEDGED'
           ELSE 'AWAITING_ACKNOWLEDGEMENT'
         END)::"SafetyAlertStatus";
ALTER TABLE "GuardianSafetyAlert" ALTER COLUMN "status" SET DEFAULT 'AWAITING_ACKNOWLEDGEMENT';

-- AlterTable
ALTER TABLE "GuardianSafetyAlert" ADD COLUMN     "counterpartIsAdult" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "holdId" TEXT,
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "resolvedByUserId" TEXT;

-- CreateTable
CREATE TABLE "DmModerationHold" (
    "id" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "recipientUserId" TEXT NOT NULL,
    "senderThreadId" TEXT NOT NULL,
    "senderMessageId" TEXT NOT NULL,
    "recipientThreadId" TEXT,
    "recipientMessageId" TEXT,
    "body" TEXT,
    "contentType" TEXT NOT NULL DEFAULT 'text',
    "category" TEXT NOT NULL,
    "severity" INTEGER NOT NULL,
    "senderZone" "AgeZone" NOT NULL,
    "recipientZone" "AgeZone" NOT NULL,
    "recipientTreatment" "DmRecipientTreatment" NOT NULL,
    "status" "DmHoldStatus" NOT NULL DEFAULT 'PENDING',
    "decidedByUserId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "bodyPurgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DmModerationHold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SenderSafetyStrike" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "holdId" TEXT,
    "category" TEXT NOT NULL,
    "severity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,

    CONSTRAINT "SenderSafetyStrike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserDmRestriction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scope" "DmRestrictionScope" NOT NULL DEFAULT 'MINORS',
    "reason" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "reviewStatus" "SafetyReviewStatus" NOT NULL DEFAULT 'NONE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserDmRestriction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyReport" (
    "id" TEXT NOT NULL,
    "reporterUserId" TEXT,
    "subjectUserId" TEXT NOT NULL,
    "holdId" TEXT,
    "alertId" TEXT,
    "source" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "mandatoryReportCandidate" BOOLEAN NOT NULL DEFAULT false,
    "status" "SafetyReportStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SafetyReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyAuditEvent" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorUserId" TEXT,
    "childUserId" TEXT,
    "subjectUserId" TEXT,
    "holdId" TEXT,
    "alertId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SafetyAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DmModerationHold_senderMessageId_key" ON "DmModerationHold"("senderMessageId");

-- CreateIndex
CREATE INDEX "DmModerationHold_recipientUserId_status_idx" ON "DmModerationHold"("recipientUserId", "status");

-- CreateIndex
CREATE INDEX "DmModerationHold_senderUserId_createdAt_idx" ON "DmModerationHold"("senderUserId", "createdAt");

-- CreateIndex
CREATE INDEX "DmModerationHold_status_expiresAt_idx" ON "DmModerationHold"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "SenderSafetyStrike_holdId_key" ON "SenderSafetyStrike"("holdId");

-- CreateIndex
CREATE INDEX "SenderSafetyStrike_userId_createdAt_idx" ON "SenderSafetyStrike"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserDmRestriction_userId_scope_endsAt_idx" ON "UserDmRestriction"("userId", "scope", "endsAt");

-- CreateIndex
CREATE INDEX "SafetyReport_status_priority_createdAt_idx" ON "SafetyReport"("status", "priority", "createdAt");

-- CreateIndex
CREATE INDEX "SafetyReport_subjectUserId_idx" ON "SafetyReport"("subjectUserId");

-- CreateIndex
CREATE INDEX "SafetyReport_holdId_idx" ON "SafetyReport"("holdId");

-- CreateIndex
CREATE INDEX "SafetyReport_reporterUserId_alertId_idx" ON "SafetyReport"("reporterUserId", "alertId");

-- CreateIndex
CREATE INDEX "SafetyAuditEvent_childUserId_createdAt_idx" ON "SafetyAuditEvent"("childUserId", "createdAt");

-- CreateIndex
CREATE INDEX "SafetyAuditEvent_holdId_idx" ON "SafetyAuditEvent"("holdId");

-- CreateIndex
CREATE INDEX "SafetyAuditEvent_subjectUserId_createdAt_idx" ON "SafetyAuditEvent"("subjectUserId", "createdAt");

-- CreateIndex
CREATE INDEX "ChatMessage_moderationHoldId_idx" ON "ChatMessage"("moderationHoldId");

-- CreateIndex
CREATE INDEX "GuardianSafetyAlert_holdId_idx" ON "GuardianSafetyAlert"("holdId");

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_moderationHoldId_fkey" FOREIGN KEY ("moderationHoldId") REFERENCES "DmModerationHold"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DmModerationHold" ADD CONSTRAINT "DmModerationHold_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DmModerationHold" ADD CONSTRAINT "DmModerationHold_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DmModerationHold" ADD CONSTRAINT "DmModerationHold_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SenderSafetyStrike" ADD CONSTRAINT "SenderSafetyStrike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SenderSafetyStrike" ADD CONSTRAINT "SenderSafetyStrike_holdId_fkey" FOREIGN KEY ("holdId") REFERENCES "DmModerationHold"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDmRestriction" ADD CONSTRAINT "UserDmRestriction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyReport" ADD CONSTRAINT "SafetyReport_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyReport" ADD CONSTRAINT "SafetyReport_subjectUserId_fkey" FOREIGN KEY ("subjectUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianSafetyAlert" ADD CONSTRAINT "GuardianSafetyAlert_holdId_fkey" FOREIGN KEY ("holdId") REFERENCES "DmModerationHold"("id") ON DELETE SET NULL ON UPDATE CASCADE;
