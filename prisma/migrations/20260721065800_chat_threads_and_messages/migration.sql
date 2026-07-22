-- CreateTable
CREATE TABLE "ChatThread" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "peerCreatorId" TEXT,
    "peerName" TEXT NOT NULL,
    "peerHandle" TEXT NOT NULL,
    "peerInitials" TEXT NOT NULL,
    "peerAvatarColor" TEXT NOT NULL,
    "peerAvatarUrl" TEXT,
    "peerSlug" TEXT,
    "peerOnline" BOOLEAN NOT NULL DEFAULT false,
    "preview" TEXT,
    "lastMessageAt" TIMESTAMP(3),
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "fromMe" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatThread_userId_lastMessageAt_idx" ON "ChatThread"("userId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "ChatThread_peerCreatorId_idx" ON "ChatThread"("peerCreatorId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatThread_userId_peerCreatorId_key" ON "ChatThread"("userId", "peerCreatorId");

-- CreateIndex
CREATE INDEX "ChatMessage_threadId_createdAt_idx" ON "ChatMessage"("threadId", "createdAt");

-- AddForeignKey
ALTER TABLE "ChatThread" ADD CONSTRAINT "ChatThread_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatThread" ADD CONSTRAINT "ChatThread_peerCreatorId_fkey" FOREIGN KEY ("peerCreatorId") REFERENCES "CreatorUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ChatThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
