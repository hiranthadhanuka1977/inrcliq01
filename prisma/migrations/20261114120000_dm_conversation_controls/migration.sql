-- AlterTable
ALTER TABLE "ChatThread" ADD COLUMN "notificationsMuted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "SafetyReport" ADD COLUMN "threadId" TEXT;

-- CreateIndex
CREATE INDEX "SafetyReport_threadId_idx" ON "SafetyReport"("threadId");

-- CreateTable
CREATE TABLE "DirectMessageBlock" (
    "id" TEXT NOT NULL,
    "blockerUserId" TEXT NOT NULL,
    "blockedUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DirectMessageBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DirectMessageBlock_blockerUserId_blockedUserId_key" ON "DirectMessageBlock"("blockerUserId", "blockedUserId");

-- CreateIndex
CREATE INDEX "DirectMessageBlock_blockedUserId_idx" ON "DirectMessageBlock"("blockedUserId");

-- AddForeignKey
ALTER TABLE "DirectMessageBlock" ADD CONSTRAINT "DirectMessageBlock_blockerUserId_fkey" FOREIGN KEY ("blockerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMessageBlock" ADD CONSTRAINT "DirectMessageBlock_blockedUserId_fkey" FOREIGN KEY ("blockedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
