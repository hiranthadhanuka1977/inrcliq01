import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { getAppUrl } from "@/lib/api-helpers";
import {
  EMAIL_VERIFY_COOLDOWN_SECONDS,
  EMAIL_VERIFY_EXPIRY_HOURS,
} from "@/lib/auth/email-verification.constants";

function generateToken() {
  return randomBytes(32).toString("hex");
}

export async function getEmailVerifyCooldownRemaining(email: string) {
  const latest = await prisma.emailVerificationToken.findFirst({
    where: { email: email.toLowerCase() },
    orderBy: { createdAt: "desc" },
  });

  if (!latest) return 0;

  const cooldownEndsAt = latest.createdAt.getTime() + EMAIL_VERIFY_COOLDOWN_SECONDS * 1000;
  const remaining = Math.ceil((cooldownEndsAt - Date.now()) / 1000);

  return remaining > 0 ? remaining : 0;
}

export async function createEmailVerificationToken(email: string) {
  const normalizedEmail = email.toLowerCase();
  const remaining = await getEmailVerifyCooldownRemaining(normalizedEmail);

  if (remaining > 0) {
    return { ok: false as const, cooldownRemaining: remaining };
  }

  const rawToken = generateToken();
  const tokenHash = await bcrypt.hash(rawToken, 10);
  const expiresAt = new Date(Date.now() + EMAIL_VERIFY_EXPIRY_HOURS * 60 * 60 * 1000);

  await prisma.emailVerificationToken.create({
    data: {
      email: normalizedEmail,
      tokenHash,
      expiresAt,
    },
  });

  const verifyUrl = `${getAppUrl()}/api/auth/verify-email?token=${rawToken}`;

  return {
    ok: true as const,
    verifyUrl,
    rawToken,
    cooldownRemaining: EMAIL_VERIFY_COOLDOWN_SECONDS,
  };
}

export async function verifyEmailToken(rawToken: string) {
  const tokens = await prisma.emailVerificationToken.findMany({
    where: {
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  for (const record of tokens) {
    const matches = await bcrypt.compare(rawToken, record.tokenHash);
    if (!matches) continue;

    await prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });

    return { ok: true as const, email: record.email };
  }

  return { ok: false as const, reason: "invalid" as const };
}

export async function sendVerificationEmail(email: string, verifyUrl: string) {
  console.info(`[email] Verify email for ${email}: ${verifyUrl}`);
}
