-- CreateTable
CREATE TABLE IF NOT EXISTS "CreatorFollow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreatorFollow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CreatorFollow_userId_createdAt_idx" ON "CreatorFollow"("userId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CreatorFollow_creatorId_idx" ON "CreatorFollow"("creatorId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CreatorFollow_userId_creatorId_key" ON "CreatorFollow"("userId", "creatorId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CreatorFollow_userId_fkey'
  ) THEN
    ALTER TABLE "CreatorFollow"
      ADD CONSTRAINT "CreatorFollow_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CreatorFollow_creatorId_fkey'
  ) THEN
    ALTER TABLE "CreatorFollow"
      ADD CONSTRAINT "CreatorFollow_creatorId_fkey"
      FOREIGN KEY ("creatorId") REFERENCES "CreatorUser"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
