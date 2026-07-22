-- CreateTable
CREATE TABLE "CreatorUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "slug" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "avatarInitials" TEXT NOT NULL,
    "avatarColor" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "bio" TEXT,
    "coverUrl" TEXT,
    "source" TEXT NOT NULL DEFAULT 'feed-json',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedPost" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "tags" TEXT[],
    "mediaJson" JSONB,
    "audioJson" JSONB,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "following" BOOLEAN NOT NULL DEFAULT false,
    "membersOnly" BOOLEAN NOT NULL DEFAULT false,
    "postedAt" TIMESTAMP(3) NOT NULL,
    "postedAgo" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "creatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreatorUser_email_key" ON "CreatorUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorUser_handle_key" ON "CreatorUser"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorUser_slug_key" ON "CreatorUser"("slug");

-- CreateIndex
CREATE INDEX "CreatorUser_name_idx" ON "CreatorUser"("name");

-- CreateIndex
CREATE INDEX "FeedPost_category_idx" ON "FeedPost"("category");

-- CreateIndex
CREATE INDEX "FeedPost_creatorId_idx" ON "FeedPost"("creatorId");

-- CreateIndex
CREATE INDEX "FeedPost_postedAt_idx" ON "FeedPost"("postedAt");

-- CreateIndex
CREATE INDEX "FeedPost_sortOrder_idx" ON "FeedPost"("sortOrder");

-- AddForeignKey
ALTER TABLE "FeedPost" ADD CONSTRAINT "FeedPost_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
