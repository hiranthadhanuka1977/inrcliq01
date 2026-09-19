-- CreateTable
CREATE TABLE IF NOT EXISTS "FeedHiddenPost" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedHiddenPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FeedHiddenPost_userId_createdAt_idx" ON "FeedHiddenPost"("userId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FeedHiddenPost_postId_idx" ON "FeedHiddenPost"("postId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "FeedHiddenPost_userId_postId_key" ON "FeedHiddenPost"("userId", "postId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FeedHiddenPost_userId_fkey'
  ) THEN
    ALTER TABLE "FeedHiddenPost"
      ADD CONSTRAINT "FeedHiddenPost_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
