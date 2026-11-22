CREATE TABLE "PasswordChangeCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordChangeCode_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PasswordChangeCode_userId_createdAt_idx" ON "PasswordChangeCode"("userId", "createdAt");

ALTER TABLE "PasswordChangeCode" ADD CONSTRAINT "PasswordChangeCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
