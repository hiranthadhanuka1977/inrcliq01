import { ensureCreatorForPublicIdentifier } from "@/lib/feed/creator-user-bridge";
import { prisma } from "@/lib/prisma";
import { generatePartnerKey } from "@/lib/partner-api/auth";

export type SettingsPartner = {
  id: string;
  name: string;
  createdAt: string;
  postsCount: number;
  keys: { id: string; prefix: string; createdAt: string; lastUsedAt: string | null; revokedAt: string | null }[];
  creators: { id: string; name: string; handle: string; slug: string | null; verified: boolean }[];
};

type Result<T> = ({ ok: true } & T) | { ok: false; status: number; error: string };

export async function listSettingsPartners(): Promise<SettingsPartner[]> {
  const partners = await prisma.feedPartner.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      keys: { orderBy: { createdAt: "desc" } },
      creators: {
        orderBy: { createdAt: "asc" },
        include: { creator: { select: { id: true, name: true, handle: true, slug: true, verified: true } } },
      },
      _count: { select: { posts: true } },
    },
  });

  return partners.map((partner) => ({
    id: partner.id,
    name: partner.name,
    createdAt: partner.createdAt.toISOString(),
    postsCount: partner._count.posts,
    keys: partner.keys.map((key) => ({
      id: key.id,
      prefix: key.prefix,
      createdAt: key.createdAt.toISOString(),
      lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
      revokedAt: key.revokedAt?.toISOString() ?? null,
    })),
    creators: partner.creators.map(({ creator }) => ({ ...creator, handle: `@${creator.handle.replace(/^@/, "")}` })),
  }));
}

async function insertKey(partnerId: string) {
  const { key, prefix, keyHash } = generatePartnerKey();
  await prisma.feedPartnerKey.create({ data: { partnerId, prefix, keyHash } });
  return key;
}

export async function createSettingsPartner(rawName: unknown): Promise<Result<{ partnerId: string; key: string }>> {
  const name = typeof rawName === "string" ? rawName.trim() : "";
  if (!name || name.length > 80) {
    return { ok: false, status: 400, error: "Enter a partner name (up to 80 characters)." };
  }
  const partner = await prisma.feedPartner.create({ data: { name }, select: { id: true } });
  return { ok: true, partnerId: partner.id, key: await insertKey(partner.id) };
}

/** Removes the partner, its keys and creator links. Posts it published stay in the feed. */
export async function deleteSettingsPartner(partnerId: string): Promise<Result<object>> {
  const { count } = await prisma.feedPartner.deleteMany({ where: { id: partnerId } });
  return count ? { ok: true } : { ok: false, status: 404, error: "Partner not found." };
}

export async function issueSettingsPartnerKey(partnerId: string): Promise<Result<{ key: string }>> {
  const partner = await prisma.feedPartner.findUnique({ where: { id: partnerId }, select: { id: true } });
  if (!partner) return { ok: false, status: 404, error: "Partner not found." };
  return { ok: true, key: await insertKey(partner.id) };
}

export async function revokeSettingsPartnerKey(partnerId: string, keyId: string): Promise<Result<object>> {
  const { count } = await prisma.feedPartnerKey.updateMany({
    where: { id: keyId, partnerId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return count ? { ok: true } : { ok: false, status: 404, error: "Active key not found." };
}

export async function linkSettingsPartnerCreator(partnerId: string, rawHandle: unknown): Promise<Result<object>> {
  const handle = typeof rawHandle === "string" ? rawHandle.trim().replace(/^@/, "") : "";
  if (!handle) return { ok: false, status: 400, error: "Enter a creator handle." };

  const [partner, creator] = await Promise.all([
    prisma.feedPartner.findUnique({ where: { id: partnerId }, select: { id: true } }),
    prisma.creatorUser.findFirst({
      where: {
        OR: [`@${handle}`, handle].map((value) => ({ handle: { equals: value, mode: "insensitive" as const } })),
      },
      select: { id: true },
    }),
  ]);
  if (!partner) return { ok: false, status: 404, error: "Partner not found." };

  // Members only get a creator identity on their first post, so create it here if they haven't posted yet.
  const creatorId = creator?.id ?? (await ensureCreatorForPublicIdentifier(handle))?.id;
  if (!creatorId) return { ok: false, status: 404, error: `No creator or member with the handle @${handle}.` };

  await prisma.feedPartnerCreator.upsert({
    where: { partnerId_creatorId: { partnerId, creatorId } },
    create: { partnerId, creatorId },
    update: {},
  });
  return { ok: true };
}

export async function unlinkSettingsPartnerCreator(partnerId: string, creatorId: string): Promise<Result<object>> {
  const { count } = await prisma.feedPartnerCreator.deleteMany({ where: { partnerId, creatorId } });
  return count ? { ok: true } : { ok: false, status: 404, error: "That creator isn't linked to this partner." };
}
