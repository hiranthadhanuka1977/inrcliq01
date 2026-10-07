-- Align the prototype's age zone names with the API's.
--
-- Same four bands and the same boundaries all along; only the spelling differed —
-- TEENS and MATURE_TEENS here against TEEN and MATURE_TEEN in the API. Harmless
-- while the two never met, and a bug waiting for whoever first rendered the API's
-- band in a component typed against these.
--
-- RENAME VALUE rather than add-migrate-drop: it is atomic, runs inside the
-- transaction Prisma wraps migrations in, and carries existing rows across
-- without an UPDATE. ADD VALUE cannot do any of those three.

ALTER TYPE "AgeZone" RENAME VALUE 'TEENS' TO 'TEEN';
ALTER TYPE "AgeZone" RENAME VALUE 'MATURE_TEENS' TO 'MATURE_TEEN';
