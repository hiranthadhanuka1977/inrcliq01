import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  normalizeSellerProduct,
  type SellerCollectionConfig,
} from "@/lib/seller/collection-helpers";
import type {
  CollectionProduct,
  CollectionProductDetail,
  CollectionProductOffer,
  CreatorCollection,
} from "@/types/feed/collection";

function toJsonValue(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value == null) return Prisma.JsonNull;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function toProductCreateData(product: CollectionProduct, sortOrder: number) {
  return {
    productKey: product.id,
    kind: product.kind,
    name: product.name,
    price: product.price,
    compareAtPrice: product.compareAtPrice ?? null,
    description: product.description,
    image: product.image,
    imageAlt: product.image_alt,
    rating: product.rating,
    soldLabel: product.soldLabel,
    offerJson: product.offer ? toJsonValue(product.offer) : Prisma.JsonNull,
    ctaLabel: product.ctaLabel ?? null,
    detailJson: product.detail ? toJsonValue(product.detail) : Prisma.JsonNull,
    active: product.active !== false,
    published: product.published === true,
    sortOrder,
  };
}

const COLLECTION_FILES: Record<string, string> = {
  "mia-chen": "mia-chen-collection.json",
  "planet-unfolded": "planet-unfolded-collection.json",
  "good-guy-podcast": "good-guy-podcast-collection.json",
};

function readJsonCollection(slug: string): CreatorCollection | null {
  const fileName = COLLECTION_FILES[slug];
  if (!fileName) return null;
  const filePath = join(process.cwd(), "data", fileName);
  if (!existsSync(filePath)) return null;
  const raw = readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as CreatorCollection;
}

function mapDbProduct(product: {
  productKey: string;
  kind: string;
  name: string;
  price: string;
  compareAtPrice: string | null;
  description: string;
  image: string;
  imageAlt: string;
  rating: number;
  soldLabel: string;
  offerJson: unknown;
  ctaLabel: string | null;
  detailJson: unknown;
  active: boolean;
  published: boolean;
}): CollectionProduct {
  return {
    id: product.productKey,
    kind: product.kind === "digital" ? "digital" : "physical",
    name: product.name,
    price: product.price,
    compareAtPrice: product.compareAtPrice ?? undefined,
    description: product.description,
    image: product.image,
    image_alt: product.imageAlt,
    rating: product.rating,
    soldLabel: product.soldLabel,
    offer: (product.offerJson as CollectionProductOffer | null) ?? undefined,
    ctaLabel: product.ctaLabel ?? undefined,
    detail: (product.detailJson as CollectionProductDetail | null) ?? undefined,
    active: product.active,
    published: product.published,
  };
}

async function findCreatorForUser(userId: string, slug: string) {
  const byUser = await prisma.creatorUser.findFirst({
    where: { userId },
    select: { id: true, slug: true, name: true },
  });
  if (byUser) return byUser;

  return prisma.creatorUser.findFirst({
    where: { slug },
    select: { id: true, slug: true, name: true },
  });
}

/**
 * Ensure the logged-in seller has a CreatorCollection row.
 * Seeds from JSON once when missing; otherwise creates an empty storefront.
 */
export async function ensureSellerCollectionForUser(
  userId: string,
  slug: string,
  displayName: string,
): Promise<SellerCollectionConfig> {
  const existing = await prisma.creatorCollection.findUnique({
    where: { slug },
    include: { products: { orderBy: { sortOrder: "asc" } } },
  });

  if (existing) {
    return {
      enabled: existing.enabled,
      title: existing.title,
      subtitle: existing.subtitle,
      products: existing.products.map(mapDbProduct),
      updatedAt: existing.updatedAt.toISOString(),
    };
  }

  const creator = await findCreatorForUser(userId, slug);
  if (!creator) {
    throw new Error("Creator profile is required before managing a collection.");
  }

  const seed = readJsonCollection(slug);
  const title = seed?.title?.trim() || `${displayName} Collection`;
  const subtitle =
    seed?.subtitle?.trim() || "Products and offerings fans can buy from your storefront.";
  const seedProducts = (seed?.products ?? []).map((product) =>
    normalizeSellerProduct({
      ...product,
      active: product.active !== false,
      // Seeded catalogs are already public.
      published: true,
    }),
  );

  const created = await prisma.creatorCollection.create({
    data: {
      slug,
      title,
      subtitle,
      enabled: true,
      source: seed ? "collection-json" : "seller",
      creatorId: creator.id,
      products: {
        create: seedProducts.map((product, index) => toProductCreateData(product, index)),
      },
    },
    include: { products: { orderBy: { sortOrder: "asc" } } },
  });

  return {
    enabled: created.enabled,
    title: created.title,
    subtitle: created.subtitle,
    products: created.products.map(mapDbProduct),
    updatedAt: created.updatedAt.toISOString(),
  };
}

export async function getSellerCollectionForUser(
  userId: string,
  slug: string,
  displayName: string,
): Promise<SellerCollectionConfig> {
  return ensureSellerCollectionForUser(userId, slug, displayName);
}

export async function writeSellerCollectionForUser(
  userId: string,
  slug: string,
  displayName: string,
  config: SellerCollectionConfig,
): Promise<SellerCollectionConfig> {
  const creator = await findCreatorForUser(userId, slug);
  if (!creator) {
    throw new Error("Creator profile is required before managing a collection.");
  }

  const products = config.products.map(normalizeSellerProduct);
  const used = new Set<string>();
  for (const product of products) {
    if (!product.id || used.has(product.id)) {
      throw new Error(`Duplicate or missing product id: ${product.id || "(empty)"}`);
    }
    used.add(product.id);
  }

  const existing = await prisma.creatorCollection.findUnique({
    where: { slug },
    select: { id: true },
  });

  const collectionId =
    existing?.id ??
    (
      await prisma.creatorCollection.create({
        data: {
          slug,
          title: config.title.trim() || `${displayName} Collection`,
          subtitle: config.subtitle.trim(),
          enabled: Boolean(config.enabled),
          source: "seller",
          creatorId: creator.id,
        },
        select: { id: true },
      })
    ).id;

  await prisma.$transaction(async (tx) => {
    await tx.creatorCollection.update({
      where: { id: collectionId },
      data: {
        title: config.title.trim() || `${displayName} Collection`,
        subtitle: config.subtitle.trim(),
        enabled: Boolean(config.enabled),
        source: "seller",
        creatorId: creator.id,
      },
    });

    await tx.collectionProduct.deleteMany({ where: { collectionId } });

    if (products.length > 0) {
      await tx.collectionProduct.createMany({
        data: products.map((product, index) => ({
          collectionId,
          ...toProductCreateData(product, index),
        })),
      });
    }
  });

  const saved = await prisma.creatorCollection.findUniqueOrThrow({
    where: { id: collectionId },
    include: { products: { orderBy: { sortOrder: "asc" } } },
  });

  return {
    enabled: saved.enabled,
    title: saved.title,
    subtitle: saved.subtitle,
    products: saved.products.map(mapDbProduct),
    updatedAt: saved.updatedAt.toISOString(),
  };
}
