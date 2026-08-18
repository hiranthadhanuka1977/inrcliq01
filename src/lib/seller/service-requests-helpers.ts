import type {
  CreatorRequestsContent,
  RequestCategory,
  RequestService,
  RequestServiceDetails,
  RequestServiceMedia,
} from "@/lib/feed/special-requests";
import { createDefaultDeliveryFormats } from "@/lib/feed/delivery-formats";

export type SellerServiceRequestsConfig = {
  enabled: boolean;
  content: CreatorRequestsContent;
  updatedAt: string;
};

export function slugifyServiceId(label: string, used: Set<string>): string {
  const base =
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "service";

  let candidate = base;
  let index = 2;
  while (used.has(candidate)) {
    candidate = `${base}-${index}`;
    index += 1;
  }
  return candidate;
}

export function defaultServiceDetails(about = ""): RequestServiceDetails {
  return {
    about,
    onOffer: [],
    booking: [
      "Direct booking: Pay in full to confirm your request instantly.",
      "No approval needed: Your booking is auto-confirmed upon payment.",
      "Delivery: The creator will send the completed message by your selected date.",
    ],
    licensing: [
      "You can download & share your delivery for personal use.",
      "You cannot alter, remix or use it in defamatory/illegal ways.",
      "The Creator retains rights of integrity and attribution.",
    ],
    termsHref: "#",
  };
}

export function defaultServiceMedia(label: string): RequestServiceMedia {
  return {
    kind: "video",
    poster: "",
    caption: `Sample for ${label}`,
  };
}

export function createEmptyService(label: string, usedIds: Set<string>): RequestService {
  const id = slugifyServiceId(label, usedIds);
  return {
    id,
    label,
    blurb: "",
    details: defaultServiceDetails(""),
    media: defaultServiceMedia(label),
    priceMin: 80,
    priceMax: 120,
    popular: false,
    published: false,
    deliveryFormats: createDefaultDeliveryFormats(),
  };
}

export function createEmptyCategory(title: string, usedIds: Set<string>): RequestCategory {
  const id = slugifyServiceId(title, usedIds);
  return {
    id,
    title,
    intent: "",
    blurb: "",
    icon: "gift",
    image: "",
    imageAlt: title,
    popular: false,
    instantBooking: false,
    active: true,
    examples: [],
    formats: ["Video", "Audio", "Text"],
    services: [],
  };
}

/** Blank Seller Tools catalog for newly provisioned verified creators. */
export function createBlankCreatorRequestsContent(
  displayName = "your fans",
): CreatorRequestsContent {
  return {
    intro: [
      `Offer personalized text, audio, and video requests for ${displayName}.`,
      "Add categories and offerings to go live on your profile.",
    ],
    gallery: [],
    categories: [],
    howItWorks: [
      {
        title: "Fans request",
        copy: "They choose a category, offering, format, and delivery date.",
      },
      {
        title: "You create",
        copy: "Fulfill the booking and deliver by the agreed time.",
      },
      {
        title: "Get paid",
        copy: "Payment is captured when the fan books the request.",
      },
    ],
    startingRange: "Set your pricing",
    responseTime: "Set your response time",
    nextAvailable: new Date().toISOString().slice(0, 10),
    guarantee: "Money-back guarantee when delivery terms are not met.",
    guaranteePoints: [
      {
        title: "You set the rules",
        copy: "Choose formats, length options, and pricing per offering.",
      },
      {
        title: "Go live when ready",
        copy: "Keep Special Requests hidden until your first category is ready.",
      },
    ],
  };
}

/** True when the seller has not created any categories yet. */
export function isServiceRequestsCatalogEmpty(
  content: CreatorRequestsContent | null | undefined,
): boolean {
  return !content?.categories?.length;
}

export function getServicePoster(service: RequestService): string {
  return service.media.kind === "video" ? service.media.poster : "";
}

export function withServicePoster(service: RequestService, poster: string): RequestService {
  const caption =
    service.media.kind === "video"
      ? service.media.caption
      : service.media.kind === "audio"
        ? service.media.title
        : `Sample for ${service.label}`;

  return {
    ...service,
    media: {
      kind: "video",
      poster,
      caption,
    },
  };
}

export function categoryHasRequiredImage(category: RequestCategory): boolean {
  return Boolean(category.image.trim());
}

/** Legacy rows without `active` stay available; deactivated categories are hidden from fans. */
export function isCategoryActive(category: RequestCategory): boolean {
  return category.active !== false;
}

/** Video offerings need a poster; audio offerings need a sample src. */
export function serviceHasRequiredImage(service: RequestService): boolean {
  if (service.media.kind === "audio") {
    return Boolean(service.media.src.trim());
  }
  return Boolean(getServicePoster(service).trim());
}

/** Legacy rows without `published` stay live; new offerings default to draft. */
export function isServicePublished(service: RequestService): boolean {
  return service.published !== false;
}

export function isServiceLive(service: RequestService): boolean {
  return serviceHasRequiredImage(service) && isServicePublished(service);
}

export type ServiceReadiness = {
  status: "ready" | "draft" | "needs_media";
  label: string;
};

export type CategoryReadiness = {
  status: "ready" | "draft" | "needs_setup" | "empty" | "inactive";
  label: string;
  readyOfferingCount: number;
  incompleteOfferingCount: number;
};

export function getServiceReadiness(service: RequestService): ServiceReadiness {
  if (!serviceHasRequiredImage(service)) {
    if (service.media.kind === "audio") {
      return { status: "needs_media", label: "Needs sample" };
    }
    return { status: "needs_media", label: "Needs image" };
  }
  if (!isServicePublished(service)) {
    return { status: "draft", label: "Draft" };
  }
  return { status: "ready", label: "Ready" };
}

export function getCategoryReadiness(category: RequestCategory): CategoryReadiness {
  const readyOfferingCount = category.services.filter((service) => isServiceLive(service)).length;
  // Drafts with media are intentional — only missing media blocks setup.
  const incompleteOfferingCount = category.services.filter(
    (service) => !serviceHasRequiredImage(service),
  ).length;
  const hasImage = categoryHasRequiredImage(category);

  if (!isCategoryActive(category)) {
    return {
      status: "inactive",
      label: "Inactive",
      readyOfferingCount,
      incompleteOfferingCount,
    };
  }

  if (category.services.length === 0) {
    return {
      status: "empty",
      label: "Empty",
      readyOfferingCount,
      incompleteOfferingCount,
    };
  }

  if (!hasImage || incompleteOfferingCount > 0) {
    return {
      status: "needs_setup",
      label: "Needs setup",
      readyOfferingCount,
      incompleteOfferingCount,
    };
  }

  if (readyOfferingCount === 0) {
    return {
      status: "draft",
      label: "Draft",
      readyOfferingCount,
      incompleteOfferingCount,
    };
  }

  return {
    status: "ready",
    label: "Ready",
    readyOfferingCount,
    incompleteOfferingCount,
  };
}

export type CategoryOfferingStats = {
  views: number;
  requests: number;
  pending: number;
  completed: number;
  earnings: number;
  currency: string;
  reviews: number;
  rating: number;
};

type CategoryStatsBooking = {
  category: string | null;
  requestLabel: string;
  status: string;
  totalFee: number;
  currency: string;
  createdAt?: string;
};

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

/** Whether a category title/id/intent matches a stored booking category label. */
export function categoryLabelMatches(
  category: RequestCategory,
  bookingCategory: string | null | undefined,
): boolean {
  const normalized = normalizeKey(bookingCategory ?? "");
  if (!normalized) return false;
  return [category.title, category.id, category.intent]
    .map(normalizeKey)
    .filter(Boolean)
    .includes(normalized);
}

export function resolveCategoryInstantBooking(
  content: CreatorRequestsContent,
  bookingCategory: string | null | undefined,
): boolean {
  const category = content.categories.find((item) =>
    categoryLabelMatches(item, bookingCategory),
  );
  return Boolean(category?.instantBooking);
}

function isCompletedBookingStatus(status: string): boolean {
  return status === "ACCEPTED" || status === "IN_PROGRESS" || status === "DELIVERED";
}

function bookingMatchesCategory(
  booking: CategoryStatsBooking,
  category: RequestCategory,
): boolean {
  const bookingCategory = normalizeKey(booking.category ?? "");
  const categoryKeys = [category.title, category.id, category.intent]
    .map(normalizeKey)
    .filter(Boolean);

  if (bookingCategory && categoryKeys.includes(bookingCategory)) {
    return true;
  }

  const requestLabel = normalizeKey(booking.requestLabel);
  if (!requestLabel) return false;
  return category.services.some((service) => normalizeKey(service.label) === requestLabel);
}

/** Compact performance snapshot for each category on the offerings list. */
export function getCategoryOfferingStats(
  category: RequestCategory,
  bookings: CategoryStatsBooking[],
  slug: string,
): CategoryOfferingStats {
  const matched = bookings.filter((booking) => bookingMatchesCategory(booking, category));
  const requests = matched.length;
  const pending = matched.filter((booking) => booking.status === "RECEIVED").length;
  const completedBookings = matched.filter((booking) => isCompletedBookingStatus(booking.status));
  const completed = completedBookings.length;
  const earnings = completedBookings.reduce((sum, booking) => sum + booking.totalFee, 0);
  const currency =
    completedBookings.find((booking) => booking.currency.trim())?.currency.trim() ||
    matched.find((booking) => booking.currency.trim())?.currency.trim() ||
    "USD";

  const seed = hashString(`category-stats:${slug}:${category.id}`);
  const popularityBoost = category.popular ? 1.35 : 1;
  const baseViews = Math.round((120 + (seed % 880)) * popularityBoost);
  const views = baseViews + requests * (18 + (seed % 22));

  const reviewSeed = hashString(`category-reviews:${slug}:${category.id}`);
  const reviews =
    requests > 0
      ? Math.max(1, Math.round(requests * (0.35 + (reviewSeed % 40) / 100)) + (reviewSeed % 3))
      : category.services.length > 0
        ? reviewSeed % 4
        : 0;
  const rating =
    reviews === 0 ? 0 : Math.round((4.2 + ((reviewSeed % 70) / 100)) * 10) / 10;

  return { views, requests, pending, completed, earnings, currency, reviews, rating };
}

export type DailyViewPoint = {
  day: number;
  label: string;
  views: number;
  revenue: number;
};

export type ServiceRequestsSummaryStats = {
  awaiting: number;
  completed: number;
  earnings: number;
  currency: string;
  liveOfferings: number;
  activeCategories: number;
  dailyViews: DailyViewPoint[];
  monthViews: number;
  monthLabel: string;
};

function buildMonthlyDailyViews(
  slug: string,
  bookings: CategoryStatsBooking[],
  now: Date,
): { points: DailyViewPoint[]; monthViews: number; monthLabel: string } {
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dayCount = Math.min(30, daysInMonth);
  const monthLabel = now.toLocaleString("en-US", { month: "short", year: "numeric" });
  const monthSeed = hashString(`sr-views:${slug}:${year}-${month + 1}`);

  const bookingsByDay = new Map<number, number>();
  const revenueByDay = new Map<number, number>();
  for (const booking of bookings) {
    if (!booking.createdAt) continue;
    const created = new Date(booking.createdAt);
    if (created.getFullYear() !== year || created.getMonth() !== month) continue;
    const day = created.getDate();
    if (day > dayCount) continue;
    bookingsByDay.set(day, (bookingsByDay.get(day) ?? 0) + 1);
    if (isCompletedBookingStatus(booking.status)) {
      revenueByDay.set(day, (revenueByDay.get(day) ?? 0) + booking.totalFee);
    }
  }

  const points: DailyViewPoint[] = [];
  let monthViews = 0;
  for (let day = 1; day <= dayCount; day += 1) {
    // Only passed days of the current month get a bar.
    if (day > today) {
      points.push({ day, label: String(day), views: 0, revenue: 0 });
      continue;
    }

    const date = new Date(year, month, day);
    const weekday = date.getDay();
    const weekendBoost = weekday === 0 || weekday === 6 ? 1.25 : 1;
    const daySeed = hashString(`${monthSeed}:${day}`);
    const base = 18 + (daySeed % 54);
    const wave = 8 + ((daySeed >> 3) % 22);
    const bookingBoost = (bookingsByDay.get(day) ?? 0) * (10 + (daySeed % 8));
    const views = Math.round((base + wave) * weekendBoost + bookingBoost);
    const revenue = revenueByDay.get(day) ?? 0;
    monthViews += views;
    points.push({ day, label: String(day), views, revenue });
  }

  return { points, monthViews, monthLabel };
}

/** Roll-up for the Seller dashboard Service requests card. */
export function getServiceRequestsSummaryStats(
  content: CreatorRequestsContent,
  bookings: CategoryStatsBooking[],
  slug = "creator",
  now = new Date(),
): ServiceRequestsSummaryStats {
  const awaiting = bookings.filter((booking) => booking.status === "RECEIVED").length;
  const completedBookings = bookings.filter((booking) =>
    isCompletedBookingStatus(booking.status),
  );
  const completed = completedBookings.length;
  const earnings = completedBookings.reduce((sum, booking) => sum + booking.totalFee, 0);
  const currency =
    completedBookings.find((booking) => booking.currency.trim())?.currency.trim() ||
    bookings.find((booking) => booking.currency.trim())?.currency.trim() ||
    "USD";

  const activeCategoriesList = content.categories.filter((category) => isCategoryActive(category));
  const liveOfferings = activeCategoriesList.reduce(
    (sum, category) => sum + category.services.filter((service) => isServiceLive(service)).length,
    0,
  );
  const activeCategories = activeCategoriesList.filter((category) =>
    category.services.some((service) => isServiceLive(service)),
  ).length;

  const { points, monthViews, monthLabel } = buildMonthlyDailyViews(slug, bookings, now);

  return {
    awaiting,
    completed,
    earnings,
    currency,
    liveOfferings,
    activeCategories,
    dailyViews: points,
    monthViews,
    monthLabel,
  };
}

export function formatCompactCount(value: number): string {
  if (value < 1000) return String(value);
  if (value < 10_000) return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  if (value < 1_000_000) return `${Math.round(value / 1000)}k`;
  return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}m`;
}

export function formatCompactMoney(amount: number, currency = "USD"): string {
  const code = currency.trim().toUpperCase() || "USD";
  // Use a fixed locale so SSR and the client always render the same string.
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      currencyDisplay: "narrowSymbol",
      notation: amount >= 10_000 ? "compact" : "standard",
      maximumFractionDigits: amount >= 100 ? 0 : 2,
    }).format(amount);
  } catch {
    if (amount >= 10_000) return `${code} ${formatCompactCount(Math.round(amount))}`;
    return `${code} ${amount.toLocaleString("en-US")}`;
  }
}


export function recomputeStartingRange(content: CreatorRequestsContent): string {
  const prices = content.categories.flatMap((category) =>
    category.services.flatMap((service) => [service.priceMin, service.priceMax]),
  );
  if (prices.length === 0) return content.startingRange;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return `$${min} – $${max}`;
}

/** Drop gallery slides that point at offerings no longer in the catalog. */
export function pruneOrphanGalleryItems(content: CreatorRequestsContent): CreatorRequestsContent {
  const serviceIds = new Set(
    content.categories.flatMap((category) => category.services.map((service) => service.id)),
  );
  const gallery = content.gallery.filter((item) => {
    if (!item.serviceId) return true;
    return serviceIds.has(item.serviceId);
  });
  if (gallery.length === content.gallery.length) return content;
  return { ...content, gallery };
}

/**
 * Fan-facing catalog: only fully set-up, published, active categories/offerings.
 * Draft/inactive rows from Seller Tools stay hidden.
 */
export function toPublicCreatorRequestsContent(
  content: CreatorRequestsContent,
): CreatorRequestsContent {
  const categories = content.categories
    .filter((category) => isCategoryActive(category))
    .map((category) => ({
      ...category,
      services: category.services.filter((service) => isServiceLive(service)),
    }))
    .filter(
      (category) =>
        categoryHasRequiredImage(category) &&
        category.services.length > 0 &&
        Boolean(category.title.trim() || category.intent.trim()),
    );

  const next: CreatorRequestsContent = {
    ...content,
    categories,
    startingRange: recomputeStartingRange({ ...content, categories }),
  };
  return pruneOrphanGalleryItems(next);
}
