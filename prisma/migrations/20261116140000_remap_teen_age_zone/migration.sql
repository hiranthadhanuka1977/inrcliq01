-- Production still has the legacy AgeZone label TEEN. Prisma only knows TEENS,
-- so any read that returns that label fails (settings dashboard, admin dashboard).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'AgeZone' AND e.enumlabel = 'TEEN'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'AgeZone' AND e.enumlabel = 'TEENS'
  ) THEN
    ALTER TYPE "AgeZone" RENAME VALUE 'TEEN' TO 'TEENS';
  END IF;
END $$;

ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_ageZone_fkey";

DO $$
DECLARE
  rec record;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'AgeZone' AND e.enumlabel = 'TEEN'
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'AgeZone' AND e.enumlabel = 'TEENS'
  ) THEN
    RETURN;
  END IF;

  FOR rec IN
    SELECT c.table_name, c.column_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.udt_name = 'AgeZone'
      AND NOT (c.table_name = 'AgeZoneDefinition' AND c.column_name = 'zone')
  LOOP
    EXECUTE format(
      'UPDATE %I SET %I = %L::"AgeZone" WHERE %I::text = %L',
      rec.table_name,
      rec.column_name,
      'TEENS',
      rec.column_name,
      'TEEN'
    );
  END LOOP;

  UPDATE "AgeZoneDefinition"
  SET "zone" = 'TEENS'::"AgeZone"
  WHERE "zone"::text = 'TEEN'
    AND NOT EXISTS (
      SELECT 1 FROM "AgeZoneDefinition" existing WHERE existing."zone"::text = 'TEENS'
    );

  DELETE FROM "AgeZoneDefinition" WHERE "zone"::text = 'TEEN';
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'User_ageZone_fkey'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'AgeZoneDefinition'
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
