-- CreateTable
CREATE TABLE "GuardianChildLink" (
    "id" TEXT NOT NULL,
    "guardianUserId" TEXT NOT NULL,
    "childUserId" TEXT NOT NULL,
    "parentApprovalRequestId" TEXT,
    "protectionLevel" TEXT,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuardianChildLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuardianChildLink_parentApprovalRequestId_key" ON "GuardianChildLink"("parentApprovalRequestId");

-- CreateIndex
CREATE INDEX "GuardianChildLink_guardianUserId_idx" ON "GuardianChildLink"("guardianUserId");

-- CreateIndex
CREATE INDEX "GuardianChildLink_childUserId_idx" ON "GuardianChildLink"("childUserId");

-- CreateIndex
CREATE UNIQUE INDEX "GuardianChildLink_guardianUserId_childUserId_key" ON "GuardianChildLink"("guardianUserId", "childUserId");

-- AddForeignKey
ALTER TABLE "GuardianChildLink" ADD CONSTRAINT "GuardianChildLink_guardianUserId_fkey" FOREIGN KEY ("guardianUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianChildLink" ADD CONSTRAINT "GuardianChildLink_childUserId_fkey" FOREIGN KEY ("childUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianChildLink" ADD CONSTRAINT "GuardianChildLink_parentApprovalRequestId_fkey" FOREIGN KEY ("parentApprovalRequestId") REFERENCES "ParentApprovalRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill from existing approved parent requests
INSERT INTO "GuardianChildLink" (
    "id",
    "guardianUserId",
    "childUserId",
    "parentApprovalRequestId",
    "protectionLevel",
    "linkedAt",
    "createdAt",
    "updatedAt"
)
SELECT
    md5(random()::text || clock_timestamp()::text || par."id"),
    par."guardianUserId",
    par."childUserId",
    par."id",
    par."protectionLevel",
    COALESCE(par."resolvedAt", par."updatedAt"),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "ParentApprovalRequest" par
WHERE par."status" = 'APPROVED'
  AND par."guardianUserId" IS NOT NULL
ON CONFLICT ("guardianUserId", "childUserId") DO NOTHING;
