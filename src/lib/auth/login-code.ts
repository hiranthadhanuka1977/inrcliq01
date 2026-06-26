import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

import { LOGIN_CODE_COOLDOWN_SECONDS, LOGIN_CODE_EXPIRY_MINUTES } from "@/lib/auth/login-code.constants";
import { buildLoginCodeEmail } from "@/lib/email/templates";
import { sendTransactionalEmailOrThrow } from "@/lib/email/send";

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function getLoginCodeCooldownRemaining(email: string) {
  const latest = await prisma.loginCode.findFirst({
    where: { email: email.toLowerCase() },
    orderBy: { createdAt: "desc" },
  });

  if (!latest) return 0;

  const cooldownEndsAt =
    latest.createdAt.getTime() + LOGIN_CODE_COOLDOWN_SECONDS * 1000;
  const remaining = Math.ceil((cooldownEndsAt - Date.now()) / 1000);

  return remaining > 0 ? remaining : 0;
}

export async function createLoginCode(email: string) {
  const normalizedEmail = email.toLowerCase();
  const remaining = await getLoginCodeCooldownRemaining(normalizedEmail);

  if (remaining > 0) {
    return { ok: false as const, cooldownRemaining: remaining };
  }

  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + LOGIN_CODE_EXPIRY_MINUTES * 60 * 1000);

  await prisma.loginCode.create({
    data: {
      email: normalizedEmail,
      codeHash,
      expiresAt,
    },
  });

  return { ok: true as const, code, cooldownRemaining: LOGIN_CODE_COOLDOWN_SECONDS };
}

export async function verifyLoginCode(email: string, code: string) {
  const normalizedEmail = email.toLowerCase();
  const record = await prisma.loginCode.findFirst({
    where: {
      email: normalizedEmail,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    return { ok: false as const, reason: "invalid" as const };
  }

  const matches = await bcrypt.compare(code, record.codeHash);
  if (!matches) {
    return { ok: false as const, reason: "invalid" as const };
  }

  await prisma.loginCode.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  return { ok: true as const };
}

export async function findUserForLogin(email: string) {
  const normalizedEmail = email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (!user) {
    return { ok: false as const, reason: "not_found" as const };
  }

  if (!user.emailVerified) {
    return { ok: false as const, reason: "unverified" as const };
  }

  return { ok: true as const, user };
}

export async function sendLoginCodeEmail(email: string, code: string) {
  const template = buildLoginCodeEmail(code);

  await sendTransactionalEmailOrThrow({
    to: email,
    subject: template.subject,
    html: template.html,
    text: template.text,
    debugMessage: `[email] Login code for ${email}: ${code}`,
  });
}
