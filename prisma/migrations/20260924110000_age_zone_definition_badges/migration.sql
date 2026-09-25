-- Age zone definitions: one row per zone with a stable icon badge key for the UI.

CREATE TABLE IF NOT EXISTS "AgeZoneDefinition" (
    "zone" "AgeZone" NOT NULL,
    "label" TEXT NOT NULL,
    "iconBadgeKey" TEXT NOT NULL,
    "description" TEXT,
    "minAgeInclusive" INTEGER NOT NULL,
    "maxAgeExclusive" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

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
    'Default band for ages under 13.',
    0,
    13,
    1,
    CURRENT_TIMESTAMP
  ),
  (
    'TEENS',
    'Teens Zone',
    'age-zone-teens',
    'Default band for ages 13 through 15.',
    13,
    16,
    2,
    CURRENT_TIMESTAMP
  ),
  (
    'MATURE_TEENS',
    'Mature Teens Zone',
    'age-zone-mature-teens',
    'Default band for ages 16 through 17.',
    16,
    18,
    3,
    CURRENT_TIMESTAMP
  ),
  (
    'ADULT',
    'Adult profile',
    'age-zone-adult',
    'Default band for ages 18 and over.',
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

-- Link User.ageZone to the definition table when present.
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
