ALTER TABLE "ChatMessage" ADD COLUMN "pairId" TEXT;
ALTER TABLE "ChatMessage" ADD COLUMN "editedAt" TIMESTAMP(3);

CREATE INDEX "ChatMessage_pairId_idx" ON "ChatMessage"("pairId");
