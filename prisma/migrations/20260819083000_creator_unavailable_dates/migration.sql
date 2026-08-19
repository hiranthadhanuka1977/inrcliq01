-- CreateTable
CREATE TABLE "CreatorUnavailableDate" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreatorUnavailableDate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreatorUnavailableDate_creatorId_date_key" ON "CreatorUnavailableDate"("creatorId", "date");

-- AddForeignKey
ALTER TABLE "CreatorUnavailableDate" ADD CONSTRAINT "CreatorUnavailableDate_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
