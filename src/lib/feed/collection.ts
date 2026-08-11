import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";
import { isProductLive, toPublicCollection } from "@/lib/seller/collection-helpers";
import type {
  CollectionProduct,
  CollectionProductDetail,
  CollectionProductOffer,
  CreatorCollection,
} from "@/types/feed/collection";

const COLLECTION_FILES: Record<string, string> = {
  "mia-chen": "mia-chen-collection.json",
  "planet-unfolded": "planet-unfolded-collection.json",
  "good-guy-podcast": "good-guy-podcast-collection.json",
};

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
  active?: boolean;
  published?: boolean;
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
    active: product.active !== false,
    published: product.published === true,
  };
}

function getCreatorCollectionFromJson(slug: string): CreatorCollection | null {
  const fileName = COLLECTION_FILES[slug];
  if (!fileName) return null;

  const filePath = join(process.cwd(), "data", fileName);
  if (!existsSync(filePath)) return null;

  const raw = readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw) as CreatorCollection;
  // JSON seeds are treated as live/public unless explicitly marked otherwise.
  return {
    ...parsed,
    enabled: parsed.enabled !== false,
    products: parsed.products.map((product) => ({
      ...product,
      active: product.active !== false,
      published: product.published !== false,
    })),
  };
}

function mapCollectionRow(collection: {
  slug: string;
  title: string;
  subtitle: string;
  enabled: boolean;
  products: Array<{
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
  }>;
}): CreatorCollection {
  return {
    slug: collection.slug,
    title: collection.title,
    subtitle: collection.subtitle,
    enabled: collection.enabled,
    products: collection.products.map(mapDbProduct),
  };
}

/** Full seller-facing catalog (includes drafts / inactive). */
export async function getCreatorCollectionRaw(slug: string): Promise<CreatorCollection | null> {
  try {
    const collection = await prisma.creatorCollection.findUnique({
      where: { slug },
      include: {
        products: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (!collection) {
      return getCreatorCollectionFromJson(slug);
    }

    return mapCollectionRow(collection);
  } catch (error) {
    console.error("getCreatorCollectionRaw: falling back to JSON", error);
    return getCreatorCollectionFromJson(slug);
  }
}

/** Public storefront: hidden when disabled; only live products. */
export async function getCreatorCollection(slug: string): Promise<CreatorCollection | null> {
  const raw = await getCreatorCollectionRaw(slug);
  if (!raw) return null;
  return toPublicCollection(raw);
}

export async function getCollectionProduct(
  slug: string,
  productId: string,
): Promise<{ collection: CreatorCollection; product: CollectionProduct } | null> {
  const publicCollection = await getCreatorCollection(slug);
  if (!publicCollection) return null;

  const product = publicCollection.products.find((item) => item.id === productId);
  if (!product || !isProductLive(product)) return null;

  return { collection: publicCollection, product };
}
