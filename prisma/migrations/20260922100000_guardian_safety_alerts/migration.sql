-- CreateTable
CREATE TABLE IF NOT EXISTS "GuardianSafetyAlert" (
    "id" TEXT NOT NULL,
    "guardianUserId" TEXT NOT NULL,
    "childUserId" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'high',
    "category" TEXT NOT NULL,
    "actionTaken" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'awaiting_acknowledgement',
    "source" TEXT NOT NULL DEFAULT 'dm_text_moderation',
    "chatThreadId" TEXT,
    "chatMessageId" TEXT NOT NULL,
    "peerUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),

    CONSTRAINT "GuardianSafetyAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GuardianSafetyAlert_guardianUserId_status_createdAt_idx"
  ON "GuardianSafetyAlert"("guardianUserId", "status", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GuardianSafetyAlert_childUserId_createdAt_idx"
  ON "GuardianSafetyAlert"("childUserId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GuardianSafetyAlert_chatMessageId_idx"
  ON "GuardianSafetyAlert"("chatMessageId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "GuardianSafetyAlert_guardianUserId_chatMessageId_key"
  ON "GuardianSafetyAlert"("guardianUserId", "chatMessageId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'GuardianSafetyAlert_guardianUserId_fkey'
  ) THEN
    ALTER TABLE "GuardianSafetyAlert"
      ADD CONSTRAINT "GuardianSafetyAlert_guardianUserId_fkey"
      FOREIGN KEY ("guardianUserId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'GuardianSafetyAlert_childUserId_fkey'
  ) THEN
    ALTER TABLE "GuardianSafetyAlert"
      ADD CONSTRAINT "GuardianSafetyAlert_childUserId_fkey"
      FOREIGN KEY ("childUserId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
