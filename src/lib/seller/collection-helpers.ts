import type {
  CollectionProduct,
  CollectionProductDelivery,
  CollectionProductDetail,
  CollectionProductKind,
  CreatorCollection,
} from "@/types/feed/collection";

export type CollectionSummaryStats = {
  products: number;
  physical: number;
  digital: number;
  sold: number;
  rating: number;
  onOffer: number;
};

function parseSoldCount(label: string): number {
  const match = label.match(/(\d[\d,]*)/);
  if (!match) return 0;
  return Number(match[1].replace(/,/g, "")) || 0;
}

function productRating(product: CollectionProduct): number {
  const detailAverage = product.detail?.reviewAverage;
  if (typeof detailAverage === "number" && detailAverage > 0) return detailAverage;
  return product.rating > 0 ? product.rating : 0;
}

/** Roll-up for the Seller dashboard Collection card (catalog signals). */
export function getCollectionSummaryStats(
  collection: CreatorCollection | null | undefined,
): CollectionSummaryStats {
  const products = collection?.products ?? [];
  if (products.length === 0) {
    return { products: 0, physical: 0, digital: 0, sold: 0, rating: 0, onOffer: 0 };
  }

  const physical = products.filter((product) => product.kind === "physical").length;
  const digital = products.filter((product) => product.kind === "digital").length;
  const sold = products.reduce((sum, product) => sum + parseSoldCount(product.soldLabel), 0);
  const onOffer = products.filter((product) => Boolean(product.offer)).length;

  const ratings = products.map(productRating).filter((value) => value > 0);
  const rating =
    ratings.length === 0
      ? 0
      : Math.round((ratings.reduce((sum, value) => sum + value, 0) / ratings.length) * 10) / 10;

  return {
    products: products.length,
    physical,
    digital,
    sold,
    rating,
    onOffer,
  };
}

export type SellerCollectionConfig = {
  enabled: boolean;
  title: string;
  subtitle: string;
  products: CollectionProduct[];
  updatedAt?: string;
};

export type ProductReadinessStatus = "ready" | "needs_setup" | "draft" | "inactive";

export type ProductReadiness = {
  status: ProductReadinessStatus;
  label: string;
};

export function slugifyProductKey(name: string, used: Set<string>): string {
  const base =
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "product";

  let candidate = base;
  let index = 2;
  while (used.has(candidate)) {
    candidate = `${base}-${index}`;
    index += 1;
  }
  return candidate;
}

export function defaultDelivery(): CollectionProductDelivery {
  return {
    location: "",
    standardFee: "",
    cod: false,
    returns: "",
    warranty: "",
  };
}

export function defaultProductDetail(name = ""): CollectionProductDetail {
  return {
    headline: name ? `${name} — add a short headline for the product page.` : "",
    gallery: [],
    colors: [],
    sizes: [],
    defaultColorId: "",
    defaultSizeId: "",
    longDescription: "",
    delivery: defaultDelivery(),
  };
}

export function createEmptyProduct(name: string, usedIds: Set<string>): CollectionProduct {
  const id = slugifyProductKey(name, usedIds);
  return {
    id,
    kind: "physical",
    name,
    price: "",
    description: "",
    image: "",
    image_alt: name,
    rating: 0,
    soldLabel: "0 sold",
    ctaLabel: "Add to bag",
    active: true,
    published: false,
    detail: defaultProductDetail(name),
  };
}

export function productHasRequiredImage(product: CollectionProduct): boolean {
  return Boolean(product.image?.trim());
}

export function productHasCoreFields(product: CollectionProduct): boolean {
  return Boolean(
    product.name?.trim() &&
      product.price?.trim() &&
      product.description?.trim() &&
      productHasRequiredImage(product),
  );
}

export function isProductActive(product: CollectionProduct): boolean {
  return product.active !== false;
}

export function isProductPublished(product: CollectionProduct): boolean {
  return product.published === true;
}

/** Public storefront visibility: active + published + core fields. */
export function isProductLive(product: CollectionProduct): boolean {
  return isProductActive(product) && isProductPublished(product) && productHasCoreFields(product);
}

export function getProductReadiness(product: CollectionProduct): ProductReadiness {
  if (!isProductActive(product)) {
    return { status: "inactive", label: "Inactive" };
  }
  if (!productHasCoreFields(product)) {
    return { status: "needs_setup", label: "Needs setup" };
  }
  if (!isProductPublished(product)) {
    return { status: "draft", label: "Draft" };
  }
  return { status: "ready", label: "Ready" };
}

/** Live products for profile strip preview — ignores storefront enabled flag. */
export function getCollectionPreviewProducts(collection: CreatorCollection): CollectionProduct[] {
  return collection.products.filter(isProductLive);
}

export function toPublicCollection(collection: CreatorCollection): CreatorCollection | null {
  if (collection.enabled === false) return null;
  const products = getCollectionPreviewProducts(collection);
  return {
    slug: collection.slug,
    title: collection.title,
    subtitle: collection.subtitle,
    enabled: true,
    products,
  };
}

export function normalizeSellerProduct(product: CollectionProduct): CollectionProduct {
  const detail = product.detail
    ? {
        ...defaultProductDetail(product.name),
        ...product.detail,
        gallery: Array.isArray(product.detail.gallery) ? product.detail.gallery : [],
        colors: Array.isArray(product.detail.colors) ? product.detail.colors : [],
        sizes: Array.isArray(product.detail.sizes) ? product.detail.sizes : [],
        delivery: {
          ...defaultDelivery(),
          ...(product.detail.delivery ?? {}),
        },
      }
    : defaultProductDetail(product.name);

  const kind: CollectionProductKind = product.kind === "digital" ? "digital" : "physical";
  const offerBadge = product.offer?.badge?.trim() || "";
  const offerDetail = product.offer?.detail?.trim() || "";
  const offerDiscount = product.offer?.discountLabel?.trim() || "";

  return {
    ...product,
    id: product.id.trim(),
    kind,
    name: product.name.trim(),
    price: product.price.trim(),
    compareAtPrice: product.compareAtPrice?.trim() || undefined,
    description: product.description.trim(),
    image: product.image.trim(),
    image_alt: product.image_alt.trim() || product.name.trim(),
    rating: typeof product.rating === "number" ? product.rating : 0,
    soldLabel: product.soldLabel?.trim() || "0 sold",
    ctaLabel: product.ctaLabel?.trim() || undefined,
    offer:
      offerBadge || offerDetail || offerDiscount
        ? {
            badge: offerBadge,
            detail: offerDetail,
            discountLabel: offerDiscount || undefined,
          }
        : undefined,
    active: product.active !== false,
    published: product.published === true,
    detail,
  };
}
