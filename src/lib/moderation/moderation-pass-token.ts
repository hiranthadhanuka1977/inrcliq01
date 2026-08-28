import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const TTL_MS = 10 * 60 * 1000;

function getSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim() || process.env.FULL_SYNC_SECRET?.trim();
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("Missing AUTH_SECRET for moderation pass tokens.");
  }
  return "dev-moderation-pass-secret";
}

export function hashImageBytes(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function createModerationPassToken(userId: string, fileHash: string): string {
  const exp = Date.now() + TTL_MS;
  const payload = `${userId}:${fileHash}:${exp}`;
  const sig = createHmac("sha256", getSecret()).update(payload).digest("hex");
  return `${exp}.${sig}`;
}

export function verifyModerationPassToken(userId: string, fileHash: string, token: string): boolean {
  const trimmed = token.trim();
  if (!trimmed) return false;

  const dot = trimmed.indexOf(".");
  if (dot <= 0) return false;

  const exp = Number(trimmed.slice(0, dot));
  const sig = trimmed.slice(dot + 1);
  if (!Number.isFinite(exp) || !sig || Date.now() > exp) return false;

  const payload = `${userId}:${fileHash}:${exp}`;
  const expected = createHmac("sha256", getSecret()).update(payload).digest("hex");

  try {
    const sigBuffer = Buffer.from(sig, "hex");
    const expectedBuffer = Buffer.from(expected, "hex");
    if (sigBuffer.length !== expectedBuffer.length) return false;
    return timingSafeEqual(sigBuffer, expectedBuffer);
  } catch {
    return false;
  }
}
