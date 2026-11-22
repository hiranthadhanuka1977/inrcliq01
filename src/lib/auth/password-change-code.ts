import bcrypt from "bcryptjs";
import { LOGIN_CODE_COOLDOWN_SECONDS, LOGIN_CODE_EXPIRY_MINUTES } from "@/lib/auth/login-code.constants";
import { sendPasswordChangeCodeEmail } from "@/lib/email/notifications";
import { prisma } from "@/lib/prisma";

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function latestCode(userId: string) {
  return prisma.passwordChangeCode.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createPasswordChangeCode(userId: string, email: string) {
  const latest = await latestCode(userId);
  if (latest) {
    const cooldownEndsAt = latest.createdAt.getTime() + LOGIN_CODE_COOLDOWN_SECONDS * 1000;
    const remaining = Math.ceil((cooldownEndsAt - Date.now()) / 1000);
    if (remaining > 0) {
      return { ok: false as const, error: `Please wait ${remaining} seconds before sending another code.` };
    }
  }

  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + LOGIN_CODE_EXPIRY_MINUTES * 60 * 1000);

  await prisma.passwordChangeCode.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  });
  await prisma.passwordChangeCode.create({
    data: { userId, codeHash, expiresAt },
  });

  await sendPasswordChangeCodeEmail(email, code);

  return { ok: true as const, code, email };
}

export async function findValidPasswordChangeCode(userId: string, code: string) {
  const record = await prisma.passwordChangeCode.findFirst({
    where: { userId, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!record) return null;
  const matches = await bcrypt.compare(code, record.codeHash);
  if (!matches) return null;
  return record;
}
