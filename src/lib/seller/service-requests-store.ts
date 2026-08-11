import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  getCreatorRequests,
  type CreatorRequestsContent,
} from "@/lib/feed/special-requests";
import { prisma } from "@/lib/prisma";
import {
  pruneOrphanGalleryItems,
  toPublicCreatorRequestsContent,
  type SellerServiceRequestsConfig,
} from "@/lib/seller/service-requests-helpers";

export type { SellerServiceRequestsConfig };

function cloneContent(content: CreatorRequestsContent): CreatorRequestsContent {
  return JSON.parse(JSON.stringify(content)) as CreatorRequestsContent;
}

function isValidContent(value: unknown): value is CreatorRequestsContent {
  if (!value || typeof value !== "object") return false;
  const content = value as CreatorRequestsContent;
  return Array.isArray(content.categories) && typeof content.startingRange === "string";
}

function parseCatalogContent(value: unknown): CreatorRequestsContent | null {
  if (!isValidContent(value)) return null;
  return cloneContent(value);
}

function sellerJsonPath(slug: string) {
  return join(process.cwd(), "data", "seller-service-requests", `${slug}.json`);
}

function readFileFallback(slug: string): SellerServiceRequestsConfig | null {
  const filePath = sellerJsonPath(slug);
  if (!existsSync(filePath)) return null;
  try {
    const parsed = JSON.parse(readFileSync(filePath, "utf-8")) as SellerServiceRequestsConfig;
    if (!parsed?.content?.categories || typeof parsed.enabled !== "boolean") return null;
    return {
      enabled: parsed.enabled,
      content: cloneContent(parsed.content),
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function writeFileOverride(slug: string, config: SellerServiceRequestsConfig) {
  const dir = join(process.cwd(), "data", "seller-service-requests");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    sellerJsonPath(slug),
    JSON.stringify(
      {
        enabled: config.enabled,
        content: config.content,
        updatedAt: config.updatedAt,
      },
      null,
      2,
    ),
    "utf-8",
  );
}

async function findOwnerUserIdBySlug(slug: string): Promise<string | null> {
  const profile = await prisma.userProfile.findFirst({
    where: { slug },
    select: { userId: true },
  });
  if (profile?.userId) return profile.userId;

  const creator = await prisma.creatorUser.findFirst({
    where: { slug },
    select: { userId: true },
  });
  return creator?.userId ?? null;
}

async function findOwnerSlugByUserId(userId: string): Promise<string | null> {
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { slug: true },
  });
  if (profile?.slug) return profile.slug;

  const creator = await prisma.creatorUser.findFirst({
    where: { userId },
    select: { slug: true },
  });
  return creator?.slug ?? null;
}

export async function getSpecialRequestCatalogByUserId(
  userId: string,
): Promise<SellerServiceRequestsConfig | null> {
  if (typeof prisma.specialRequestCatalog?.findUnique !== "function") {
    return null;
  }

  const row = await prisma.specialRequestCatalog.findUnique({
    where: { userId },
    select: { enabled: true, content: true, updatedAt: true },
  });
  if (!row) return null;

  const content = parseCatalogContent(row.content);
  if (!content) return null;

  return {
    enabled: row.enabled,
    content,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getSpecialRequestCatalogBySlug(
  slug: string,
): Promise<SellerServiceRequestsConfig | null> {
  const userId = await findOwnerUserIdBySlug(slug);
  if (userId) {
    // Linked creator/profile: Seller Tools DB catalog is the only source of truth.
    // Never revive seed JSON / hardcoded REQUESTS_BY_SLUG for these accounts.
    return getSpecialRequestCatalogByUserId(userId);
  }

  return readFileFallback(slug);
}

export async function resolveCreatorRequestsContent(
  slug: string,
): Promise<CreatorRequestsContent | null> {
  const catalog = await getSpecialRequestCatalogBySlug(slug);
  if (!catalog) return null;
  if (!catalog.enabled) return null;

  return toPublicCreatorRequestsContent(cloneContent(catalog.content));
}

/** Creator offers Special Requests (catalog / seed exists), whether or not currently live. */
export async function resolveSpecialRequestsAvailable(slug: string): Promise<boolean> {
  const userId = await findOwnerUserIdBySlug(slug);
  if (userId) {
    const catalog = await getSpecialRequestCatalogByUserId(userId);
    return Boolean(catalog);
  }

  if (readFileFallback(slug)) return true;
  return Boolean(getCreatorRequests(slug));
}

export async function resolveSpecialRequestsEnabled(
  slug: string,
  fallback?: boolean,
): Promise<boolean> {
  const userId = await findOwnerUserIdBySlug(slug);
  if (userId) {
    const catalog = await getSpecialRequestCatalogByUserId(userId);
    if (catalog) return catalog.enabled;
    // Profile is linked but has no seller catalog — do not invent one from seed data.
    return typeof fallback === "boolean" ? fallback : false;
  }

  const file = readFileFallback(slug);
  if (file) return file.enabled;

  if (typeof fallback === "boolean") return fallback;
  return Boolean(getCreatorRequests(slug));
}

export async function getSellerServiceRequestsConfigForUser(
  userId: string,
): Promise<SellerServiceRequestsConfig | null> {
  return getSpecialRequestCatalogByUserId(userId);
}

export async function writeSellerServiceRequestsConfigForUser(
  userId: string,
  config: SellerServiceRequestsConfig,
): Promise<SellerServiceRequestsConfig> {
  const content = pruneOrphanGalleryItems(cloneContent(config.content));
  const enabled = Boolean(config.enabled);

  const saved = await prisma.specialRequestCatalog.upsert({
    where: { userId },
    create: {
      userId,
      enabled,
      content,
      source: "seller",
    },
    update: {
      enabled,
      content,
      source: "seller",
    },
    select: { enabled: true, content: true, updatedAt: true },
  });

  await prisma.userProfile.updateMany({
    where: { userId },
    data: { specialRequests: enabled },
  });

  const parsed = parseCatalogContent(saved.content);
  const result: SellerServiceRequestsConfig = {
    enabled: saved.enabled,
    content: parsed ?? content,
    updatedAt: saved.updatedAt.toISOString(),
  };

  // Keep the JSON fallback in sync so public pages never revive a removed offering.
  const slug = await findOwnerSlugByUserId(userId);
  if (slug) {
    try {
      writeFileOverride(slug, result);
    } catch (error) {
      console.error("Failed to sync seller-service-requests JSON override", error);
    }
  }

  return result;
}
