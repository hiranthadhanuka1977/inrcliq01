-- AlterTable
ALTER TABLE "ChatThread" ADD COLUMN "seedKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ChatThread_userId_seedKey_key" ON "ChatThread"("userId", "seedKey");
