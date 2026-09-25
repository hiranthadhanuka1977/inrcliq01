-- Friendlier zone intro copy for age-zone badge hover tooltips.

UPDATE "AgeZoneDefinition"
SET
  "description" = CASE "zone"
    WHEN 'KIDS' THEN 'Highest protection band for younger accounts under 13.'
    WHEN 'TEENS' THEN 'Guided teen band for ages 13 through 15 with strong safety defaults.'
    WHEN 'MATURE_TEENS' THEN 'Mature teen band for ages 16 through 17 with tighter adult-contact rules.'
    WHEN 'ADULT' THEN 'Adult profile band for ages 18 and over.'
    ELSE "description"
  END,
  "updatedAt" = CURRENT_TIMESTAMP;
