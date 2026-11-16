-- AlterEnum
ALTER TYPE "DmDeliveryStatus" ADD VALUE 'REQUEST_PENDING';
ALTER TYPE "DmDeliveryStatus" ADD VALUE 'REQUEST_DECLINED';

-- CreateEnum
CREATE TYPE "MessageRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateTable
CREATE TABLE "DirectMessageRequest" (
    "id" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "recipientUserId" TEXT NOT NULL,
    "status" "MessageRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "DirectMessageRequest_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN "messageRequestId" TEXT;

-- CreateIndex
CREATE INDEX "DirectMessageRequest_recipientUserId_status_updatedAt_idx" ON "DirectMessageRequest"("recipientUserId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "DirectMessageRequest_senderUserId_recipientUserId_status_idx" ON "DirectMessageRequest"("senderUserId", "recipientUserId", "status");

-- One open request per pair. Decline and accept stay as history so a later send can open a new request.
CREATE UNIQUE INDEX "DirectMessageRequest_one_pending_per_pair_idx" ON "DirectMessageRequest"("senderUserId", "recipientUserId") WHERE "status" = 'PENDING';

-- CreateIndex
CREATE INDEX "ChatMessage_messageRequestId_idx" ON "ChatMessage"("messageRequestId");

-- AddForeignKey
ALTER TABLE "DirectMessageRequest" ADD CONSTRAINT "DirectMessageRequest_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMessageRequest" ADD CONSTRAINT "DirectMessageRequest_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_messageRequestId_fkey" FOREIGN KEY ("messageRequestId") REFERENCES "DirectMessageRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
