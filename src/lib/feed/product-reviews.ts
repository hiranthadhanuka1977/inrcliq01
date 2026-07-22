import type {
  CollectionProduct,
  CollectionProductReview,
  CollectionProductReviewAttribute,
} from "@/types/feed/collection";

export type ProductReviewsBlock = {
  average: number;
  count: number;
  attributes: CollectionProductReviewAttribute[];
  reviews: CollectionProductReview[];
  total: number;
  empty: boolean;
};

const REVIEWERS = [
  { name: "Ananya Perera", initials: "AP" },
  { name: "Rohan Silva", initials: "RS" },
  { name: "Meera Jay", initials: "MJ" },
  { name: "Kavish Fernando", initials: "KF" },
  { name: "Sara Malik", initials: "SM" },
  { name: "Dev Patel", initials: "DP" },
  { name: "Nina Okoye", initials: "NO" },
  { name: "Luis Ortega", initials: "LO" },
  { name: "Priya Nair", initials: "PN" },
  { name: "James Cole", initials: "JC" },
] as const;

const REVIEW_TEXTS = [
  "Exactly as described. Quality feels premium and shipping was smooth.",
  "Used this on race week and it held up better than expected. Would buy again.",
  "Great value for the price. Fit and finish are solid for everyday training.",
  "Slightly better than I hoped. Clear instructions and useful right away.",
  "Looks sharp and feels durable. Already recommending it to my run club.",
  "Packaged well and matched the photos. Comfortable from the first use.",
  "A small upgrade that made a noticeable difference on long sessions.",
  "Clean design, good materials, and no surprises on sizing.",
] as const;

const PHYSICAL_VARIANTS = [
  "Color: Black · Size: M",
  "Color: White · Size: L",
  "Color: Navy · Size: S",
  "Color: Olive · Size: XL",
  "Standard · One size",
] as const;

const DIGITAL_VARIANTS = [
  "Format: PDF",
  "Format: Spreadsheet",
  "Format: Audio pack",
  "Format: Video series",
  "Instant download",
] as const;

const AGOS = ["2 days ago", "5 days ago", "1 week ago", "2 weeks ago", "3 weeks ago"] as const;

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pick<T>(items: readonly T[], seed: number, offset = 0): T {
  return items[(seed + offset) % items.length];
}

function scoreFromSeed(seed: number, offset: number, base = 4.4): number {
  const bump = ((seed >> offset) & 7) / 20;
  return Math.round((base + bump) * 10) / 10;
}

function buildGeneratedReviews(product: CollectionProduct, seed: number): ProductReviewsBlock {
  const average = Math.min(5, scoreFromSeed(seed, 3, 4.3 + (product.rating - 4) * 0.2));
  const count = 8 + (seed % 17);
  const attributes: CollectionProductReviewAttribute[] = [
    { label: "Fit", score: Math.min(5, scoreFromSeed(seed, 1, 4.5)) },
    { label: "Quality", score: Math.min(5, scoreFromSeed(seed, 5, 4.4)) },
    { label: "Value for Money", score: Math.min(5, scoreFromSeed(seed, 9, 4.3)) },
  ];

  const variants = product.kind === "digital" ? DIGITAL_VARIANTS : PHYSICAL_VARIANTS;
  const reviews: CollectionProductReview[] = Array.from({ length: count }, (_, index) => {
    const reviewer = pick(REVIEWERS, seed, index * 3);
    const rating = 4 + ((seed + index) % 2);
    return {
      id: `${product.id}-review-${index + 1}`,
      name: reviewer.name,
      avatar_initials: reviewer.initials,
      rating,
      ago: pick(AGOS, seed, index * 2),
      variant: pick(variants, seed, index + 1),
      text: pick(REVIEW_TEXTS, seed, index * 4),
    };
  });

  return {
    average,
    count,
    attributes,
    reviews,
    total: count,
    empty: false,
  };
}

export function resolveProductReviews(product: CollectionProduct): ProductReviewsBlock {
  const detail = product.detail;
  const existing = detail?.reviews;

  if (existing && existing.length > 0) {
    return {
      average: detail.reviewAverage ?? product.rating,
      count: detail.reviewCount ?? existing.length,
      attributes: detail.reviewAttributes?.length
        ? detail.reviewAttributes
        : [
            { label: "Fit", score: 4.8 },
            { label: "Quality", score: 4.7 },
            { label: "Value for Money", score: 4.6 },
          ],
      reviews: existing,
      total: detail.reviewsTotal ?? detail.reviewCount ?? existing.length,
      empty: false,
    };
  }

  const seed = hashString(product.id);
  // Deterministic “random”: roughly one third of products have no reviews.
  if (seed % 3 === 0) {
    return {
      average: 0,
      count: 0,
      attributes: [],
      reviews: [],
      total: 0,
      empty: true,
    };
  }

  return buildGeneratedReviews(product, seed);
}
