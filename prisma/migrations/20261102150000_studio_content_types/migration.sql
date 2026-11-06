-- CreateEnum
CREATE TYPE "StudioFamily" AS ENUM ('SHORT', 'VIDEO', 'PODCAST', 'AUDIOBOOK', 'MUSIC', 'SOUND', 'PROMO');

-- CreateEnum
CREATE TYPE "StudioShape" AS ENUM ('SHORT_VIDEO', 'SHORT_AUDIO', 'FILM', 'SERIES_EPISODE', 'TALK', 'LESSON', 'PERFORMANCE', 'MUSIC_VIDEO', 'PODCAST_SINGLE', 'PODCAST_EPISODE', 'BOOK', 'BOOK_IN_SERIES', 'SINGLE', 'EP_TRACK', 'ALBUM_TRACK', 'MEDITATION', 'SLEEP', 'ASMR', 'SOUNDSCAPE', 'TRAILER', 'CLIP', 'SAMPLE', 'HIGHLIGHT');

-- AlterTable
ALTER TABLE "StudioProject" ADD COLUMN "family" "StudioFamily",
ADD COLUMN "shape" "StudioShape",
ADD COLUMN "parentProjectId" TEXT;

-- Backfill from the original format column before it is removed.
UPDATE "StudioProject"
SET
  "family" = CASE "format"
    WHEN 'SHORT' THEN 'SHORT'::"StudioFamily"
    WHEN 'VIDEO' THEN 'VIDEO'::"StudioFamily"
    WHEN 'PODCAST_EPISODE' THEN 'PODCAST'::"StudioFamily"
    WHEN 'AUDIOBOOK_CHAPTER' THEN 'AUDIOBOOK'::"StudioFamily"
    WHEN 'MUSIC_TRACK' THEN 'MUSIC'::"StudioFamily"
    ELSE 'VIDEO'::"StudioFamily"
  END,
  "shape" = CASE
    WHEN "format" = 'SHORT' AND "mediaKind" = 'AUDIO' THEN 'SHORT_AUDIO'::"StudioShape"
    WHEN "format" = 'SHORT' THEN 'SHORT_VIDEO'::"StudioShape"
    WHEN "format" = 'VIDEO' THEN 'FILM'::"StudioShape"
    WHEN "format" = 'PODCAST_EPISODE' AND "showId" IS NULL THEN 'PODCAST_SINGLE'::"StudioShape"
    WHEN "format" = 'PODCAST_EPISODE' THEN 'PODCAST_EPISODE'::"StudioShape"
    WHEN "format" = 'AUDIOBOOK_CHAPTER' THEN 'BOOK'::"StudioShape"
    WHEN "format" = 'MUSIC_TRACK' THEN 'SINGLE'::"StudioShape"
    ELSE 'FILM'::"StudioShape"
  END;

ALTER TABLE "StudioProject" ALTER COLUMN "family" SET NOT NULL;
ALTER TABLE "StudioProject" ALTER COLUMN "shape" SET NOT NULL;

ALTER TABLE "StudioProject" DROP COLUMN "format";

DROP TYPE "StudioFormat";

-- New shelf kinds. Not used in this migration's data changes.
ALTER TYPE "StudioShowKind" ADD VALUE 'EP';
ALTER TYPE "StudioShowKind" ADD VALUE 'ALBUM';
ALTER TYPE "StudioShowKind" ADD VALUE 'BOOK_SERIES';

-- AddForeignKey
ALTER TABLE "StudioProject" ADD CONSTRAINT "StudioProject_parentProjectId_fkey" FOREIGN KEY ("parentProjectId") REFERENCES "StudioProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "StudioProject_parentProjectId_idx" ON "StudioProject"("parentProjectId");
