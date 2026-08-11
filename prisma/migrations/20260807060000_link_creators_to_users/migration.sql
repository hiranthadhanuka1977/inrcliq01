-- Link feed CreatorUser rows to auth User, and FeedPost rows to the same User.
ALTER TABLE "CreatorUser" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "FeedPost" ADD COLUMN IF NOT EXISTS "userId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "CreatorUser_userId_key" ON "CreatorUser"("userId");
CREATE INDEX IF NOT EXISTS "FeedPost_userId_idx" ON "FeedPost"("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CreatorUser_userId_fkey'
  ) THEN
    ALTER TABLE "CreatorUser"
      ADD CONSTRAINT "CreatorUser_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FeedPost_userId_fkey'
  ) THEN
    ALTER TABLE "FeedPost"
      ADD CONSTRAINT "FeedPost_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
