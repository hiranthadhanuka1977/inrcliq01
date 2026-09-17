import { createHmac, timingSafeEqual } from "node:crypto";

const WATCH_MAX_AGE_MS = 48 * 60 * 60 * 1000;

function getSecret() {
  return (
    process.env.AUTH_SECRET?.trim() ||
    process.env.FULL_SYNC_SECRET?.trim() ||
    process.env.CONTENT_SAFETY_KEY?.trim() ||
    "dev-parent-approval-watch-secret"
  );
}

export function createApprovalWatchToken(childUserId: string) {
  const issuedAt = Date.now().toString(36);
  const payload = `${childUserId}.${issuedAt}`;
  const sig = createHmac("sha256", getSecret()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifyApprovalWatchToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [childUserId, issuedAt, sig] = parts;
  if (!childUserId || !issuedAt || !sig) return null;

  const payload = `${childUserId}.${issuedAt}`;
  const expected = createHmac("sha256", getSecret()).update(payload).digest("hex");

  try {
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  const issuedMs = Number.parseInt(issuedAt, 36);
  if (!Number.isFinite(issuedMs) || Date.now() - issuedMs > WATCH_MAX_AGE_MS) {
    return null;
  }

  return childUserId;
}
