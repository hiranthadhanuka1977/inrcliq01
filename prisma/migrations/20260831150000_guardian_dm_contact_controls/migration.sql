-- CreateTable
CREATE TABLE "GuardianDmContactControl" (
    "id" TEXT NOT NULL,
    "childUserId" TEXT NOT NULL,
    "childThreadId" TEXT NOT NULL,
    "peerUserId" TEXT,
    "peerSlug" TEXT,
    "peerHandle" TEXT,
    "dmRestricted" BOOLEAN NOT NULL DEFAULT false,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuardianDmContactControl_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuardianDmContactControl_childUserId_childThreadId_key" ON "GuardianDmContactControl"("childUserId", "childThreadId");

-- CreateIndex
CREATE INDEX "GuardianDmContactControl_childUserId_peerUserId_idx" ON "GuardianDmContactControl"("childUserId", "peerUserId");

-- AddForeignKey
ALTER TABLE "GuardianDmContactControl" ADD CONSTRAINT "GuardianDmContactControl_childUserId_fkey" FOREIGN KEY ("childUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianDmContactControl" ADD CONSTRAINT "GuardianDmContactControl_peerUserId_fkey" FOREIGN KEY ("peerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
