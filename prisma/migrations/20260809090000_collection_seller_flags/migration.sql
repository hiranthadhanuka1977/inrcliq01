-- AlterTable
ALTER TABLE "CreatorCollection" ADD COLUMN "enabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "CollectionProduct" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "CollectionProduct" ADD COLUMN "published" BOOLEAN NOT NULL DEFAULT false;

-- Existing seeded products should remain visible publicly.
UPDATE "CollectionProduct" SET "published" = true WHERE "published" = false;
