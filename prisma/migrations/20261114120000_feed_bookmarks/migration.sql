-- CreateTable
CREATE TABLE IF NOT EXISTS "FeedBookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedBookmark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FeedBookmark_userId_createdAt_idx" ON "FeedBookmark"("userId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FeedBookmark_postId_idx" ON "FeedBookmark"("postId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "FeedBookmark_userId_postId_key" ON "FeedBookmark"("userId", "postId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FeedBookmark_userId_fkey'
  ) THEN
    ALTER TABLE "FeedBookmark"
      ADD CONSTRAINT "FeedBookmark_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FeedBookmark_postId_fkey'
  ) THEN
    ALTER TABLE "FeedBookmark"
      ADD CONSTRAINT "FeedBookmark_postId_fkey"
      FOREIGN KEY ("postId") REFERENCES "FeedPost"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
