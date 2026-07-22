"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import FeedScrollButton from "@/components/feed/FeedScrollButton";
import LeftNav from "@/components/feed/LeftNav";
import MobileNav from "@/components/feed/MobileNav";
import PageBodyClass from "@/components/feed/PageBodyClass";
import ShareIcon from "@/components/feed/ShareIcon";
import CollectionCartDrawer from "@/components/feed/profile/CollectionCartDrawer";
import {
  addProductToCart,
  cartItemCount,
  readCollectionCart,
  writeCollectionCart,
  type CollectionCartItem,
} from "@/lib/feed/collection-cart";
import type { CollectionProduct, CollectionProductKind, CreatorCollection } from "@/types/feed/collection";
import type { ProfileData } from "@/types/feed/profile";

type FilterId = "all" | CollectionProductKind;

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "physical", label: "Physical" },
  { id: "digital", label: "Digital" },
];

const COLLECTION_PAGE_SIZE = 8;
const COLLECTION_LOAD_DELAY_MS = 420;

function BagCtaContent({ label }: { label: string }) {
  const showPlus = label.trim().toLowerCase() === "add to bag";

  return (
    <>
      {showPlus ? (
        <svg
          className="collection-bag-cta__plus"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      ) : null}
      <span>{label}</span>
    </>
  );
}

function CollectionProductSkeleton() {
  return (
    <article className="collection-product collection-product--skeleton" aria-hidden="true">
      <div className="collection-product__media">
        <div className="collection-skeleton collection-skeleton--media" />
      </div>
      <div className="collection-product__body">
        <div className="collection-skeleton collection-skeleton--title" />
        <div className="collection-skeleton collection-skeleton--line" />
        <div className="collection-skeleton collection-skeleton--line collection-skeleton--short" />
        <div className="collection-skeleton collection-skeleton--price" />
      </div>
    </article>
  );
}

function kindLabel(kind: CollectionProductKind): string {
  return kind === "digital" ? "Digital" : "Physical";
}

const OFFER_BADGE_HELP: Record<string, string> = {
  Sale: "This item is temporarily discounted from its usual price.",
  "Best Seller": "One of the most purchased items in this collection.",
  "Limited Edition": "Limited quantity available — once it’s gone, it may not return.",
  "Affiliate Link": "Buying this may take you to a partner site. Mia may earn a commission.",
};

function offerBadgeHelp(badge: string): string {
  return OFFER_BADGE_HELP[badge] ?? `${badge} offer on this item.`;
}

function CartButton({ count, onClick }: { count: number; onClick: () => void }) {
  const itemLabel = count === 1 ? "1 item" : `${count} items`;

  return (
    <button
      type="button"
      className="btn btn--warning btn--sm collection-cart"
      aria-label={`Shopping bag, ${itemLabel}`}
      aria-haspopup="dialog"
      onClick={onClick}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
      <span className="collection-cart__label">{itemLabel}</span>
    </button>
  );
}

function StarRating({ rating }: { rating: number }) {
  const clamped = Math.max(0, Math.min(5, Math.round(rating)));

  return (
    <span className="collection-product__stars" aria-label={`${clamped} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => (
        <svg
          key={index}
          className={index < clamped ? "is-filled" : undefined}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </span>
  );
}

function CollectionProductCard({
  product,
  profileSlug,
  onAdd,
}: {
  product: CollectionProduct;
  profileSlug: string;
  onAdd: (productId: string) => void;
}) {
  const isSale = Boolean(product.offer?.discountLabel);
  const [imageSrc, setImageSrc] = useState(product.image);
  const [liked, setLiked] = useState(false);
  const detailHref = `/feed/profile/${profileSlug}/collection/${product.id}`;

  useEffect(() => {
    setImageSrc(product.image);
  }, [product.image]);

  return (
    <article className="collection-product">
      <div className="collection-product__media">
        <Link
          href={detailHref}
          className="collection-product__media-hit"
          aria-label={`View details for ${product.name}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt={product.image_alt || product.name}
            width={640}
            height={640}
            onError={() => {
              setImageSrc(
                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='640' viewBox='0 0 640 640'%3E%3Crect fill='%23e8e8e8' width='640' height='640'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23999999' font-family='system-ui,sans-serif' font-size='28'%3ENo image%3C/text%3E%3C/svg%3E",
              );
            }}
          />
          <span className="collection-product__view" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </span>
        </Link>
        <button
          type="button"
          className={`collection-product__like${liked ? " is-active" : ""}`}
          aria-label={liked ? `Unlike ${product.name}` : `Like ${product.name}`}
          aria-pressed={liked}
          onClick={() => setLiked((value) => !value)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
        <span className={`collection-product__kind collection-product__kind--${product.kind}`}>
          {kindLabel(product.kind)}
        </span>
        {product.offer ? (
          <span className="collection-product__media-badge" tabIndex={0}>
            {product.offer.badge}
            <span className="collection-product__media-badge-tip" role="tooltip">
              {offerBadgeHelp(product.offer.badge)}
            </span>
          </span>
        ) : null}
      </div>
      <div className="collection-product__body">
        <h3 className="collection-product__name">{product.name}</h3>
        <p className="collection-product__desc">{product.description}</p>

        <div className="collection-product__commerce">
          <div className="collection-product__rating-row">
            <StarRating rating={product.rating} />
            <span className="collection-product__sold">{product.soldLabel}</span>
          </div>

          <div className="collection-product__price-row">
            <span className="collection-product__price">{product.price}</span>
            {product.compareAtPrice ? (
              <span className="collection-product__compare">{product.compareAtPrice}</span>
            ) : null}
          </div>

          {product.offer ? (
            <div className="collection-product__offer-row">
              <span className="collection-product__offer-detail">
                {isSale ? <span className="collection-product__offer-arrow" aria-hidden="true">↓</span> : null}
                {product.offer.detail}
              </span>
              {product.offer.discountLabel ? (
                <span className="collection-product__offer-discount">{product.offer.discountLabel}</span>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="collection-product__footer">
          <button
            type="button"
            className="btn btn--secondary btn--sm collection-product__cta"
            onClick={() => onAdd(product.id)}
          >
            <BagCtaContent label={product.ctaLabel ?? "Add to bag"} />
          </button>
        </div>
      </div>
    </article>
  );
}

export default function CollectionListingView({
  profile,
  collection,
}: {
  profile: ProfileData;
  collection: CreatorCollection;
}) {
  const [filter, setFilter] = useState<FilterId>("all");
  const [cartItems, setCartItems] = useState<CollectionCartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(COLLECTION_PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const loadingLockRef = useRef(false);
  const loadTimeoutRef = useRef(0);
  const handle = profile.handle.startsWith("@") ? profile.handle : `@${profile.handle}`;
  const cartCount = cartItemCount(cartItems);

  const filtered = useMemo(() => {
    if (filter === "all") return collection.products;
    return collection.products.filter((product) => product.kind === filter);
  }, [collection.products, filter]);

  const visibleProducts = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;
  const skeletonCount = Math.min(COLLECTION_PAGE_SIZE, filtered.length - visibleCount);

  useEffect(() => {
    setCartItems(readCollectionCart(profile.slug));
  }, [profile.slug]);

  useEffect(() => {
    setVisibleCount(COLLECTION_PAGE_SIZE);
    setIsLoadingMore(false);
    loadingLockRef.current = false;
    if (loadTimeoutRef.current) {
      window.clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = 0;
    }
  }, [filter]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        if (loadingLockRef.current) return;

        loadingLockRef.current = true;
        setIsLoadingMore(true);

        loadTimeoutRef.current = window.setTimeout(() => {
          setVisibleCount((count) => Math.min(count + COLLECTION_PAGE_SIZE, filtered.length));
          setIsLoadingMore(false);
          loadingLockRef.current = false;
          loadTimeoutRef.current = 0;
        }, COLLECTION_LOAD_DELAY_MS);
      },
      { rootMargin: "160px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [filtered.length, hasMore, visibleCount]);

  useEffect(() => {
    return () => {
      if (loadTimeoutRef.current) window.clearTimeout(loadTimeoutRef.current);
    };
  }, []);

  const physicalCount = collection.products.filter((p) => p.kind === "physical").length;
  const digitalCount = collection.products.filter((p) => p.kind === "digital").length;
  const hasCover = Boolean(profile.cover_url);

  function updateCart(next: CollectionCartItem[]) {
    setCartItems(next);
    writeCollectionCart(profile.slug, next);
  }

  function addToCart(productId: string) {
    const product = collection.products.find((item) => item.id === productId);
    if (!product) return;
    updateCart(addProductToCart(cartItems, product));
    setCartOpen(true);
  }

  return (
    <>
      <PageBodyClass pageClass="page-profile" />
      <div className="app-shell page-profile page-collection">
        <LeftNav />
        <main className="main-content profile-page collection-page">
          <header
            className={`profile-header collection-header${hasCover ? "" : " profile-header--no-cover"}`}
            id="collection-top"
          >
            {hasCover ? (
              <div className="profile-header__cover">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={profile.cover_url!} alt="" width={1400} height={320} />
                <div className="profile-header__cover-fade" aria-hidden="true" />
                <div className="profile-header__cover-nav">
                  <Link
                    href={`/feed/profile/${profile.slug}`}
                    className="profile-back btn btn--sm btn--icon btn--ghost-cover"
                    aria-label={`Back to ${profile.name}'s profile`}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                    </svg>
                  </Link>
                  <div className="profile-utility-actions" aria-label="Collection utilities">
                    <CartButton count={cartCount} onClick={() => setCartOpen(true)} />
                    <button
                      type="button"
                      className="btn btn--sm btn--icon btn--ghost-cover"
                      aria-label="Share collection"
                    >
                      <ShareIcon size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="profile-header__toolbar">
                <Link
                  href={`/feed/profile/${profile.slug}`}
                  className="profile-back btn btn--sm btn--icon btn--secondary"
                  aria-label={`Back to ${profile.name}'s profile`}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                  </svg>
                </Link>
                <div className="profile-utility-actions" aria-label="Collection utilities">
                  <CartButton count={cartCount} onClick={() => setCartOpen(true)} />
                  <button
                    type="button"
                    className="btn btn--sm btn--icon btn--secondary"
                    aria-label="Share collection"
                  >
                    <ShareIcon size={16} />
                  </button>
                </div>
              </div>
            )}

            <div className="profile-header__panel">
              <div className="profile-header__identity" aria-labelledby="collection-heading">
                <div
                  className="story-avatar profile-header__avatar"
                  style={{ "--story-color": profile.avatar_color } as React.CSSProperties}
                >
                  {profile.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.avatar_url} alt={profile.name} width={88} height={88} />
                  ) : (
                    profile.avatar_initials
                  )}
                </div>
                <div className="profile-header__info">
                  <h1 id="collection-heading">{collection.title}</h1>
                  <p className="profile-header__meta">
                    <span>{handle}</span>
                    {profile.verified ? (
                      <>
                        <span className="profile-header__dot" aria-hidden="true">
                          ·
                        </span>
                        <span className="profile-header__verified">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                          Verified
                        </span>
                      </>
                    ) : null}
                  </p>
                  <p className="profile-header__stats">
                    <span>
                      <strong>{collection.products.length}</strong> items
                    </span>
                    <span className="profile-header__dot" aria-hidden="true">
                      ·
                    </span>
                    <span>
                      <strong>{physicalCount}</strong> physical
                    </span>
                    <span className="profile-header__dot" aria-hidden="true">
                      ·
                    </span>
                    <span>
                      <strong>{digitalCount}</strong> digital
                    </span>
                  </p>
                </div>
              </div>

              <p className="profile-header__bio">{collection.subtitle}</p>
            </div>
          </header>

          <div className="profile-page__inner">
            <div className="collection-page__body">
              <div className="collection-page__toolbar">
                <div className="collection-filters" role="tablist" aria-label="Filter collection">
                  {FILTERS.map((item) => {
                    const selected = filter === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        className={`collection-filters__chip${selected ? " is-active" : ""}`}
                        onClick={() => setFilter(item.id)}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
                <p className="collection-page__count">
                  Showing {visibleProducts.length} of {filtered.length}{" "}
                  {filtered.length === 1 ? "item" : "items"}
                </p>
              </div>

              <div className="collection-grid">
                {visibleProducts.map((product) => (
                  <CollectionProductCard
                    key={product.id}
                    product={product}
                    profileSlug={profile.slug}
                    onAdd={addToCart}
                  />
                ))}
                {isLoadingMore
                  ? Array.from({ length: skeletonCount }, (_, index) => (
                      <CollectionProductSkeleton key={`skeleton-${index}`} />
                    ))
                  : null}
              </div>

              {isLoadingMore ? (
                <div className="collection-page__loader" role="status" aria-live="polite">
                  <span className="collection-page__loader-spinner" aria-hidden="true" />
                  <span>Loading more products…</span>
                </div>
              ) : null}

              {hasMore ? (
                <div ref={loadMoreRef} className="collection-page__sentinel" aria-hidden="true" />
              ) : null}

              {!hasMore && !isLoadingMore ? (
                <p className="collection-page__end">You’ve reached the end of the collection</p>
              ) : null}
            </div>
          </div>
        </main>
        <FeedScrollButton variant="home" topTargetId="collection-top" />
      </div>
      <MobileNav />
      <CollectionCartDrawer
        open={cartOpen}
        items={cartItems}
        profileSlug={profile.slug}
        checkoutHref={`/feed/profile/${profile.slug}/collection/checkout`}
        onClose={() => setCartOpen(false)}
        onChangeItems={updateCart}
      />
    </>
  );
}
