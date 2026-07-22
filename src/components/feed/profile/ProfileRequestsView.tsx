"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import LeftNav from "@/components/feed/LeftNav";
import MediaPlayOverlay from "@/components/feed/MediaPlayOverlay";
import MobileNav from "@/components/feed/MobileNav";
import PageBodyClass from "@/components/feed/PageBodyClass";
import LocationSearchField, {
  type SelectedPlace,
} from "@/components/feed/profile/LocationSearchField";
import {
  formatRequestPriceRange,
  getCreatorRequests,
  resolveSpecialRequestReviews,
  type RequestService,
  type RequestServiceDetails,
  type RequestServiceMedia,
} from "@/lib/feed/special-requests";
import type { ProfileData } from "@/types/feed/profile";

const REVIEW_INITIAL_COUNT = 6;
const REVIEW_PAGE_SIZE = 18;
const FEED_SURCHARGE = 15;
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const DURATION_OPTIONS = ["15 seconds", "30 seconds", "60 seconds", "90 seconds", "2 minutes"] as const;
const TIME_OPTIONS = ["9:00 AM", "12:00 PM", "3:00 PM", "6:00 PM", "9:00 PM"] as const;
const APPEARANCE_DURATION_HOURS = Array.from({ length: 13 }, (_, index) => String(index));
const APPEARANCE_DURATION_MINUTES = ["0", "15", "30", "45"] as const;
const REVIEW_SORT_OPTIONS = [
  { id: "relevant", label: "Most Relevant" },
  { id: "recent", label: "Most Recent" },
  { id: "highest", label: "Highest Rated" },
  { id: "lowest", label: "Lowest Rated" },
] as const;
const REVIEW_RATING_OPTIONS = [
  { id: "all" as const, label: "All stars" },
  { id: 5 as const, label: "5 stars" },
  { id: 4 as const, label: "4 stars" },
  { id: 3 as const, label: "3 stars" },
  { id: 2 as const, label: "2 stars" },
  { id: 1 as const, label: "1 star" },
] as const;
type ReviewSortId = (typeof REVIEW_SORT_OPTIONS)[number]["id"];
type ReviewRatingFilter = (typeof REVIEW_RATING_OPTIONS)[number]["id"];

function formatAppearanceDuration(hours: string, minutes: string) {
  if (!hours && !minutes) return "";
  const h = Number(hours || 0);
  const m = Number(minutes || 0);
  if (!h && !m) return "";
  const parts: string[] = [];
  if (h > 0) parts.push(`${h} ${h === 1 ? "hr" : "hrs"}`);
  if (m > 0) parts.push(`${m} min`);
  if (!parts.length) return "0 min";
  return parts.join(" ");
}

type DeliveryMethod = "dm" | "feed";
type ContentKind = "text" | "audio" | "video";
type RecipientTarget = "self" | "other";

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function focusPersonalizeControl(node: HTMLElement | null) {
  if (!node) return;
  node.scrollIntoView({ behavior: "smooth", block: "center" });
  window.setTimeout(() => {
    node.focus({ preventScroll: true });
    if (node instanceof HTMLSelectElement) {
      const select = node as HTMLSelectElement & { showPicker?: () => void };
      try {
        select.showPicker?.();
      } catch {
        // Native picker may be blocked outside a direct user gesture.
      }
    }
  }, 80);
}

function parseDateKey(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDisplayDate(value: string) {
  if (!value) return "Select a date";
  return parseDateKey(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function monthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString("en-US", { month: "short" });
}

function AmexMark() {
  return (
    <span className="requests-pay-mark" aria-label="American Express">
      <svg viewBox="0 0 48 32" role="img" aria-hidden="true">
        <rect width="48" height="32" rx="4" fill="#016FD0" />
        <text x="24" y="19.5" textAnchor="middle" fill="#fff" fontFamily="Arial, Helvetica, sans-serif" fontSize="7.2" fontWeight="700" letterSpacing="0.4">
          AMEX
        </text>
      </svg>
    </span>
  );
}

function VisaMark() {
  return (
    <span className="requests-pay-mark" aria-label="Visa">
      <svg viewBox="0 0 48 32" role="img" aria-hidden="true">
        <rect width="48" height="32" rx="4" fill="#fff" />
        <text x="24" y="20.5" textAnchor="middle" fill="#1A1F71" fontFamily="Arial, Helvetica, sans-serif" fontSize="11" fontStyle="italic" fontWeight="800" letterSpacing="1.2">
          VISA
        </text>
      </svg>
    </span>
  );
}

function MastercardMark() {
  return (
    <span className="requests-pay-mark" aria-label="Mastercard">
      <svg viewBox="0 0 48 32" role="img" aria-hidden="true">
        <rect width="48" height="32" rx="4" fill="#fff" />
        <circle cx="19.5" cy="16" r="7.2" fill="#EB001B" />
        <circle cx="28.5" cy="16" r="7.2" fill="#F79E1B" />
        <path d="M24 10.55a7.2 7.2 0 0 1 0 10.9 7.2 7.2 0 0 1 0-10.9z" fill="#FF5F00" />
      </svg>
    </span>
  );
}

function PaypalMark() {
  return (
    <span className="requests-pay-mark" aria-label="PayPal">
      <svg viewBox="0 0 48 32" role="img" aria-hidden="true">
        <rect width="48" height="32" rx="4" fill="#fff" />
        <text x="24" y="19.5" textAnchor="middle" fill="#003087" fontFamily="Arial, Helvetica, sans-serif" fontSize="8" fontWeight="800">
          PayPal
        </text>
      </svg>
    </span>
  );
}

function DinersMark() {
  return (
    <span className="requests-pay-mark" aria-label="Diners Club">
      <svg viewBox="0 0 48 32" role="img" aria-hidden="true">
        <rect width="48" height="32" rx="4" fill="#0079BE" />
        <circle cx="20" cy="16" r="7" fill="none" stroke="#fff" strokeWidth="1.5" />
        <circle cx="28" cy="16" r="7" fill="none" stroke="#fff" strokeWidth="1.5" />
      </svg>
    </span>
  );
}

function StarRating({ rating, size = 12 }: { rating: number; size?: number }) {
  const clamped = Math.max(0, Math.min(5, Math.round(rating)));

  return (
    <span className="collection-product__stars" aria-label={`${clamped} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => (
        <svg
          key={index}
          className={index < clamped ? "is-filled" : undefined}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </span>
  );
}

function ServiceExplainer({
  serviceId,
  details,
  media,
}: {
  serviceId: string;
  details: RequestServiceDetails;
  media: RequestServiceMedia;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setPlaying(false);
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [serviceId, media.kind]);

  async function toggleAudio(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      await audio.play();
      setPlaying(true);
    } else {
      audio.pause();
      setPlaying(false);
    }
  }

  return (
    <div className="requests-detail" onClick={(event) => event.stopPropagation()}>
      <div className="requests-detail__hero">
        <div className="requests-detail__intro">
          <h3 className="requests-detail__title">About the service</h3>
          <p className="requests-detail__description">{details.about}</p>
        </div>

        <div className={`requests-detail__sample requests-detail__sample--${media.kind}`}>
          <p className="requests-detail__label">
            {media.kind === "video" ? "Sample preview" : "Audio sample"}
          </p>
          {media.kind === "video" ? (
            <div className="requests-detail__video">
              <div className="requests-detail__video-frame">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={media.poster} alt="" />
                <span className="requests-detail__video-play" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
              </div>
              <p className="requests-detail__caption">{media.caption}</p>
            </div>
          ) : (
            <div className="requests-detail__audio">
              <button
                type="button"
                className={`requests-detail__audio-btn${playing ? " is-playing" : ""}`}
                aria-label={playing ? "Pause audio sample" : "Play audio sample"}
                onClick={toggleAudio}
              >
                <span className="requests-detail__audio-icon" aria-hidden="true">
                  {playing ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 5h4v14H6zm8 0h4v14h-4z" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </span>
                <span className="requests-detail__audio-copy">
                  <strong>{media.title}</strong>
                  <span>{media.duration}</span>
                </span>
              </button>
              <audio
                ref={audioRef}
                src={media.src}
                preload="none"
                onEnded={() => setPlaying(false)}
                onPause={() => setPlaying(false)}
                onPlay={() => setPlaying(true)}
              />
            </div>
          )}
        </div>
      </div>

      <div className="requests-detail__grid">
        <section className="requests-detail__section">
          <h4>What’s on offer</h4>
          <ul>
            {details.onOffer.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="requests-detail__section">
          <h4>Booking & payment</h4>
          <ul>
            {details.booking.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="requests-detail__section">
          <h4>Licensing</h4>
          <ul>
            {details.licensing.map((item) => (
              <li key={item}>{item}</li>
            ))}
            {details.termsHref ? (
              <li>
                Please see the full{" "}
                <a href={details.termsHref}>Terms & conditions of use</a>.
              </li>
            ) : null}
          </ul>
        </section>
      </div>
    </div>
  );
}

function SummaryInfoTip({
  tipId,
  title,
  copy,
}: {
  tipId: string;
  title: string;
  copy: string;
}) {
  return (
    <span className="requests-summary-info">
      <button
        type="button"
        className="requests-summary-info__trigger"
        aria-label={title}
        aria-describedby={tipId}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 10.5v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="7.5" r="1" fill="currentColor" />
        </svg>
      </button>
      <span id={tipId} className="requests-summary-info__popover" role="tooltip">
        <span className="requests-summary-info__popover-head">
          <span className="requests-summary-info__popover-icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
              <path d="M12 10.5v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="12" cy="7.5" r="1" fill="currentColor" />
            </svg>
          </span>
          <strong>{title}</strong>
        </span>
        <span className="requests-summary-info__popover-copy">{copy}</span>
      </span>
    </span>
  );
}

function SectionInfoTip({
  tipId,
  title,
  copy,
}: {
  tipId: string;
  title: string;
  copy: string;
}) {
  return (
    <span className="requests-section-info">
      <button
        type="button"
        className="requests-section-info__trigger"
        aria-label={`About ${title}`}
        aria-describedby={tipId}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 10.5v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="7.5" r="1" fill="currentColor" />
        </svg>
      </button>
      <span id={tipId} className="requests-section-info__popover" role="tooltip">
        <strong>{title}</strong>
        <span>{copy}</span>
      </span>
    </span>
  );
}

function MoneyBackGuaranteeTag({ copy, tipId }: { copy: string; tipId: string }) {
  return (
    <span className="requests-guarantee-tag">
      <button
        type="button"
        className="requests-guarantee-tag__trigger"
        aria-describedby={tipId}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 3 4.5 6.5v5.2c0 4.6 3.1 8.7 7.5 9.8 4.4-1.1 7.5-5.2 7.5-9.8V6.5L12 3Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="m9.2 12.1 1.8 1.8 3.8-3.9"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Money-back guarantee
      </button>
      <span id={tipId} className="requests-guarantee-tag__popover" role="tooltip">
        <span className="requests-guarantee-tag__popover-head">
          <span className="requests-guarantee-tag__popover-icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 3 4.5 6.5v5.2c0 4.6 3.1 8.7 7.5 9.8 4.4-1.1 7.5-5.2 7.5-9.8V6.5L12 3Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <path
                d="m9.2 12.1 1.8 1.8 3.8-3.9"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <strong>Money-back guarantee</strong>
        </span>
        <span className="requests-guarantee-tag__popover-copy">{copy}</span>
      </span>
    </span>
  );
}

function flattenServices(categories: ReturnType<typeof getCreatorRequests>) {
  if (!categories) return [] as RequestService[];
  return categories.categories.flatMap((category) => category.services);
}

export default function ProfileRequestsView({
  profile,
  variant = "start",
  initialCategoryId,
  initialServiceId,
}: {
  profile: ProfileData;
  variant?: "start" | "choose";
  initialCategoryId?: string;
  initialServiceId?: string;
}) {
  const content = getCreatorRequests(profile.slug);
  const allServices = useMemo(() => flattenServices(content), [content]);
  const reviewsBlock = useMemo(() => resolveSpecialRequestReviews(profile.slug), [profile.slug]);

  const resolvedInitialCategoryId = useMemo(() => {
    if (!content) return "";
    if (initialCategoryId && content.categories.some((category) => category.id === initialCategoryId)) {
      return initialCategoryId;
    }
    if (initialServiceId) {
      const match = content.categories.find((category) =>
        category.services.some((service) => service.id === initialServiceId),
      );
      return match?.id ?? "";
    }
    return "";
  }, [content, initialCategoryId, initialServiceId]);

  const resolvedInitialServiceId = useMemo(() => {
    if (!content || !resolvedInitialCategoryId) {
      if (initialServiceId && allServices.some((service) => service.id === initialServiceId)) {
        return initialServiceId;
      }
      return allServices[0]?.id ?? "";
    }
    const category = content.categories.find((item) => item.id === resolvedInitialCategoryId);
    if (!category) return allServices[0]?.id ?? "";
    if (initialServiceId && category.services.some((service) => service.id === initialServiceId)) {
      return initialServiceId;
    }
    return category.services.find((service) => service.popular)?.id ?? category.services[0]?.id ?? "";
  }, [allServices, content, initialServiceId, resolvedInitialCategoryId]);

  const [categoryId, setCategoryId] = useState(resolvedInitialCategoryId);
  const [selectedId, setSelectedId] = useState(resolvedInitialServiceId);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [galleryPaused, setGalleryPaused] = useState(false);
  const [stickyCtaVisible, setStickyCtaVisible] = useState(false);
  const introCtaRef = useRef<HTMLDivElement>(null);
  const bottomCtaRef = useRef<HTMLElement | null>(null);
  const [visibleReviewCount, setVisibleReviewCount] = useState(REVIEW_INITIAL_COUNT);
  const [reviewSort, setReviewSort] = useState<ReviewSortId>("relevant");
  const [reviewRatingFilter, setReviewRatingFilter] = useState<ReviewRatingFilter>("all");
  const [reviewSortOpen, setReviewSortOpen] = useState(false);
  const [reviewFilterOpen, setReviewFilterOpen] = useState(false);
  const reviewSortRef = useRef<HTMLDivElement>(null);
  const reviewFilterRef = useRef<HTMLDivElement>(null);
  const [pickerStep, setPickerStep] = useState<1 | 2 | 3 | 4>(
    resolvedInitialCategoryId ? 2 : 1,
  );
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("dm");
  const [contentKind, setContentKind] = useState<ContentKind>("video");
  const [duration, setDuration] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [recipientTarget, setRecipientTarget] = useState<RecipientTarget>("other");
  const [recipientName, setRecipientName] = useState("");
  const [recipientUsername, setRecipientUsername] = useState("");
  const [shoutoutMessage, setShoutoutMessage] = useState("");
  const [appearanceOccasion, setAppearanceOccasion] = useState("");
  const [appearanceLocation, setAppearanceLocation] = useState<SelectedPlace | null>(null);
  const [appearanceDurationHours, setAppearanceDurationHours] = useState("");
  const [appearanceDurationMins, setAppearanceDurationMins] = useState("");
  const [appearanceExpectation, setAppearanceExpectation] = useState("");
  const [appearanceReference, setAppearanceReference] = useState<File | null>(null);
  const [personalizeTried, setPersonalizeTried] = useState(false);
  const [calendarCursor, setCalendarCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const contentTypeRefs = useRef<Partial<Record<ContentKind, HTMLButtonElement | null>>>({});
  const durationRef = useRef<HTMLSelectElement>(null);
  const firstDateRef = useRef<HTMLButtonElement>(null);
  const deliveryTimeRef = useRef<HTMLSelectElement>(null);
  const recipientSelfRef = useRef<HTMLButtonElement>(null);
  const recipientOtherRef = useRef<HTMLButtonElement>(null);
  const recipientNameRef = useRef<HTMLInputElement>(null);
  const recipientUsernameRef = useRef<HTMLInputElement>(null);
  const shoutoutMessageRef = useRef<HTMLTextAreaElement>(null);
  const appearanceOccasionRef = useRef<HTMLInputElement>(null);
  const appearanceLocationRef = useRef<HTMLInputElement>(null);
  const appearanceDurationHoursRef = useRef<HTMLSelectElement>(null);
  const appearanceDurationMinsRef = useRef<HTMLSelectElement>(null);
  const appearanceExpectationRef = useRef<HTMLTextAreaElement>(null);
  const appearanceReferenceRef = useRef<HTMLInputElement>(null);

  const earliestDate = useMemo(() => {
    const parsed = Date.parse(content?.nextAvailable ?? "");
    const base = Number.isNaN(parsed) ? new Date() : new Date(parsed);
    return startOfDay(base);
  }, [content?.nextAvailable]);

  const calendarDays = useMemo(() => {
    const { year, month } = calendarCursor;
    const first = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: ({ key: string; date: Date; inMonth: true } | { key: string; inMonth: false })[] = [];
    for (let i = 0; i < first.getDay(); i += 1) {
      cells.push({ key: `pad-${i}`, inMonth: false });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day);
      cells.push({ key: toDateKey(date), date, inMonth: true });
    }
    return cells;
  }, [calendarCursor]);

  useEffect(() => {
    if (pickerStep !== 3) return;
    setCalendarCursor({
      year: earliestDate.getFullYear(),
      month: earliestDate.getMonth(),
    });
  }, [pickerStep, earliestDate]);

  useEffect(() => {
    if (!reviewSortOpen && !reviewFilterOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!reviewSortRef.current?.contains(target)) setReviewSortOpen(false);
      if (!reviewFilterRef.current?.contains(target)) setReviewFilterOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setReviewSortOpen(false);
        setReviewFilterOpen(false);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [reviewSortOpen, reviewFilterOpen]);

  useEffect(() => {
    if (variant !== "start" || !content?.gallery.length || galleryPaused) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;
    const timer = window.setInterval(() => {
      setGalleryIndex((current) => {
        const len = content.gallery.length;
        return current >= len - 1 ? 0 : current + 1;
      });
    }, 5200);
    return () => window.clearInterval(timer);
  }, [content?.gallery.length, galleryPaused, variant]);

  useEffect(() => {
    if (variant !== "start") return;

    const updateFromScroll = () => {
      const mobile = window.matchMedia("(max-width: 900px)").matches;
      if (!mobile) {
        setStickyCtaVisible(false);
        return;
      }
      const introEl = introCtaRef.current;
      const bottomEl = bottomCtaRef.current;
      if (!introEl || !bottomEl) return;
      const introRect = introEl.getBoundingClientRect();
      const bottomRect = bottomEl.getBoundingClientRect();
      const introGone = introRect.bottom < 48;
      const bottomProminent =
        bottomRect.top < window.innerHeight * 0.52 && bottomRect.bottom > 80;
      setStickyCtaVisible(introGone && !bottomProminent);
    };

    updateFromScroll();
    window.addEventListener("scroll", updateFromScroll, { passive: true });
    window.addEventListener("resize", updateFromScroll);
    return () => {
      window.removeEventListener("scroll", updateFromScroll);
      window.removeEventListener("resize", updateFromScroll);
    };
  }, [variant, content]);

  const filteredReviews = useMemo(() => {
    const filtered =
      reviewRatingFilter === "all"
        ? reviewsBlock.reviews
        : reviewsBlock.reviews.filter((review) => review.rating === reviewRatingFilter);

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (reviewSort === "recent") return a.daysAgo - b.daysAgo;
      if (reviewSort === "highest") return b.rating - a.rating || a.daysAgo - b.daysAgo;
      if (reviewSort === "lowest") return a.rating - b.rating || a.daysAgo - b.daysAgo;
      // Most relevant: higher rating + newer reviews first
      const scoreA = a.rating * 20 - a.daysAgo;
      const scoreB = b.rating * 20 - b.daysAgo;
      return scoreB - scoreA;
    });
    return sorted;
  }, [reviewsBlock.reviews, reviewRatingFilter, reviewSort]);

  const reviewSortLabel =
    REVIEW_SORT_OPTIONS.find((option) => option.id === reviewSort)?.label ?? "Most Relevant";
  const reviewFilterLabel =
    REVIEW_RATING_OPTIONS.find((option) => option.id === reviewRatingFilter)?.label ?? "All stars";

  if (!content) return null;

  const isStart = variant === "start";
  const chooseHref = `/feed/profile/${profile.slug}/requests/choose`;
  const backHref = isStart ? `/feed/profile/${profile.slug}` : `/feed/profile/${profile.slug}/requests`;
  const backLabel = isStart
    ? `Back to ${profile.name}'s profile`
    : "Back to Special Requests";

  function buildChooseHref(nextCategoryId: string, nextServiceId?: string) {
    const params = new URLSearchParams();
    if (nextCategoryId) params.set("category", nextCategoryId);
    if (nextServiceId) params.set("service", nextServiceId);
    const query = params.toString();
    return query ? `${chooseHref}?${query}` : chooseHref;
  }

  const activeGalleryItem = content.gallery[galleryIndex] ?? content.gallery[0];
  const reviewAverageLabel = reviewsBlock.average.toFixed(1);

  const activeCategory =
    content.categories.find((category) => category.id === categoryId) ?? content.categories[0];
  const popularCategory =
    content.categories.find((category) => category.popular) ?? content.categories[0];
  const hasChosenCategory = Boolean(categoryId);
  const isAppearanceCategory = categoryId === "appearances";
  const selected =
    activeCategory?.services.find((service) => service.id === selectedId) ??
    allServices.find((service) => service.id === selectedId) ??
    allServices[0];
  const priceRange = selected
    ? formatRequestPriceRange(selected.priceMin, selected.priceMax)
    : content.startingRange;
  const dayRate = selected?.priceMin ?? 80;
  const feedFee =
    !isAppearanceCategory && deliveryMethod === "feed" ? FEED_SURCHARGE : 0;
  const totalFee = dayRate + feedFee;
  const appearanceDurationLabel = formatAppearanceDuration(
    appearanceDurationHours,
    appearanceDurationMins,
  );
  const appearanceReady = Boolean(
    appearanceOccasion.trim() &&
      appearanceLocation?.label.trim() &&
      deliveryTime &&
      appearanceDurationHours !== "" &&
      appearanceDurationMins !== "" &&
      (Number(appearanceDurationHours) > 0 || Number(appearanceDurationMins) > 0) &&
      appearanceExpectation.trim(),
  );
  const personalizedReady = isAppearanceCategory
    ? Boolean(deliveryDate && appearanceReady)
    : Boolean(
        deliveryMethod &&
          contentKind &&
          duration &&
          deliveryDate &&
          deliveryTime &&
          shoutoutMessage.trim() &&
          (recipientTarget === "self" ||
            (recipientName.trim() && recipientUsername.trim())),
      );
  const availableReviews = filteredReviews;
  const visibleReviews = availableReviews.slice(0, visibleReviewCount);
  const remainingReviews = Math.max(0, availableReviews.length - visibleReviewCount);

  function goGallery(delta: number) {
    setGalleryIndex((current) => {
      const next = current + delta;
      if (next < 0) return content!.gallery.length - 1;
      if (next >= content!.gallery.length) return 0;
      return next;
    });
  }

  function chooseCategory(nextCategoryId: string) {
    const nextCategory = content!.categories.find((category) => category.id === nextCategoryId);
    if (!nextCategory) return;
    setCategoryId(nextCategoryId);
    const preferred =
      nextCategory.services.find((service) => service.popular) ?? nextCategory.services[0];
    if (preferred) setSelectedId(preferred.id);
    if (nextCategoryId === "appearances") {
      setDeliveryMethod("dm");
    }
    setPickerStep(2);
  }

  function chooseService(serviceId: string) {
    setSelectedId(serviceId);
  }

  function tryContinueFromPersonalize() {
    setPersonalizeTried(true);

    if (isAppearanceCategory) {
      if (!deliveryDate) {
        focusPersonalizeControl(firstDateRef.current);
        return false;
      }
      if (!deliveryTime) {
        focusPersonalizeControl(deliveryTimeRef.current);
        return false;
      }
      if (!appearanceOccasion.trim()) {
        focusPersonalizeControl(appearanceOccasionRef.current);
        return false;
      }
      if (!appearanceLocation?.label.trim()) {
        focusPersonalizeControl(appearanceLocationRef.current);
        return false;
      }
      if (appearanceDurationHours === "") {
        focusPersonalizeControl(appearanceDurationHoursRef.current);
        return false;
      }
      if (appearanceDurationMins === "") {
        focusPersonalizeControl(appearanceDurationMinsRef.current);
        return false;
      }
      if (!(Number(appearanceDurationHours) > 0 || Number(appearanceDurationMins) > 0)) {
        focusPersonalizeControl(appearanceDurationHoursRef.current);
        return false;
      }
      if (!appearanceExpectation.trim()) {
        focusPersonalizeControl(appearanceExpectationRef.current);
        return false;
      }
    } else {
      if (!duration) {
        focusPersonalizeControl(durationRef.current);
        return false;
      }
      if (!deliveryDate) {
        focusPersonalizeControl(firstDateRef.current);
        return false;
      }
      if (!deliveryTime) {
        focusPersonalizeControl(deliveryTimeRef.current);
        return false;
      }
      if (recipientTarget === "other" && !recipientName.trim()) {
        focusPersonalizeControl(recipientNameRef.current);
        return false;
      }
      if (recipientTarget === "other" && !recipientUsername.trim()) {
        focusPersonalizeControl(recipientUsernameRef.current);
        return false;
      }
      if (!shoutoutMessage.trim()) {
        focusPersonalizeControl(shoutoutMessageRef.current);
        return false;
      }
    }

    setPickerStep(4);
    return true;
  }

  const durationInvalid = personalizeTried && !isAppearanceCategory && !duration;
  const dateInvalid = personalizeTried && !deliveryDate;
  const timeInvalid = personalizeTried && !deliveryTime;
  const recipientNameInvalid =
    personalizeTried && !isAppearanceCategory && recipientTarget === "other" && !recipientName.trim();
  const recipientUsernameInvalid =
    personalizeTried &&
    !isAppearanceCategory &&
    recipientTarget === "other" &&
    !recipientUsername.trim();
  const messageInvalid =
    personalizeTried && !isAppearanceCategory && !shoutoutMessage.trim();
  const occasionInvalid =
    personalizeTried && isAppearanceCategory && !appearanceOccasion.trim();
  const locationInvalid =
    personalizeTried && isAppearanceCategory && !appearanceLocation?.label.trim();
  const appearanceDurationEmpty =
    personalizeTried &&
    isAppearanceCategory &&
    (appearanceDurationHours === "" || appearanceDurationMins === "");
  const appearanceDurationZero =
    personalizeTried &&
    isAppearanceCategory &&
    appearanceDurationHours !== "" &&
    appearanceDurationMins !== "" &&
    !(Number(appearanceDurationHours) > 0 || Number(appearanceDurationMins) > 0);
  const durationHoursInvalid = appearanceDurationEmpty || appearanceDurationZero;
  const durationMinsInvalid = appearanceDurationEmpty || appearanceDurationZero;
  const expectationInvalid =
    personalizeTried && isAppearanceCategory && !appearanceExpectation.trim();

  return (
    <>
      <PageBodyClass pageClass="page-profile" />
      <div className={`app-shell page-profile page-requests${isStart ? " page-requests--start" : " page-requests--choose"}`}>
        <LeftNav />
        <main className="main-content profile-page requests-page">
          <header className="product-detail-topbar requests-topbar">
            <div className="product-detail-topbar__inner requests-topbar__inner">
              <Link
                href={backHref}
                className="product-detail-back btn btn--sm btn--icon btn--secondary"
                aria-label={backLabel}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                </svg>
              </Link>
              <div className="requests-topbar__seller">
                <div
                  className="story-avatar requests-topbar__avatar"
                  style={{ "--story-color": profile.avatar_color } as CSSProperties}
                  aria-hidden="true"
                >
                  {profile.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.avatar_url} alt="" width={36} height={36} />
                  ) : (
                    profile.avatar_initials
                  )}
                </div>
                <div className="requests-topbar__copy">
                  <p className="requests-topbar__name">{profile.name}</p>
                  <p className="requests-topbar__label">Special Requests</p>
                </div>
              </div>
            </div>
          </header>

          <div
            className={`profile-page__inner requests-layout${isStart ? " requests-layout--start" : ` requests-layout--choose requests-layout--step-${pickerStep}`}`}
          >
            <div className="requests-main">
              {isStart ? (
                <>
                  <section className="requests-intro" aria-labelledby="requests-heading">
                    <p className="requests-intro__eyebrow">Special Requests · {profile.name}</p>
                    <h1 id="requests-heading">Make their next moment unforgettable</h1>
                    {content.intro.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                    <div className="requests-intro__actions" ref={introCtaRef}>
                      <Link
                        href={chooseHref}
                        className="btn requests-intro__cta"
                      >
                        Book with {profile.name.split(" ")[0]}
                      </Link>
                      <p className="requests-intro__proof">
                        <span aria-hidden="true">★</span>
                        <strong>{reviewAverageLabel}</strong>
                        <span>
                          · {reviewsBlock.count} bookings
                        </span>
                      </p>
                    </div>
                  </section>

                  <div
                    className="requests-gallery"
                    aria-label="Request examples"
                    onMouseEnter={() => setGalleryPaused(true)}
                    onMouseLeave={() => setGalleryPaused(false)}
                    onFocusCapture={() => setGalleryPaused(true)}
                    onBlurCapture={(event) => {
                      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                        setGalleryPaused(false);
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "ArrowLeft") {
                        event.preventDefault();
                        goGallery(-1);
                      }
                      if (event.key === "ArrowRight") {
                        event.preventDefault();
                        goGallery(1);
                      }
                    }}
                  >
                    <div className="requests-gallery__panel">
                      <div className="requests-gallery__media" aria-live="polite">
                        {content.gallery.map((item, index) => {
                          const isActive = index === galleryIndex;
                          return (
                            <div
                              key={item.id}
                              className={`requests-gallery__slide${isActive ? " is-active" : ""}`}
                              aria-hidden={!isActive}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={item.src} alt={isActive ? item.alt : ""} />
                            </div>
                          );
                        })}

                        <MediaPlayOverlay className="requests-gallery__play" />

                        <button
                          type="button"
                          className="requests-gallery__nav requests-gallery__nav--prev"
                          aria-label="Previous example"
                          onClick={() => goGallery(-1)}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path
                              d="M14.5 6.5 9 12l5.5 5.5"
                              stroke="currentColor"
                              strokeWidth="2.1"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="requests-gallery__nav requests-gallery__nav--next"
                          aria-label="Next example"
                          onClick={() => goGallery(1)}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path
                              d="M9.5 6.5 15 12l-5.5 5.5"
                              stroke="currentColor"
                              strokeWidth="2.1"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>

                        {activeGalleryItem?.quote ? (
                          <figure className="requests-gallery__proof" aria-live="polite">
                            {activeGalleryItem.quoteBy ? (
                              <figcaption>{activeGalleryItem.quoteBy}</figcaption>
                            ) : null}
                            {activeGalleryItem.quoteRating ? (
                              <StarRating rating={activeGalleryItem.quoteRating} size={11} />
                            ) : null}
                            <blockquote>{activeGalleryItem.quote}</blockquote>
                          </figure>
                        ) : null}
                      </div>

                      {activeGalleryItem ? (
                        <div className="requests-gallery__footer">
                          <div className="requests-gallery__copy">
                            <p className="requests-gallery__eyebrow">Example</p>
                            <h2 className="requests-gallery__caption">{activeGalleryItem.caption}</h2>
                            {activeGalleryItem.teaser ? (
                              <p className="requests-gallery__teaser">{activeGalleryItem.teaser}</p>
                            ) : null}
                          </div>
                          <Link
                            href={buildChooseHref(
                              activeGalleryItem.categoryId,
                              activeGalleryItem.serviceId,
                            )}
                            className="btn requests-gallery__book"
                          >
                            Book this
                          </Link>
                        </div>
                      ) : null}
                    </div>

                    <div className="requests-gallery__dots" role="tablist" aria-label="Example slides">
                      {content.gallery.map((item, index) => (
                        <button
                          key={`${item.id}-dot`}
                          type="button"
                          role="tab"
                          className={`requests-gallery__dot${index === galleryIndex ? " is-active" : ""}`}
                          aria-label={`Show ${item.caption}`}
                          aria-selected={index === galleryIndex}
                          onClick={() => setGalleryIndex(index)}
                        />
                      ))}
                    </div>
                  </div>

                  <section className="requests-start-cta" ref={bottomCtaRef} aria-label="Booking details">
                    <div className="requests-start-cta__how">
                      <header className="requests-start-cta__how-head">
                        <p className="requests-start-cta__how-eyebrow">Simple booking</p>
                        <h2 id="requests-how-heading">How it works</h2>
                      </header>
                      <ol className="requests-how__steps" aria-labelledby="requests-how-heading">
                        {content.howItWorks.map((step, index) => (
                          <li key={step.title} className="requests-how__step">
                            <span className="requests-how__num" aria-hidden="true">
                              {index + 1}
                            </span>
                            <div>
                              <strong>{step.title}</strong>
                              <p>{step.copy}</p>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </div>

                    <dl className="requests-start-cta__facts">
                      <div>
                        <span className="requests-start-cta__fact-icon" aria-hidden="true">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 3v18" />
                            <path d="M16.5 7.5c0-1.7-2-3-4.5-3s-4.5 1.3-4.5 3 2 3 4.5 3 4.5 1.3 4.5 3-2 3-4.5 3-4.5-1.3-4.5-3" />
                          </svg>
                        </span>
                        <div className="requests-start-cta__fact-copy">
                          <dt>Starting Price Range</dt>
                          <dd>{content.startingRange}</dd>
                        </div>
                      </div>
                      <div>
                        <span className="requests-start-cta__fact-icon" aria-hidden="true">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="8" />
                            <path d="M12 8v4l2.5 1.5" />
                          </svg>
                        </span>
                        <div className="requests-start-cta__fact-copy">
                          <dt>Average Response Time</dt>
                          <dd>{content.responseTime}</dd>
                        </div>
                      </div>
                      <div>
                        <span className="requests-start-cta__fact-icon" aria-hidden="true">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
                            <path d="M8 3.5v3M16 3.5v3M3.5 10h17" />
                          </svg>
                        </span>
                        <div className="requests-start-cta__fact-copy">
                          <dt>Available for Next Booking</dt>
                          <dd>{content.nextAvailable}</dd>
                        </div>
                      </div>
                    </dl>

                    <section
                      className="requests-guarantee"
                      aria-labelledby="requests-guarantee-heading"
                    >
                      <header className="requests-guarantee__intro">
                        <span className="requests-guarantee__icon" aria-hidden="true">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path
                              d="M12 3 4.5 6.5v5.2c0 4.6 3.1 8.7 7.5 9.8 4.4-1.1 7.5-5.2 7.5-9.8V6.5L12 3Z"
                              stroke="currentColor"
                              strokeWidth="1.7"
                              strokeLinejoin="round"
                            />
                            <path
                              d="m9.2 12.1 1.8 1.8 3.8-3.9"
                              stroke="currentColor"
                              strokeWidth="1.7"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                        <div>
                          <p className="requests-guarantee__eyebrow">Booking protection</p>
                          <h2 id="requests-guarantee-heading">Money-back guarantee</h2>
                        </div>
                      </header>

                      <ul className="requests-guarantee__points">
                        {content.guaranteePoints.map((point) => (
                          <li key={point.title}>
                            <span className="requests-guarantee__check" aria-hidden="true">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                <path
                                  d="m5 12.5 4.2 4.2L19 7"
                                  stroke="currentColor"
                                  strokeWidth="2.2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </span>
                            <div>
                              <strong>{point.title}</strong>
                              <p>{point.copy}</p>
                            </div>
                          </li>
                        ))}
                      </ul>

                      <div className="requests-guarantee__payments">
                        <p className="requests-guarantee__payments-label">Secure payments</p>
                        <div className="requests-pay-logos" aria-label="Accepted payment methods">
                          <AmexMark />
                          <DinersMark />
                          <VisaMark />
                          <PaypalMark />
                          <MastercardMark />
                        </div>
                      </div>
                    </section>
                  </section>

                  <section
                    className="requests-reviews product-detail__section product-detail__section--reviews"
                    aria-labelledby="requests-reviews-heading"
                  >
                    <h2 id="requests-reviews-heading">Ratings &amp; reviews</h2>

                    <div className="product-detail__rating-board">
                      <div className="product-detail__rating-summary">
                        <p className="product-detail__rating-average">
                          <strong>{reviewsBlock.average.toFixed(1)}</strong>
                          <span>/5</span>
                        </p>
                        <StarRating rating={reviewsBlock.average} size={16} />
                        <p className="product-detail__rating-count">Based on {reviewsBlock.count} reviews</p>
                      </div>

                      <div className="product-detail__rate-bars" role="list" aria-label="Attribute ratings">
                        {reviewsBlock.attributes.map((attribute) => {
                          const pct = Math.max(0, Math.min(100, (attribute.score / 5) * 100));
                          return (
                            <div key={attribute.label} className="product-detail__rate-bar" role="listitem">
                              <div className="product-detail__rate-bar-meta">
                                <span className="product-detail__rate-bar-label">{attribute.label}</span>
                                <strong className="product-detail__rate-bar-score">
                                  {attribute.score.toFixed(1)}
                                </strong>
                              </div>
                              <div
                                className="product-detail__rate-bar-track"
                                role="meter"
                                aria-label={`${attribute.label} rating`}
                                aria-valuemin={0}
                                aria-valuemax={5}
                                aria-valuenow={attribute.score}
                              >
                                <span className="product-detail__rate-bar-fill" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="product-detail__reviews-toolbar">
                      <div className="product-detail__review-menu" ref={reviewFilterRef}>
                        <button
                          type="button"
                          className="product-detail__review-menu-trigger"
                          aria-haspopup="listbox"
                          aria-expanded={reviewFilterOpen}
                          onClick={() => {
                            setReviewFilterOpen((open) => !open);
                            setReviewSortOpen(false);
                          }}
                        >
                          <span>
                            Filter by <strong>{reviewFilterLabel}</strong>
                          </span>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M7 10l5 5 5-5z" />
                          </svg>
                        </button>
                        {reviewFilterOpen ? (
                          <ul className="product-detail__review-menu-list" role="listbox" aria-label="Filter by star rating">
                            {REVIEW_RATING_OPTIONS.map((option) => (
                              <li key={String(option.id)} role="none">
                                <button
                                  type="button"
                                  role="option"
                                  aria-selected={reviewRatingFilter === option.id}
                                  className={`product-detail__review-menu-option${reviewRatingFilter === option.id ? " is-selected" : ""}`}
                                  onClick={() => {
                                    setReviewRatingFilter(option.id);
                                    setReviewFilterOpen(false);
                                    setVisibleReviewCount(REVIEW_INITIAL_COUNT);
                                  }}
                                >
                                  {option.label}
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>

                      <div className="product-detail__review-menu" ref={reviewSortRef}>
                        <button
                          type="button"
                          className="product-detail__review-menu-trigger"
                          aria-haspopup="listbox"
                          aria-expanded={reviewSortOpen}
                          onClick={() => {
                            setReviewSortOpen((open) => !open);
                            setReviewFilterOpen(false);
                          }}
                        >
                          <span>
                            Sort by <strong>{reviewSortLabel}</strong>
                          </span>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M7 10l5 5 5-5z" />
                          </svg>
                        </button>
                        {reviewSortOpen ? (
                          <ul className="product-detail__review-menu-list" role="listbox" aria-label="Sort reviews">
                            {REVIEW_SORT_OPTIONS.map((option) => (
                              <li key={option.id} role="none">
                                <button
                                  type="button"
                                  role="option"
                                  aria-selected={reviewSort === option.id}
                                  className={`product-detail__review-menu-option${reviewSort === option.id ? " is-selected" : ""}`}
                                  onClick={() => {
                                    setReviewSort(option.id);
                                    setReviewSortOpen(false);
                                    setVisibleReviewCount(REVIEW_INITIAL_COUNT);
                                  }}
                                >
                                  {option.label}
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    </div>

                    <div className="product-detail__reviews">
                      {visibleReviews.length ? (
                        visibleReviews.map((review) => (
                          <article key={review.id} className="product-detail__review">
                            <div className="product-detail__review-head">
                              <span className="product-detail__review-avatar" aria-hidden="true">
                                {review.avatar_initials}
                              </span>
                              <div className="product-detail__review-identity">
                                <p className="product-detail__review-name">{review.name}</p>
                                <p className="product-detail__review-meta">{review.ago}</p>
                              </div>
                            </div>
                            <StarRating rating={review.rating} />
                            <p className="product-detail__review-variant">{review.variant}</p>
                            <p className="product-detail__review-text">{review.text}</p>
                          </article>
                        ))
                      ) : (
                        <p className="product-detail__reviews-empty-copy product-detail__reviews-filter-empty">
                          No reviews match this filter.
                        </p>
                      )}
                    </div>

                    {remainingReviews > 0 ? (
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm product-detail__all-reviews"
                        onClick={() =>
                          setVisibleReviewCount((current) =>
                            Math.min(current + REVIEW_PAGE_SIZE, availableReviews.length),
                          )
                        }
                      >
                        {visibleReviewCount <= REVIEW_INITIAL_COUNT
                          ? `Show all ${availableReviews.length} reviews`
                          : remainingReviews > REVIEW_PAGE_SIZE
                            ? `Show ${REVIEW_PAGE_SIZE} more reviews`
                            : `Show remaining ${remainingReviews} reviews`}
                      </button>
                    ) : null}
                  </section>
                </>
              ) : (
                <section className="requests-guide" aria-labelledby="requests-guide-heading">
                  <header className="requests-guide__head">
                    <div className="requests-guide__copy">
                      <p className="requests-guide__eyebrow">Step {pickerStep} of 4</p>
                      <h1 id="requests-guide-heading" className="requests-guide__title">
                        {pickerStep === 1
                          ? "What do you need?"
                          : pickerStep === 2
                            ? "Pick your request"
                            : pickerStep === 3
                              ? "Personalize your request"
                              : "Review & pay"}
                      </h1>
                      <p>
                        {pickerStep === 1
                          ? "Choose an occasion type. You’ll refine the exact request next."
                          : pickerStep === 2
                            ? `Select one option from ${activeCategory.title.toLowerCase()}.`
                            : pickerStep === 3
                              ? "A few details so everything arrives exactly right."
                              : "Review everything below, then pay. Use Edit or the steps above to change anything."}
                      </p>
                      {pickerStep === 1 ? (
                        <p className="requests-guide__trust">
                          <span aria-hidden="true">★</span> {reviewAverageLabel} ·{" "}
                          {reviewsBlock.count} bookings · Avg. response {content.responseTime}
                        </p>
                      ) : null}
                    </div>

                    <nav className="requests-progress" aria-label="Request steps">
                      {(
                        [
                          {
                            step: 1 as const,
                            label: "Occasion",
                            shortLabel: "Occasion",
                            enabled: true,
                          },
                          {
                            step: 2 as const,
                            label: "Request",
                            shortLabel: "Request",
                            enabled: hasChosenCategory,
                          },
                          {
                            step: 3 as const,
                            label: "Personalize",
                            shortLabel: "Details",
                            enabled: hasChosenCategory && Boolean(selected),
                          },
                          {
                            step: 4 as const,
                            label: "Review & Pay",
                            shortLabel: "Pay",
                            enabled: hasChosenCategory && Boolean(selected) && personalizedReady,
                          },
                        ] as const
                      ).map((item, index) => (
                        <Fragment key={item.step}>
                          {index > 0 ? (
                            <span className="requests-progress__rule" aria-hidden="true" />
                          ) : null}
                          <button
                            type="button"
                            className={`requests-progress__step${
                              pickerStep === item.step
                                ? " is-active"
                                : pickerStep > item.step
                                  ? " is-done"
                                  : ""
                            }`}
                            onClick={() => setPickerStep(item.step)}
                            disabled={!item.enabled}
                            aria-current={pickerStep === item.step ? "step" : undefined}
                            aria-label={item.label}
                          >
                            <span className="requests-progress__num" aria-hidden="true">
                              {item.step}
                            </span>
                            <span className="requests-progress__label" aria-hidden="true">
                              <span className="requests-progress__label-full">{item.label}</span>
                              <span className="requests-progress__label-short">{item.shortLabel}</span>
                            </span>
                          </button>
                        </Fragment>
                      ))}
                    </nav>
                  </header>

                  {pickerStep === 1 ? (
                    <>
                      <div className="requests-pick" role="list">
                        {content.categories.map((category) => {
                          const fromPrice = Math.min(
                            ...category.services.map((service) => service.priceMin),
                          );
                          const isActive = hasChosenCategory && category.id === categoryId;
                          return (
                            <button
                              key={category.id}
                              type="button"
                              role="listitem"
                              className={`requests-pick__option${isActive ? " is-selected" : ""}`}
                              aria-pressed={isActive}
                              aria-label={`${category.intent}. From $${fromPrice}${
                                category.popular ? ". Most booked" : ""
                              }`}
                              onClick={() => chooseCategory(category.id)}
                            >
                              <span className="requests-pick__media" aria-hidden="true">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={category.image} alt="" />
                              </span>
                              <span className="requests-pick__veil" aria-hidden="true" />
                              <span className="requests-pick__label">
                                {category.popular ? (
                                  <span className="requests-pick__note">Most booked</span>
                                ) : (
                                  <span className="requests-pick__note requests-pick__note--quiet">
                                    {category.formats[0]}
                                  </span>
                                )}
                                <strong>{category.intent}</strong>
                                <span className="requests-pick__price">From ${fromPrice}</span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <p className="requests-intent-help">
                        <span className="requests-intent-help__icon" aria-hidden="true">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path
                              d="M12 3.2 13.4 8.6 18.8 10 13.4 11.4 12 16.8 10.6 11.4 5.2 10 10.6 8.6 12 3.2Z"
                              fill="currentColor"
                            />
                            <path
                              d="m18.2 14.2.7 2.4 2.4.7-2.4.7-.7 2.4-.7-2.4-2.4-.7 2.4-.7.7-2.4Z"
                              fill="currentColor"
                            />
                          </svg>
                        </span>
                        <span className="requests-intent-help__copy">
                          Not sure?{" "}
                          <button
                            type="button"
                            className="requests-intent-help__action"
                            onClick={() => chooseCategory(popularCategory.id)}
                          >
                            Start with {popularCategory.intent}
                          </button>
                          — {profile.name.split(" ")[0]}’s most booked.
                        </span>
                      </p>
                    </>
                  ) : pickerStep === 2 ? (
                    <>
                      <div className="requests-service-panel__context">
                        <span className="requests-service-panel__thumb">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={activeCategory.image} alt="" />
                        </span>
                        <div className="requests-service-panel__copy">
                          <p className="requests-service-panel__intent">{activeCategory.intent}</p>
                          <h2>{activeCategory.title}</h2>
                        </div>
                      </div>

                      <div className="requests-choose-split">
                        <div className="requests-service-panel">
                          <fieldset className="requests-service-list">
                            <legend className="visually-hidden">Select a request</legend>
                            {activeCategory.services.map((service) => {
                              const selectedService = service.id === selectedId;
                              return (
                                <label
                                  key={service.id}
                                  className={`requests-service${selectedService ? " is-selected" : ""}`}
                                >
                                  <input
                                    type="radio"
                                    name="special-request-service"
                                    value={service.id}
                                    checked={selectedService}
                                    onChange={() => chooseService(service.id)}
                                  />
                                  <span className="requests-service__radio" aria-hidden="true" />
                                  <span className="requests-service__body">
                                    <span className="requests-service__main">
                                      <span className="requests-service__title-row">
                                        <strong>{service.label}</strong>
                                        {service.popular ? (
                                          <span className="requests-service__badge">Most booked</span>
                                        ) : null}
                                      </span>
                                      <span className="requests-service__blurb">{service.blurb}</span>
                                    </span>
                                    <span className="requests-service__price">
                                      {formatRequestPriceRange(service.priceMin, service.priceMax)}
                                    </span>
                                  </span>
                                </label>
                              );
                            })}
                          </fieldset>

                          {selected ? (
                            <ServiceExplainer
                              serviceId={selected.id}
                              details={selected.details}
                              media={selected.media}
                            />
                          ) : null}
                        </div>

                        <aside className="requests-choose-summary">
                          <section className="requests-summary" aria-labelledby="requests-booking-heading">
                            <header className="requests-summary__head">
                              <p className="requests-summary__eyebrow" id="requests-booking-heading">
                                Your request
                              </p>
                              <h2 className="requests-summary__title">
                                {selected?.label ?? "Select a request"}
                              </h2>
                              {activeCategory ? (
                                <p className="requests-summary__context">{activeCategory.title}</p>
                              ) : null}
                            </header>

                            <dl className="requests-summary__facts">
                              <div className="requests-summary__fact">
                                <dt>Price range</dt>
                                <dd>{priceRange}</dd>
                              </div>
                              <div className="requests-summary__fact">
                                <dt>Response</dt>
                                <dd>{content.responseTime}</dd>
                              </div>
                              <div className="requests-summary__fact">
                                <dt>Available</dt>
                                <dd>{content.nextAvailable}</dd>
                              </div>
                            </dl>

                            <div className="requests-summary__total">
                              <div className="requests-summary__total-copy">
                                <span>Total fee</span>
                                <strong>${dayRate}</strong>
                              </div>
                              <p className="requests-summary__total-note">Starting price for this request</p>
                              <MoneyBackGuaranteeTag copy={content.guarantee} tipId="requests-guarantee-tip-step2" />
                            </div>

                            <div className="requests-summary__cta-row">
                              <div className="requests-summary__cta-shell">
                                <button
                                  type="button"
                                  className="btn btn--primary requests-summary__cta"
                                  disabled={!selected}
                                  onClick={() => setPickerStep(3)}
                                >
                                  Personalize
                                </button>
                                <span className="requests-summary__cta-tip">
                                  <SummaryInfoTip
                                    tipId="requests-personalize-info-tip"
                                    title="What happens next?"
                                    copy="Personalize lets you choose delivery, content type, schedule, and who the shoutout is for — then you’ll review and pay."
                                  />
                                </span>
                              </div>
                            </div>
                          </section>
                        </aside>
                      </div>
                    </>
                  ) : pickerStep === 3 ? (
                    <div className="requests-choose-split">
                      <form
                        className="requests-pz"
                        aria-label="Personalize your request"
                        onSubmit={(event) => {
                          event.preventDefault();
                          tryContinueFromPersonalize();
                        }}
                      >
                        {!isAppearanceCategory ? (
                          <section className="requests-pz__block">
                            <div className="requests-pz__bundle">
                              <div className="requests-pz__bundle-section">
                                <div className="requests-pz__head">
                                  <p className="requests-pz__eyebrow">Delivery</p>
                                  <SectionInfoTip
                                    tipId="requests-pz-delivery-tip"
                                    title="Delivery"
                                    copy="Choose how the shoutout reaches you — privately by direct message, or as a tagged post on the creator’s feed for an extra fee."
                                  />
                                </div>
                                <div className="requests-pz__delivery" role="radiogroup" aria-label="Delivery method">
                                  <label
                                    className={`requests-pz__delivery-tile${deliveryMethod === "dm" ? " is-selected" : ""}`}
                                  >
                                    <input
                                      type="radio"
                                      name="request-delivery-method"
                                      value="dm"
                                      checked={deliveryMethod === "dm"}
                                      onChange={() => setDeliveryMethod("dm")}
                                    />
                                    <span className="requests-pz__delivery-mark" aria-hidden="true" />
                                    <strong>Audio/Video clip delivered to me</strong>
                                    <span>You’ll receive the shoutout via direct message</span>
                                  </label>
                                  <label
                                    className={`requests-pz__delivery-tile${deliveryMethod === "feed" ? " is-selected" : ""}`}
                                  >
                                    <input
                                      type="radio"
                                      name="request-delivery-method"
                                      value="feed"
                                      checked={deliveryMethod === "feed"}
                                      onChange={() => setDeliveryMethod("feed")}
                                    />
                                    <span className="requests-pz__delivery-mark" aria-hidden="true" />
                                    <strong>Tagged post on {profile.name}&apos;s feeds</strong>
                                    <span>Shoutout is visible to all your followers (+${FEED_SURCHARGE})</span>
                                  </label>
                                </div>
                              </div>

                              <div className="requests-pz__bundle-section">
                                <div className="requests-pz__head">
                                  <p className="requests-pz__eyebrow">Format</p>
                                  <SectionInfoTip
                                    tipId="requests-pz-format-tip"
                                    title="Format"
                                    copy="Pick whether you want a text, audio, or video shoutout, then choose how long it should be."
                                  />
                                </div>
                                <div className="requests-pz__format" role="list" aria-label="Content format">
                                  {(
                                    [
                                      {
                                        id: "text" as const,
                                        label: "Text",
                                        icon: (
                                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                            <path d="M4 7h16M4 12h10M4 17h13" />
                                          </svg>
                                        ),
                                      },
                                      {
                                        id: "audio" as const,
                                        label: "Audio",
                                        icon: (
                                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                            <path d="M12 3v11" />
                                            <path d="M8 14a4 4 0 0 0 8 0" />
                                            <path d="M5 10v2a7 7 0 0 0 14 0v-2" />
                                          </svg>
                                        ),
                                      },
                                      {
                                        id: "video" as const,
                                        label: "Video",
                                        icon: (
                                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                            <rect x="3" y="6" width="13" height="12" rx="2" />
                                            <path d="m16 10 5-3v10l-5-3z" />
                                          </svg>
                                        ),
                                      },
                                    ] as const
                                  ).map((option) => (
                                    <button
                                      key={option.id}
                                      type="button"
                                      role="listitem"
                                      ref={(node) => {
                                        contentTypeRefs.current[option.id] = node;
                                      }}
                                      className={`requests-pz__format-tile${contentKind === option.id ? " is-selected" : ""}`}
                                      aria-pressed={contentKind === option.id}
                                      onClick={() => {
                                        setContentKind(option.id);
                                        focusPersonalizeControl(durationRef.current);
                                      }}
                                    >
                                      <span className="requests-pz__format-mark" aria-hidden="true" />
                                      <span className="requests-pz__format-icon">{option.icon}</span>
                                      <strong>{option.label}</strong>
                                    </button>
                                  ))}
                                </div>
                                <label className={`requests-pz__field${durationInvalid ? " is-invalid" : ""}`}>
                                  <span className="requests-pz__label">Length</span>
                                  <select
                                    ref={durationRef}
                                    className={`requests-pz__input${durationInvalid ? " is-invalid" : ""}`}
                                    value={duration}
                                    aria-invalid={durationInvalid || undefined}
                                    onChange={(event) => setDuration(event.target.value)}
                                  >
                                    <option value="">Select</option>
                                    {DURATION_OPTIONS.map((option) => (
                                      <option key={option} value={option}>
                                        {option}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              </div>
                            </div>
                          </section>
                        ) : null}

                        <section className="requests-pz__block">
                          <div className="requests-pz__head">
                            <p className="requests-pz__eyebrow">
                              {isAppearanceCategory ? "When" : "Schedule"}
                            </p>
                            <SectionInfoTip
                              tipId="requests-pz-schedule-tip"
                              title={isAppearanceCategory ? "When" : "Schedule"}
                              copy={
                                isAppearanceCategory
                                  ? "Pick the appearance date and start time. Available days show the request fee so you can plan ahead."
                                  : "Pick the delivery date and time. Available days show pricing so you can choose what works best."
                              }
                            />
                          </div>
                          {deliveryDate ? (
                            <p className="requests-pz__confirm">
                              {formatDisplayDate(deliveryDate)}
                              {deliveryTime ? ` · ${deliveryTime}` : ""}
                            </p>
                          ) : null}
                          <div
                            className={`requests-calendar${dateInvalid ? " is-invalid" : ""}`}
                            aria-invalid={dateInvalid || undefined}
                          >
                            <div className="requests-calendar__toolbar">
                              <button
                                type="button"
                                className="requests-calendar__nav"
                                aria-label="Previous month"
                                onClick={() =>
                                  setCalendarCursor((current) => {
                                    const date = new Date(current.year, current.month - 1, 1);
                                    return { year: date.getFullYear(), month: date.getMonth() };
                                  })
                                }
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                  <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                                </svg>
                              </button>
                              <div className="requests-calendar__period">
                                {monthLabel(calendarCursor.year, calendarCursor.month)} {calendarCursor.year}
                              </div>
                              <button
                                type="button"
                                className="requests-calendar__nav"
                                aria-label="Next month"
                                onClick={() =>
                                  setCalendarCursor((current) => {
                                    const date = new Date(current.year, current.month + 1, 1);
                                    return { year: date.getFullYear(), month: date.getMonth() };
                                  })
                                }
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                  <path d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                                </svg>
                              </button>
                            </div>
                            <div className="requests-calendar__weekdays" aria-hidden="true">
                              {WEEKDAY_LABELS.map((label) => (
                                <span key={label}>{label}</span>
                              ))}
                            </div>
                            <div className="requests-calendar__grid" role="grid" aria-label="Available dates">
                              {(() => {
                                let firstAvailableAssigned = false;
                                return calendarDays.map((cell) => {
                                  if (!cell.inMonth) {
                                    return <span key={cell.key} className="requests-calendar__cell is-empty" />;
                                  }
                                  const key = toDateKey(cell.date);
                                  const disabled = cell.date < earliestDate;
                                  const selectedDay = deliveryDate === key;
                                  const shownPrice =
                                    dayRate +
                                    (!isAppearanceCategory && deliveryMethod === "feed"
                                      ? FEED_SURCHARGE
                                      : 0);
                                  const isFirstAvailable = !disabled && !firstAvailableAssigned;
                                  if (isFirstAvailable) firstAvailableAssigned = true;
                                  return (
                                    <button
                                      key={cell.key}
                                      type="button"
                                      role="gridcell"
                                      ref={isFirstAvailable ? firstDateRef : undefined}
                                      className={`requests-calendar__cell${selectedDay ? " is-selected" : ""}${disabled ? " is-disabled" : ""}`}
                                      disabled={disabled}
                                      aria-pressed={selectedDay}
                                      onClick={() => {
                                        setDeliveryDate(key);
                                        focusPersonalizeControl(deliveryTimeRef.current);
                                      }}
                                    >
                                      <span className="requests-calendar__day">{cell.date.getDate()}</span>
                                      {!disabled ? (
                                        <span className="requests-calendar__price">${shownPrice}</span>
                                      ) : null}
                                    </button>
                                  );
                                });
                              })()}
                            </div>
                          </div>
                          <label className={`requests-pz__field${timeInvalid ? " is-invalid" : ""}`}>
                            <span className="requests-pz__label">
                              {isAppearanceCategory ? "Start time" : "Delivery time"}
                            </span>
                            <select
                              ref={deliveryTimeRef}
                              className={`requests-pz__input${timeInvalid ? " is-invalid" : ""}`}
                              value={deliveryTime}
                              aria-invalid={timeInvalid || undefined}
                              onChange={(event) => {
                                setDeliveryTime(event.target.value);
                                if (event.target.value) {
                                  focusPersonalizeControl(
                                    isAppearanceCategory
                                      ? appearanceOccasionRef.current
                                      : recipientTarget === "self"
                                        ? shoutoutMessageRef.current
                                        : recipientOtherRef.current,
                                  );
                                }
                              }}
                            >
                              <option value="">Select</option>
                              {TIME_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </label>
                        </section>

                        {isAppearanceCategory ? (
                          <section className="requests-pz__block">
                            <p className="requests-pz__eyebrow">Event</p>
                            <label className={`requests-pz__field${occasionInvalid ? " is-invalid" : ""}`}>
                              <span className="requests-pz__label">Occasion</span>
                              <input
                                ref={appearanceOccasionRef}
                                className={`requests-pz__input${occasionInvalid ? " is-invalid" : ""}`}
                                type="text"
                                aria-invalid={occasionInvalid || undefined}
                                value={appearanceOccasion}
                                placeholder="Anniversary run, expo, podcast…"
                                onChange={(event) => setAppearanceOccasion(event.target.value)}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") {
                                    event.preventDefault();
                                    focusPersonalizeControl(appearanceLocationRef.current);
                                  }
                                }}
                              />
                            </label>
                            <LocationSearchField
                              label="Location"
                              value={appearanceLocation}
                              onChange={(place) => {
                                setAppearanceLocation(place);
                                if (place) focusPersonalizeControl(appearanceDurationHoursRef.current);
                              }}
                              inputRef={appearanceLocationRef}
                              placeholder="Venue or address"
                              invalid={locationInvalid}
                            />
                            <div
                              className={`requests-pz__field${durationHoursInvalid || durationMinsInvalid ? " is-invalid" : ""}`}
                            >
                              <span className="requests-pz__label">Duration</span>
                              <div className="requests-pz__pair">
                                <select
                                  ref={appearanceDurationHoursRef}
                                  className={`requests-pz__input${durationHoursInvalid ? " is-invalid" : ""}`}
                                  value={appearanceDurationHours}
                                  aria-label="Hours"
                                  aria-invalid={durationHoursInvalid || undefined}
                                  onChange={(event) => {
                                    const nextHours = event.target.value;
                                    setAppearanceDurationHours(nextHours);
                                    if (nextHours !== "" && appearanceDurationMins === "") {
                                      setAppearanceDurationMins("0");
                                    }
                                  }}
                                >
                                  <option value="">Hours</option>
                                  {APPEARANCE_DURATION_HOURS.map((option) => (
                                    <option key={option} value={option}>
                                      {option}h
                                    </option>
                                  ))}
                                </select>
                                <select
                                  ref={appearanceDurationMinsRef}
                                  className={`requests-pz__input${durationMinsInvalid ? " is-invalid" : ""}`}
                                  value={appearanceDurationMins}
                                  aria-label="Minutes"
                                  aria-invalid={durationMinsInvalid || undefined}
                                  onChange={(event) => setAppearanceDurationMins(event.target.value)}
                                >
                                  <option value="">Mins</option>
                                  {APPEARANCE_DURATION_MINUTES.map((option) => (
                                    <option key={option} value={option}>
                                      {option}m
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <label className={`requests-pz__field${expectationInvalid ? " is-invalid" : ""}`}>
                              <span className="requests-pz__label">Expectation</span>
                              <textarea
                                ref={appearanceExpectationRef}
                                className={`requests-pz__input requests-pz__input--area${expectationInvalid ? " is-invalid" : ""}`}
                                value={appearanceExpectation}
                                placeholder={`What should ${profile.name} prepare for?`}
                                rows={4}
                                aria-invalid={expectationInvalid || undefined}
                                onChange={(event) => setAppearanceExpectation(event.target.value)}
                              />
                            </label>
                            <div className="requests-pz__field">
                              <span className="requests-pz__label">
                                Reference <em>optional</em>
                              </span>
                              <div className="requests-pz__file">
                                <input
                                  ref={appearanceReferenceRef}
                                  className="requests-pz__file-input"
                                  type="file"
                                  accept="image/*,.pdf,.doc,.docx,.txt"
                                  onChange={(event) => {
                                    const file = event.target.files?.[0] ?? null;
                                    setAppearanceReference(file);
                                  }}
                                />
                                <button
                                  type="button"
                                  className="requests-pz__file-btn"
                                  onClick={() => appearanceReferenceRef.current?.click()}
                                >
                                  {appearanceReference ? appearanceReference.name : "Attach a file"}
                                </button>
                                {appearanceReference ? (
                                  <button
                                    type="button"
                                    className="requests-pz__file-clear"
                                    aria-label="Remove file"
                                    onClick={() => {
                                      setAppearanceReference(null);
                                      if (appearanceReferenceRef.current) {
                                        appearanceReferenceRef.current.value = "";
                                      }
                                    }}
                                  >
                                    Remove
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          </section>
                        ) : (
                          <section className="requests-pz__block">
                            <p className="requests-pz__eyebrow">Message</p>
                            <div className="requests-pz__options" role="group" aria-label="Who is this for">
                              <button
                                type="button"
                                ref={recipientSelfRef}
                                className={`requests-pz__option${recipientTarget === "self" ? " is-selected" : ""}`}
                                aria-pressed={recipientTarget === "self"}
                                onClick={() => {
                                  setRecipientTarget("self");
                                  focusPersonalizeControl(shoutoutMessageRef.current);
                                }}
                              >
                                For me
                              </button>
                              <button
                                type="button"
                                ref={recipientOtherRef}
                                className={`requests-pz__option${recipientTarget === "other" ? " is-selected" : ""}`}
                                aria-pressed={recipientTarget === "other"}
                                onClick={() => {
                                  setRecipientTarget("other");
                                  window.setTimeout(() => {
                                    focusPersonalizeControl(recipientNameRef.current);
                                  }, 0);
                                }}
                              >
                                Someone else
                              </button>
                            </div>
                            {recipientTarget === "other" ? (
                              <div className="requests-pz__pair">
                                <label className={`requests-pz__field${recipientNameInvalid ? " is-invalid" : ""}`}>
                                  <span className="requests-pz__label">Name</span>
                                  <input
                                    ref={recipientNameRef}
                                    className={`requests-pz__input${recipientNameInvalid ? " is-invalid" : ""}`}
                                    type="text"
                                    value={recipientName}
                                    placeholder="Name"
                                    aria-invalid={recipientNameInvalid || undefined}
                                    onChange={(event) => setRecipientName(event.target.value)}
                                    onKeyDown={(event) => {
                                      if (event.key === "Enter") {
                                        event.preventDefault();
                                        focusPersonalizeControl(recipientUsernameRef.current);
                                      }
                                    }}
                                    autoComplete="name"
                                  />
                                </label>
                                <label className={`requests-pz__field${recipientUsernameInvalid ? " is-invalid" : ""}`}>
                                  <span className="requests-pz__label">Username</span>
                                  <input
                                    ref={recipientUsernameRef}
                                    className={`requests-pz__input${recipientUsernameInvalid ? " is-invalid" : ""}`}
                                    type="text"
                                    value={recipientUsername}
                                    placeholder="@username"
                                    aria-invalid={recipientUsernameInvalid || undefined}
                                    onChange={(event) => setRecipientUsername(event.target.value)}
                                    onKeyDown={(event) => {
                                      if (event.key === "Enter") {
                                        event.preventDefault();
                                        focusPersonalizeControl(shoutoutMessageRef.current);
                                      }
                                    }}
                                    autoComplete="username"
                                  />
                                </label>
                              </div>
                            ) : null}
                            <label className={`requests-pz__field${messageInvalid ? " is-invalid" : ""}`}>
                              <span className="requests-pz__label">Your message</span>
                              <textarea
                                ref={shoutoutMessageRef}
                                className={`requests-pz__input requests-pz__input--area${messageInvalid ? " is-invalid" : ""}`}
                                value={shoutoutMessage}
                                placeholder="What should be said, and for whom…"
                                rows={5}
                                aria-invalid={messageInvalid || undefined}
                                onChange={(event) => setShoutoutMessage(event.target.value)}
                              />
                            </label>
                          </section>
                        )}
                      </form>

                      <aside className="requests-choose-summary">
                        <section className="requests-summary" aria-labelledby="requests-personalize-summary-heading">
                          <header className="requests-summary__head">
                            <p className="requests-summary__eyebrow" id="requests-personalize-summary-heading">
                              Your request
                            </p>
                            <h2 className="requests-summary__title">
                              {selected?.label ?? "Select a request"}
                            </h2>
                            {activeCategory ? (
                              <p className="requests-summary__context">{activeCategory.title}</p>
                            ) : null}
                          </header>

                          <dl className="requests-summary__facts">
                            {!isAppearanceCategory ? (
                              <>
                                <div className="requests-summary__fact">
                                  <dt>Delivery</dt>
                                  <dd>
                                    {deliveryMethod === "feed"
                                      ? `Tagged feed (+$${FEED_SURCHARGE})`
                                      : "Direct message"}
                                  </dd>
                                </div>
                                <div className="requests-summary__fact">
                                  <dt>Format</dt>
                                  <dd>
                                    {contentKind.charAt(0).toUpperCase() + contentKind.slice(1)}
                                    {duration ? ` · ${duration}` : ""}
                                  </dd>
                                </div>
                                <div className="requests-summary__fact">
                                  <dt>Recipient</dt>
                                  <dd>
                                    {recipientTarget === "self"
                                      ? "For me"
                                      : recipientName.trim() || "Someone else"}
                                  </dd>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="requests-summary__fact">
                                  <dt>Occasion</dt>
                                  <dd>{appearanceOccasion.trim() || "Add occasion"}</dd>
                                </div>
                                <div className="requests-summary__fact">
                                  <dt>Location</dt>
                                  <dd>{appearanceLocation?.label.split(",")[0] || "Search location"}</dd>
                                </div>
                                <div className="requests-summary__fact">
                                  <dt>Duration</dt>
                                  <dd>{appearanceDurationLabel || "Select duration"}</dd>
                                </div>
                              </>
                            )}
                            <div className="requests-summary__fact">
                              <dt>Date</dt>
                              <dd>{deliveryDate ? formatDisplayDate(deliveryDate) : "Select a date"}</dd>
                            </div>
                            <div className="requests-summary__fact">
                              <dt>Time</dt>
                              <dd>{deliveryTime || "Select a time"}</dd>
                            </div>
                          </dl>

                          <div className="requests-summary__total">
                            <dl className="requests-summary__breakdown">
                              <div>
                                <dt>Request fee</dt>
                                <dd>${dayRate}</dd>
                              </div>
                              {feedFee > 0 ? (
                                <div>
                                  <dt>Feed post</dt>
                                  <dd>+${feedFee}</dd>
                                </div>
                              ) : null}
                            </dl>
                            <div className="requests-summary__total-copy">
                              <span>Total fee</span>
                              <strong>${totalFee}</strong>
                            </div>
                            <MoneyBackGuaranteeTag copy={content.guarantee} tipId="requests-guarantee-tip-step3" />
                          </div>

                          <div className="requests-summary__cta-row">
                            <div className="requests-summary__cta-shell">
                              <button
                                type="button"
                                className="btn btn--primary requests-summary__cta"
                                onClick={() => tryContinueFromPersonalize()}
                              >
                                Continue
                              </button>
                              <span className="requests-summary__cta-tip">
                                <SummaryInfoTip
                                  tipId="requests-continue-info-tip"
                                  title="What happens next?"
                                  copy="Continue takes you to Review & Pay, where you’ll review your details and complete payment to lock in the request."
                                />
                              </span>
                            </div>
                            {personalizeTried && !personalizedReady ? (
                              <p className="requests-summary__cta-error" role="alert">
                                Complete the highlighted fields to continue.
                              </p>
                            ) : null}
                          </div>
                        </section>
                      </aside>
                    </div>
                  ) : (
                    <div className="requests-choose-split requests-review-layout">
                      <div className="requests-review">
                        <section className="requests-review__panel" aria-label="Request review">
                          <div className="requests-review__section" aria-labelledby="requests-review-request-heading">
                            <header className="requests-review__head">
                              <div>
                                <p className="requests-review__eyebrow">Occasion &amp; request</p>
                                <h2 id="requests-review-request-heading">{selected?.label ?? "Your request"}</h2>
                              </div>
                              <div className="requests-review__actions">
                                <button type="button" className="requests-review__edit" onClick={() => setPickerStep(1)}>
                                  Edit occasion
                                </button>
                                <button type="button" className="requests-review__edit" onClick={() => setPickerStep(2)}>
                                  Edit request
                                </button>
                              </div>
                            </header>
                            <dl className="requests-review__facts">
                              <div className="requests-review__fact">
                                <dt>Category</dt>
                                <dd>{activeCategory.title}</dd>
                              </div>
                              <div className="requests-review__fact">
                                <dt>Request</dt>
                                <dd>{selected?.label}</dd>
                              </div>
                              {selected?.blurb ? (
                                <div className="requests-review__fact requests-review__fact--wide">
                                  <dt>Includes</dt>
                                  <dd>{selected.blurb}</dd>
                                </div>
                              ) : null}
                            </dl>
                          </div>

                          {!isAppearanceCategory ? (
                            <>
                              <hr className="requests-review__rule" />
                              <div className="requests-review__section" aria-labelledby="requests-review-delivery-heading">
                                <header className="requests-review__head">
                                  <div>
                                    <p className="requests-review__eyebrow">Personalize</p>
                                    <h2 id="requests-review-delivery-heading">Delivery &amp; content</h2>
                                  </div>
                                  <button type="button" className="requests-review__edit" onClick={() => setPickerStep(3)}>
                                    Edit
                                  </button>
                                </header>
                                <dl className="requests-review__facts">
                                  <div className="requests-review__fact">
                                    <dt>Delivery</dt>
                                    <dd>
                                      {deliveryMethod === "feed"
                                        ? `Tagged feed post (+$${FEED_SURCHARGE})`
                                        : "Direct message"}
                                    </dd>
                                  </div>
                                  <div className="requests-review__fact">
                                    <dt>Content</dt>
                                    <dd>
                                      {contentKind.charAt(0).toUpperCase() + contentKind.slice(1)}
                                      {duration ? ` · ${duration}` : ""}
                                    </dd>
                                  </div>
                                </dl>
                              </div>
                            </>
                          ) : null}

                          <hr className="requests-review__rule" />
                          <div className="requests-review__section" aria-labelledby="requests-review-schedule-heading">
                            <header className="requests-review__head">
                              <div>
                                <p className="requests-review__eyebrow">Personalize</p>
                                <h2 id="requests-review-schedule-heading">Schedule</h2>
                              </div>
                              <button type="button" className="requests-review__edit" onClick={() => setPickerStep(3)}>
                                Edit
                              </button>
                            </header>
                            <dl className="requests-review__facts">
                              <div className="requests-review__fact">
                                <dt>Date</dt>
                                <dd>{formatDisplayDate(deliveryDate)}</dd>
                              </div>
                              <div className="requests-review__fact">
                                <dt>Time</dt>
                                <dd>{deliveryTime || "—"}</dd>
                              </div>
                            </dl>
                          </div>

                          {isAppearanceCategory ? (
                            <>
                              <hr className="requests-review__rule" />
                              <div className="requests-review__section" aria-labelledby="requests-review-event-heading">
                                <header className="requests-review__head">
                                  <div>
                                    <p className="requests-review__eyebrow">Personalize</p>
                                    <h2 id="requests-review-event-heading">Event details</h2>
                                  </div>
                                  <button
                                    type="button"
                                    className="requests-review__edit"
                                    onClick={() => setPickerStep(3)}
                                  >
                                    Edit
                                  </button>
                                </header>
                                <dl className="requests-review__facts">
                                  <div className="requests-review__fact">
                                    <dt>Occasion</dt>
                                    <dd>{appearanceOccasion.trim() || "—"}</dd>
                                  </div>
                                  <div className="requests-review__fact">
                                    <dt>Duration</dt>
                                    <dd>{appearanceDurationLabel || "—"}</dd>
                                  </div>
                                  <div className="requests-review__fact requests-review__fact--wide">
                                    <dt>Location</dt>
                                    <dd>{appearanceLocation?.label || "—"}</dd>
                                  </div>
                                  <div className="requests-review__fact requests-review__fact--wide">
                                    <dt>Expectation</dt>
                                    <dd className="requests-review__message">
                                      {appearanceExpectation.trim() || "—"}
                                    </dd>
                                  </div>
                                  <div className="requests-review__fact">
                                    <dt>Reference</dt>
                                    <dd>{appearanceReference?.name || "None attached"}</dd>
                                  </div>
                                </dl>
                              </div>
                            </>
                          ) : (
                            <>
                              <hr className="requests-review__rule" />
                              <div className="requests-review__section" aria-labelledby="requests-review-recipient-heading">
                                <header className="requests-review__head">
                                  <div>
                                    <p className="requests-review__eyebrow">Personalize</p>
                                    <h2 id="requests-review-recipient-heading">Recipient &amp; message</h2>
                                  </div>
                                  <button type="button" className="requests-review__edit" onClick={() => setPickerStep(3)}>
                                    Edit
                                  </button>
                                </header>
                                <dl className="requests-review__facts">
                                  <div className="requests-review__fact">
                                    <dt>For</dt>
                                    <dd>
                                      {recipientTarget === "self"
                                        ? "Me"
                                        : recipientName.trim() || "Someone else"}
                                    </dd>
                                  </div>
                                  {recipientTarget === "other" ? (
                                    <div className="requests-review__fact">
                                      <dt>Username</dt>
                                      <dd>
                                        {recipientUsername.trim()
                                          ? `@${recipientUsername.trim().replace(/^@/, "")}`
                                          : "—"}
                                      </dd>
                                    </div>
                                  ) : null}
                                  <div className="requests-review__fact requests-review__fact--wide">
                                    <dt>Message</dt>
                                    <dd className="requests-review__message">
                                      {shoutoutMessage.trim() || "—"}
                                    </dd>
                                  </div>
                                </dl>
                              </div>
                            </>
                          )}
                        </section>
                      </div>

                      <aside className="requests-choose-summary">
                        <section className="requests-summary" aria-labelledby="requests-review-summary-heading">
                          <header className="requests-summary__head">
                            <p className="requests-summary__eyebrow" id="requests-review-summary-heading">
                              Order summary
                            </p>
                            <h2 className="requests-summary__title">
                              {selected?.label ?? "Your request"}
                            </h2>
                            {activeCategory ? (
                              <p className="requests-summary__context">{activeCategory.title}</p>
                            ) : null}
                          </header>

                          <dl className="requests-summary__facts">
                            {!isAppearanceCategory ? (
                              <>
                                <div className="requests-summary__fact">
                                  <dt>Delivery</dt>
                                  <dd>
                                    {deliveryMethod === "feed"
                                      ? `Feed post (+$${FEED_SURCHARGE})`
                                      : "Direct message"}
                                  </dd>
                                </div>
                                <div className="requests-summary__fact">
                                  <dt>Content</dt>
                                  <dd>
                                    {contentKind.charAt(0).toUpperCase() + contentKind.slice(1)}
                                    {duration ? ` · ${duration}` : ""}
                                  </dd>
                                </div>
                                <div className="requests-summary__fact">
                                  <dt>Recipient</dt>
                                  <dd>
                                    {recipientTarget === "self"
                                      ? "For me"
                                      : recipientName.trim() || "Someone else"}
                                  </dd>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="requests-summary__fact">
                                  <dt>Occasion</dt>
                                  <dd>{appearanceOccasion.trim() || "—"}</dd>
                                </div>
                                <div className="requests-summary__fact">
                                  <dt>Location</dt>
                                  <dd>{appearanceLocation?.label.split(",")[0] || "—"}</dd>
                                </div>
                                <div className="requests-summary__fact">
                                  <dt>Duration</dt>
                                  <dd>{appearanceDurationLabel || "—"}</dd>
                                </div>
                              </>
                            )}
                            <div className="requests-summary__fact">
                              <dt>When</dt>
                              <dd>
                                {formatDisplayDate(deliveryDate)}
                                {deliveryTime ? ` · ${deliveryTime}` : ""}
                              </dd>
                            </div>
                          </dl>

                          <div className="requests-summary__total">
                            <dl className="requests-summary__breakdown">
                              <div>
                                <dt>Request fee</dt>
                                <dd>${dayRate}</dd>
                              </div>
                              {feedFee > 0 ? (
                                <div>
                                  <dt>Feed post</dt>
                                  <dd>+${feedFee}</dd>
                                </div>
                              ) : null}
                            </dl>
                            <div className="requests-summary__total-copy">
                              <span>Total due</span>
                              <strong>${totalFee}</strong>
                            </div>
                            <MoneyBackGuaranteeTag copy={content.guarantee} tipId="requests-guarantee-tip-step4" />
                          </div>

                          <div className="requests-review__pay">
                            <p className="requests-review__pay-label">Accepted payments</p>
                            <div className="requests-pay-logos" aria-label="Accepted payment methods">
                              <AmexMark />
                              <DinersMark />
                              <VisaMark />
                              <PaypalMark />
                              <MastercardMark />
                            </div>
                          </div>

                          <div className="requests-summary__cta-row">
                            <button
                              type="button"
                              className="btn btn--primary requests-summary__cta"
                              disabled={!personalizedReady}
                              onClick={() => {
                                // Payment integration comes next; keep the review flow complete for now.
                              }}
                            >
                              Pay ${totalFee}
                            </button>
                            <SummaryInfoTip
                              tipId="requests-pay-info-tip"
                              title="Before you pay"
                              copy={`You can still change any detail using Edit or the step tracker. Payment locks in your request with ${profile.name}.`}
                            />
                          </div>
                        </section>
                      </aside>
                    </div>
                  )}
                </section>
              )}
            </div>
          </div>
        </main>
        {isStart ? (
          <div
            className={`requests-sticky-cta${stickyCtaVisible ? " is-visible" : ""}`}
            aria-hidden={!stickyCtaVisible}
          >
            <div className="requests-sticky-cta__inner">
              <div className="requests-sticky-cta__copy">
                <strong>Book with {profile.name.split(" ")[0]}</strong>
                <span>
                  ★ {reviewAverageLabel} · from {content.startingRange}
                </span>
              </div>
              <Link
                href={chooseHref}
                className="btn requests-sticky-cta__btn"
                tabIndex={stickyCtaVisible ? 0 : -1}
              >
                Book now
              </Link>
            </div>
          </div>
        ) : null}
        <MobileNav />
      </div>
    </>
  );
}
