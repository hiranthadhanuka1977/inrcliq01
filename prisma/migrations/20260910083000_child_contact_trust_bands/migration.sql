-- CreateTable
CREATE TABLE "ChildContactTrustBand" (
    "id" TEXT NOT NULL,
    "guardianUserId" TEXT NOT NULL,
    "childUserId" TEXT NOT NULL,
    "contactKey" TEXT NOT NULL,
    "contactKind" TEXT NOT NULL,
    "trustBand" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChildContactTrustBand_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChildContactTrustBand_childUserId_contactKey_key" ON "ChildContactTrustBand"("childUserId", "contactKey");

-- CreateIndex
CREATE INDEX "ChildContactTrustBand_guardianUserId_childUserId_idx" ON "ChildContactTrustBand"("guardianUserId", "childUserId");

-- CreateIndex
CREATE INDEX "ChildContactTrustBand_childUserId_trustBand_idx" ON "ChildContactTrustBand"("childUserId", "trustBand");

-- AddForeignKey
ALTER TABLE "ChildContactTrustBand" ADD CONSTRAINT "ChildContactTrustBand_guardianUserId_fkey" FOREIGN KEY ("guardianUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChildContactTrustBand" ADD CONSTRAINT "ChildContactTrustBand_childUserId_fkey" FOREIGN KEY ("childUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
