-- Special Requests catalog owned by an auth User (Mia Chen).
CREATE TABLE IF NOT EXISTS "SpecialRequestCatalog" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "content" JSONB NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'seed',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SpecialRequestCatalog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SpecialRequestCatalog_userId_key" ON "SpecialRequestCatalog"("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SpecialRequestCatalog_userId_fkey'
  ) THEN
    ALTER TABLE "SpecialRequestCatalog"
      ADD CONSTRAINT "SpecialRequestCatalog_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
