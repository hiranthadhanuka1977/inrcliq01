-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- CreateTable
CREATE TABLE "CreatorSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "notifyLevel" TEXT NOT NULL DEFAULT 'personalized',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "CreatorSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CreatorSubscription_creatorId_status_idx" ON "CreatorSubscription"("creatorId", "status");

-- CreateIndex
CREATE INDEX "CreatorSubscription_userId_status_idx" ON "CreatorSubscription"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorSubscription_userId_creatorId_key" ON "CreatorSubscription"("userId", "creatorId");

-- AddForeignKey
ALTER TABLE "CreatorSubscription" ADD CONSTRAINT "CreatorSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorSubscription" ADD CONSTRAINT "CreatorSubscription_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
