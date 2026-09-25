-- Age-zone descriptions for badge hover tooltips.

UPDATE "AgeZoneDefinition"
SET
  "description" = CASE "zone"
    WHEN 'KIDS' THEN
      'Kids Zone is for ages under 13. It uses the highest protection defaults for younger linked accounts.'
    WHEN 'TEENS' THEN
      'Teens Zone is for ages 13 through 15. It keeps strong safety defaults while allowing guided teen activity.'
    WHEN 'MATURE_TEENS' THEN
      'Mature Teens Zone is for ages 16 through 17. It adds more flexibility with tighter rules for adult contact.'
    WHEN 'ADULT' THEN
      'Adult profile is for ages 18 and over. Standard adult messaging and content rules apply.'
    ELSE "description"
  END,
  "updatedAt" = CURRENT_TIMESTAMP;
