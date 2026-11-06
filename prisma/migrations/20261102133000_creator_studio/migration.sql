-- CreateEnum
CREATE TYPE "StudioFormat" AS ENUM ('SHORT', 'VIDEO', 'PODCAST_EPISODE', 'AUDIOBOOK_CHAPTER', 'MUSIC_TRACK');

-- CreateEnum
CREATE TYPE "StudioShowKind" AS ENUM ('PODCAST', 'AUDIOBOOK', 'SERIES');

-- CreateEnum
CREATE TYPE "StudioProjectStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'HIDDEN');

-- CreateEnum
CREATE TYPE "StudioAudience" AS ENUM ('PUBLIC', 'FOLLOWERS', 'MEMBERS', 'UNLISTED');

-- CreateEnum
CREATE TYPE "StudioMediaKind" AS ENUM ('VIDEO', 'AUDIO');

-- CreateEnum
CREATE TYPE "StudioAgeRating" AS ENUM ('ALL', 'TEENS', 'MATURE', 'ADULT');

-- CreateTable
CREATE TABLE "StudioShow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "coverUrl" TEXT,
    "kind" "StudioShowKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioShow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioProject" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "showId" TEXT,
    "format" "StudioFormat" NOT NULL,
    "status" "StudioProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "language" TEXT NOT NULL DEFAULT 'en',
    "category" TEXT NOT NULL DEFAULT 'entertainment',
    "ageRating" "StudioAgeRating" NOT NULL DEFAULT 'ALL',
    "thumbnailUrl" TEXT,
    "mediaUrl" TEXT,
    "mediaKind" "StudioMediaKind",
    "audience" "StudioAudience" NOT NULL DEFAULT 'PUBLIC',
    "publishAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "pushToFeed" BOOLEAN NOT NULL DEFAULT false,
    "feedPostId" TEXT,
    "commentsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "attachmentType" TEXT NOT NULL DEFAULT 'NONE',
    "attachmentId" TEXT,
    "rightsConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioComment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudioComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioLaunchCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudioLaunchCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioSession" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudioSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudioShow_userId_idx" ON "StudioShow"("userId");

-- CreateIndex
CREATE INDEX "StudioShow_creatorId_idx" ON "StudioShow"("creatorId");

-- CreateIndex
CREATE INDEX "StudioProject_userId_status_idx" ON "StudioProject"("userId", "status");

-- CreateIndex
CREATE INDEX "StudioProject_status_publishedAt_idx" ON "StudioProject"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "StudioProject_showId_idx" ON "StudioProject"("showId");

-- CreateIndex
CREATE INDEX "StudioProject_creatorId_idx" ON "StudioProject"("creatorId");

-- CreateIndex
CREATE INDEX "StudioComment_projectId_createdAt_idx" ON "StudioComment"("projectId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StudioLaunchCode_codeHash_key" ON "StudioLaunchCode"("codeHash");

-- CreateIndex
CREATE INDEX "StudioLaunchCode_userId_idx" ON "StudioLaunchCode"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StudioSession_sessionToken_key" ON "StudioSession"("sessionToken");

-- CreateIndex
CREATE INDEX "StudioSession_userId_idx" ON "StudioSession"("userId");

-- AddForeignKey
ALTER TABLE "StudioShow" ADD CONSTRAINT "StudioShow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioShow" ADD CONSTRAINT "StudioShow_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioProject" ADD CONSTRAINT "StudioProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioProject" ADD CONSTRAINT "StudioProject_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioProject" ADD CONSTRAINT "StudioProject_showId_fkey" FOREIGN KEY ("showId") REFERENCES "StudioShow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioComment" ADD CONSTRAINT "StudioComment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "StudioProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioComment" ADD CONSTRAINT "StudioComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioLaunchCode" ADD CONSTRAINT "StudioLaunchCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioSession" ADD CONSTRAINT "StudioSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
