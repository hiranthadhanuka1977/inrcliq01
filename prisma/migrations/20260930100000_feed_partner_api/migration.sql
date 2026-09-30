-- AlterTable
ALTER TABLE "FeedPost" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "partnerId" TEXT,
ADD COLUMN     "partnerPayloadHash" TEXT;

-- CreateTable
CREATE TABLE "FeedPartner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedPartner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedPartnerKey" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "FeedPartnerKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedPartnerCreator" (
    "partnerId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedPartnerCreator_pkey" PRIMARY KEY ("partnerId","creatorId")
);

-- CreateIndex
CREATE UNIQUE INDEX "FeedPartnerKey_keyHash_key" ON "FeedPartnerKey"("keyHash");

-- CreateIndex
CREATE INDEX "FeedPartnerKey_partnerId_idx" ON "FeedPartnerKey"("partnerId");

-- CreateIndex
CREATE INDEX "FeedPartnerCreator_creatorId_idx" ON "FeedPartnerCreator"("creatorId");

-- CreateIndex
CREATE INDEX "FeedPost_partnerId_createdAt_idx" ON "FeedPost"("partnerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FeedPost_partnerId_externalId_key" ON "FeedPost"("partnerId", "externalId");

-- AddForeignKey
ALTER TABLE "FeedPost" ADD CONSTRAINT "FeedPost_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "FeedPartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedPartnerKey" ADD CONSTRAINT "FeedPartnerKey_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "FeedPartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedPartnerCreator" ADD CONSTRAINT "FeedPartnerCreator_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "FeedPartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedPartnerCreator" ADD CONSTRAINT "FeedPartnerCreator_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
