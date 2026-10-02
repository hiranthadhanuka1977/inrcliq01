import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

const KEY_PREFIX = "ink_live_";
const LAST_USED_RESOLUTION_MS = 60_000;

export type AuthenticatedPartner = { partnerId: string; partnerName: string; keyId: string };

export function hashPartnerKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

/** The full key is returned once and never stored; only its hash and a short display prefix are kept. */
export function generatePartnerKey() {
  const key = `${KEY_PREFIX}${randomBytes(32).toString("base64url")}`;
  return { key, prefix: key.slice(0, KEY_PREFIX.length + 6), keyHash: hashPartnerKey(key) };
}

export async function authenticatePartner(request: Request): Promise<AuthenticatedPartner | null> {
  const match = /^Bearer\s+(\S+)$/i.exec(request.headers.get("authorization")?.trim() ?? "");
  const key = match?.[1];
  if (!key?.startsWith(KEY_PREFIX)) return null;

  const row = await prisma.feedPartnerKey.findUnique({
    where: { keyHash: hashPartnerKey(key) },
    select: { id: true, partnerId: true, revokedAt: true, lastUsedAt: true, partner: { select: { name: true } } },
  });
  if (!row || row.revokedAt) return null;

  if (!row.lastUsedAt || Date.now() - row.lastUsedAt.getTime() > LAST_USED_RESOLUTION_MS) {
    await prisma.feedPartnerKey
      .update({ where: { id: row.id }, data: { lastUsedAt: new Date() } })
      .catch((error) => console.error("partner-api: unable to record key use", error));
  }

  return { partnerId: row.partnerId, partnerName: row.partner.name, keyId: row.id };
}
