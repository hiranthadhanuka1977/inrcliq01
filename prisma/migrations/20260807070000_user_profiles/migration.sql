-- Public profiles linked 1:1 to auth Users.
CREATE TABLE IF NOT EXISTS "UserProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "slug" TEXT,
  "displayName" TEXT NOT NULL,
  "handle" TEXT NOT NULL,
  "avatarInitials" TEXT NOT NULL,
  "avatarColor" TEXT NOT NULL,
  "avatarUrl" TEXT,
  "coverUrl" TEXT,
  "bio" TEXT NOT NULL DEFAULT '',
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "specialRequests" BOOLEAN NOT NULL DEFAULT false,
  "subscriptionPriceLabel" TEXT,
  "followersLabel" TEXT,
  "followingCount" INTEGER NOT NULL DEFAULT 0,
  "subscribersCount" INTEGER NOT NULL DEFAULT 0,
  "postsCountLabel" INTEGER,
  "popularPostsJson" JSONB,
  "pinnedFeedPostIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "source" TEXT NOT NULL DEFAULT 'stub',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserProfile_userId_key" ON "UserProfile"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "UserProfile_slug_key" ON "UserProfile"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "UserProfile_handle_key" ON "UserProfile"("handle");
CREATE INDEX IF NOT EXISTS "UserProfile_verified_idx" ON "UserProfile"("verified");
CREATE INDEX IF NOT EXISTS "UserProfile_slug_idx" ON "UserProfile"("slug");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'UserProfile_userId_fkey'
  ) THEN
    ALTER TABLE "UserProfile"
      ADD CONSTRAINT "UserProfile_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
