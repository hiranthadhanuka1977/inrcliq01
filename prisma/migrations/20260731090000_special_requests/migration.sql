-- CreateEnum
CREATE TYPE "SpecialRequestStatus" AS ENUM ('RECEIVED', 'ACCEPTED', 'IN_PROGRESS', 'DELIVERED', 'DECLINED', 'CANCELLED');

-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN "specialRequestId" TEXT;

-- CreateTable
CREATE TABLE "SpecialRequest" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "SpecialRequestStatus" NOT NULL DEFAULT 'RECEIVED',
    "userId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "threadId" TEXT,
    "requestLabel" TEXT NOT NULL,
    "category" TEXT,
    "occasion" TEXT,
    "contentType" TEXT,
    "duration" TEXT,
    "publishingMethod" TEXT,
    "recipientLabel" TEXT,
    "recipientUsername" TEXT,
    "shoutoutMessage" TEXT,
    "specialInstructions" TEXT,
    "isAppearance" BOOLEAN NOT NULL DEFAULT false,
    "appearanceLocation" TEXT,
    "appearanceExpectation" TEXT,
    "appearanceReference" TEXT,
    "dayRate" INTEGER NOT NULL DEFAULT 0,
    "feedFee" INTEGER NOT NULL DEFAULT 0,
    "totalFee" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "requestedForAt" TIMESTAMP(3),
    "deliverBy" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "detailsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpecialRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SpecialRequest_reference_key" ON "SpecialRequest"("reference");

-- CreateIndex
CREATE INDEX "SpecialRequest_userId_createdAt_idx" ON "SpecialRequest"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SpecialRequest_creatorId_status_createdAt_idx" ON "SpecialRequest"("creatorId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "SpecialRequest_status_createdAt_idx" ON "SpecialRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SpecialRequest_threadId_idx" ON "SpecialRequest"("threadId");

-- CreateIndex
CREATE INDEX "ChatMessage_specialRequestId_idx" ON "ChatMessage"("specialRequestId");

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_specialRequestId_fkey" FOREIGN KEY ("specialRequestId") REFERENCES "SpecialRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialRequest" ADD CONSTRAINT "SpecialRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialRequest" ADD CONSTRAINT "SpecialRequest_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialRequest" ADD CONSTRAINT "SpecialRequest_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ChatThread"("id") ON DELETE SET NULL ON UPDATE CASCADE;
