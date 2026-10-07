-- Move the age zone from a Postgres enum to a plain string column.
--
-- The band names are the API's, and the API owns four of them today with more
-- possible later. A database enum means a migration every time that list changes,
-- in a service that only stores the value and never constrains it — the API
-- already validates, and `src/lib/utils/age-zone.ts` is where the codes live for
-- the application. The backend stores it the same way, as a String column.
--
-- The foreign key to AgeZoneDefinition has to come off and go back on, because
-- both sides of it change type.

ALTER TABLE "DmModerationHold" DROP CONSTRAINT IF EXISTS "DmModerationHold_senderZone_fkey";
ALTER TABLE "DmModerationHold" DROP CONSTRAINT IF EXISTS "DmModerationHold_recipientZone_fkey";
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_ageZone_fkey";

ALTER TABLE "AgeZoneDefinition" ALTER COLUMN "zone" TYPE TEXT USING "zone"::TEXT;
ALTER TABLE "User" ALTER COLUMN "ageZone" TYPE TEXT USING "ageZone"::TEXT;
ALTER TABLE "DmModerationHold" ALTER COLUMN "senderZone" TYPE TEXT USING "senderZone"::TEXT;
ALTER TABLE "DmModerationHold" ALTER COLUMN "recipientZone" TYPE TEXT USING "recipientZone"::TEXT;

ALTER TABLE "User"
  ADD CONSTRAINT "User_ageZone_fkey"
  FOREIGN KEY ("ageZone") REFERENCES "AgeZoneDefinition"("zone")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- current_age_zone() was a third copy of the band table, written in SQL. The
-- bands are the API's and are configurable there, so a hard-coded copy in the
-- database could only drift from them — and it already had, still naming the old
-- TEENS and MATURE_TEENS. Nothing calls it at runtime; the TypeScript in
-- src/lib/utils/age-zone.ts is what the application uses.
DROP FUNCTION IF EXISTS current_age_zone(timestamp without time zone);

DROP TYPE IF EXISTS "AgeZone";
