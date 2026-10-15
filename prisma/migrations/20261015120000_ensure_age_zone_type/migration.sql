-- Production was baselined with this migration marked applied, but the AgeZone
-- type was never created. Signup inserts User.ageZone and fails with
-- type "public.AgeZone" does not exist. This migration is safe to re-run.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AgeZone') THEN
    CREATE TYPE "AgeZone" AS ENUM ('KIDS', 'TEENS', 'MATURE_TEENS', 'ADULT');
  END IF;
END $$;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "ageZone" "AgeZone";

CREATE INDEX IF NOT EXISTS "User_ageZone_idx" ON "User"("ageZone");

CREATE OR REPLACE FUNCTION current_age_zone(dob timestamp without time zone)
RETURNS "AgeZone"
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN dob IS NULL THEN NULL
    WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, dob::date)) < 13 THEN 'KIDS'::"AgeZone"
    WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, dob::date)) < 16 THEN 'TEENS'::"AgeZone"
    WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, dob::date)) < 18 THEN 'MATURE_TEENS'::"AgeZone"
    ELSE 'ADULT'::"AgeZone"
  END;
$$;

UPDATE "User"
SET "ageZone" = current_age_zone("dateOfBirth")
WHERE "dateOfBirth" IS NOT NULL
  AND "ageZone" IS NULL;

CREATE TABLE IF NOT EXISTS "AgeZoneDefinition" (
    "zone" "AgeZone" NOT NULL,
    "label" TEXT NOT NULL,
    "iconBadgeKey" TEXT NOT NULL,
    "description" TEXT,
    "minAgeInclusive" INTEGER NOT NULL,
    "maxAgeExclusive" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgeZoneDefinition_pkey" PRIMARY KEY ("zone")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AgeZoneDefinition_iconBadgeKey_key"
  ON "AgeZoneDefinition"("iconBadgeKey");

INSERT INTO "AgeZoneDefinition" (
  "zone",
  "label",
  "iconBadgeKey",
  "description",
  "minAgeInclusive",
  "maxAgeExclusive",
  "sortOrder",
  "updatedAt"
) VALUES
  (
    'KIDS',
    'Kids Zone',
    'age-zone-kids',
    'Kids Zone is for ages under 13. It uses the highest protection defaults for younger linked accounts.',
    0,
    13,
    1,
    CURRENT_TIMESTAMP
  ),
  (
    'TEENS',
    'Teens Zone',
    'age-zone-teens',
    'Teens Zone is for ages 13 through 15. It keeps strong safety defaults while allowing guided teen activity.',
    13,
    16,
    2,
    CURRENT_TIMESTAMP
  ),
  (
    'MATURE_TEENS',
    'Mature Teens Zone',
    'age-zone-mature-teens',
    'Mature Teens Zone is for ages 16 through 17. It adds more flexibility with tighter rules for adult contact.',
    16,
    18,
    3,
    CURRENT_TIMESTAMP
  ),
  (
    'ADULT',
    'Adult profile',
    'age-zone-adult',
    'Adult profile is for ages 18 and over. Standard adult messaging and content rules apply.',
    18,
    NULL,
    4,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("zone") DO UPDATE SET
  "label" = EXCLUDED."label",
  "iconBadgeKey" = EXCLUDED."iconBadgeKey",
  "description" = EXCLUDED."description",
  "minAgeInclusive" = EXCLUDED."minAgeInclusive",
  "maxAgeExclusive" = EXCLUDED."maxAgeExclusive",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'User_ageZone_fkey'
  ) THEN
    ALTER TABLE "User"
      ADD CONSTRAINT "User_ageZone_fkey"
      FOREIGN KEY ("ageZone") REFERENCES "AgeZoneDefinition"("zone")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
