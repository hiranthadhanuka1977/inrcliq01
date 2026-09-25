-- Age zones derived from date of birth (current age).
-- Kids: <13 | Teens: 13–<16 | Mature Teens: 16–<18 | Adult: 18+

CREATE TYPE "AgeZone" AS ENUM ('KIDS', 'TEENS', 'MATURE_TEENS', 'ADULT');

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "ageZone" "AgeZone";

CREATE INDEX IF NOT EXISTS "User_ageZone_idx" ON "User"("ageZone");

-- Stable SQL helper: current zone from a DOB (uses CURRENT_DATE).
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

-- Backfill cached column from existing dates of birth.
UPDATE "User"
SET "ageZone" = current_age_zone("dateOfBirth")
WHERE "dateOfBirth" IS NOT NULL;
