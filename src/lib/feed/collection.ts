import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";
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
  };
}

function getCreatorCollectionFromJson(slug: string): CreatorCollection | null {
  const fileName = COLLECTION_FILES[slug];
  if (!fileName) return null;

  const filePath = join(process.cwd(), "data", fileName);
  if (!existsSync(filePath)) return null;

  const raw = readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as CreatorCollection;
}

export async function getCreatorCollection(slug: string): Promise<CreatorCollection | null> {
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

    return {
      slug: collection.slug,
      title: collection.title,
      subtitle: collection.subtitle,
      products: collection.products.map(mapDbProduct),
    };
  } catch (error) {
    console.error("getCreatorCollection: falling back to JSON", error);
    return getCreatorCollectionFromJson(slug);
  }
}

export async function getCollectionProduct(
  slug: string,
  productId: string,
): Promise<{ collection: CreatorCollection; product: CollectionProduct } | null> {
  try {
    const collection = await prisma.creatorCollection.findUnique({
      where: { slug },
      include: {
        products: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (!collection) {
      const fromJson = getCreatorCollectionFromJson(slug);
      if (!fromJson) return null;
      const product = fromJson.products.find((item) => item.id === productId);
      if (!product) return null;
      return { collection: fromJson, product };
    }

    const mapped: CreatorCollection = {
      slug: collection.slug,
      title: collection.title,
      subtitle: collection.subtitle,
      products: collection.products.map(mapDbProduct),
    };

    const product = mapped.products.find((item) => item.id === productId);
    if (!product) return null;

    return { collection: mapped, product };
  } catch (error) {
    console.error("getCollectionProduct: falling back to JSON", error);
    const fromJson = getCreatorCollectionFromJson(slug);
    if (!fromJson) return null;
    const product = fromJson.products.find((item) => item.id === productId);
    if (!product) return null;
    return { collection: fromJson, product };
  }
}
