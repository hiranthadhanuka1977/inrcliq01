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

-- Insert only zones that are missing. Do not rewrite iconBadgeKey: production
-- already has those keys, and updating them collides with the unique index.
INSERT INTO "AgeZoneDefinition" (
  "zone",
  "label",
  "iconBadgeKey",
  "description",
  "minAgeInclusive",
  "maxAgeExclusive",
  "sortOrder",
  "updatedAt"
)
SELECT
  seed.zone::"AgeZone",
  seed.label,
  seed.icon_badge_key,
  seed.description,
  seed.min_age,
  seed.max_age,
  seed.sort_order,
  CURRENT_TIMESTAMP
FROM (
  VALUES
    (
      'KIDS',
      'Kids Zone',
      'age-zone-kids',
      'Kids Zone is for ages under 13. It uses the highest protection defaults for younger linked accounts.',
      0,
      13,
      1
    ),
    (
      'TEENS',
      'Teens Zone',
      'age-zone-teens',
      'Teens Zone is for ages 13 through 15. It keeps strong safety defaults while allowing guided teen activity.',
      13,
      16,
      2
    ),
    (
      'MATURE_TEENS',
      'Mature Teens Zone',
      'age-zone-mature-teens',
      'Mature Teens Zone is for ages 16 through 17. It adds more flexibility with tighter rules for adult contact.',
      16,
      18,
      3
    ),
    (
      'ADULT',
      'Adult profile',
      'age-zone-adult',
      'Adult profile is for ages 18 and over. Standard adult messaging and content rules apply.',
      18,
      NULL::integer,
      4
    )
) AS seed(zone, label, icon_badge_key, description, min_age, max_age, sort_order)
WHERE NOT EXISTS (
  SELECT 1
  FROM "AgeZoneDefinition" existing
  WHERE existing."zone"::text = seed.zone
     OR existing."iconBadgeKey" = seed.icon_badge_key
);

UPDATE "AgeZoneDefinition" AS existing
SET
  "label" = seed.label,
  "description" = seed.description,
  "minAgeInclusive" = seed.min_age,
  "maxAgeExclusive" = seed.max_age,
  "sortOrder" = seed.sort_order,
  "updatedAt" = CURRENT_TIMESTAMP
FROM (
  VALUES
    (
      'KIDS',
      'Kids Zone',
      'Kids Zone is for ages under 13. It uses the highest protection defaults for younger linked accounts.',
      0,
      13,
      1
    ),
    (
      'TEENS',
      'Teens Zone',
      'Teens Zone is for ages 13 through 15. It keeps strong safety defaults while allowing guided teen activity.',
      13,
      16,
      2
    ),
    (
      'MATURE_TEENS',
      'Mature Teens Zone',
      'Mature Teens Zone is for ages 16 through 17. It adds more flexibility with tighter rules for adult contact.',
      16,
      18,
      3
    ),
    (
      'ADULT',
      'Adult profile',
      'Adult profile is for ages 18 and over. Standard adult messaging and content rules apply.',
      18,
      NULL::integer,
      4
    )
) AS seed(zone, label, description, min_age, max_age, sort_order)
WHERE existing."zone"::text = seed.zone;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'User_ageZone_fkey'
  ) THEN
    BEGIN
      ALTER TABLE "User"
        ADD CONSTRAINT "User_ageZone_fkey"
        FOREIGN KEY ("ageZone") REFERENCES "AgeZoneDefinition"("zone")
        ON DELETE SET NULL ON UPDATE CASCADE;
    EXCEPTION
      WHEN others THEN
        RAISE NOTICE 'User_ageZone_fkey was not added: %', SQLERRM;
    END;
  END IF;
END $$;
