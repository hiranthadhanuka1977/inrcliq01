export type CollectionProductKind = "physical" | "digital";

export interface CollectionProductOffer {
  badge: string;
  detail: string;
  discountLabel?: string;
}

export interface CollectionProductGalleryImage {
  src: string;
  alt: string;
}

export interface CollectionProductColor {
  id: string;
  label: string;
  swatch: string;
  image: string;
}

export interface CollectionProductSize {
  id: string;
  label: string;
  hint: string;
}

export interface CollectionProductReviewAttribute {
  label: string;
  score: number;
}

export interface CollectionProductReview {
  id: string;
  name: string;
  avatar_initials: string;
  rating: number;
  ago: string;
  variant: string;
  text: string;
}

export interface CollectionProductDelivery {
  location: string;
  standardFee: string;
  cod: boolean;
  returns: string;
  warranty: string;
}

export interface CollectionProductDetail {
  headline: string;
  gallery: CollectionProductGalleryImage[];
  colors: CollectionProductColor[];
  sizes: CollectionProductSize[];
  defaultColorId: string;
  defaultSizeId: string;
  longDescription: string;
  reviewAverage?: number;
  reviewCount?: number;
  reviewAttributes?: CollectionProductReviewAttribute[];
  reviews?: CollectionProductReview[];
  reviewsTotal?: number;
  delivery: CollectionProductDelivery;
}

export interface CollectionProduct {
  id: string;
  kind: CollectionProductKind;
  name: string;
  price: string;
  compareAtPrice?: string;
  description: string;
  image: string;
  image_alt: string;
  rating: number;
  soldLabel: string;
  offer?: CollectionProductOffer;
  ctaLabel?: string;
  detail?: CollectionProductDetail;
}

export interface CreatorCollection {
  slug: string;
  title: string;
  subtitle: string;
  products: CollectionProduct[];
}
