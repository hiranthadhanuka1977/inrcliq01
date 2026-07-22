"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
import { resolveProductReviews } from "@/lib/feed/product-reviews";
import type { CollectionProduct } from "@/types/feed/collection";
import type { ProfileData } from "@/types/feed/profile";

const REVIEW_INITIAL_COUNT = 6;
const REVIEW_PAGE_SIZE = 18;

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

export default function CollectionProductDetailView({
  profile,
  product,
}: {
  profile: ProfileData;
  product: CollectionProduct;
}) {
  const detail = product.detail;
  const [cartItems, setCartItems] = useState<CollectionCartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [activeImage, setActiveImage] = useState(
    detail?.gallery[0]?.src ?? product.image,
  );
  const [colorId, setColorId] = useState(detail?.defaultColorId ?? "");
  const [sizeId, setSizeId] = useState(detail?.defaultSizeId ?? "");
  const [liked, setLiked] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [visibleReviewCount, setVisibleReviewCount] = useState(REVIEW_INITIAL_COUNT);
  const cartCount = cartItemCount(cartItems);

  const selectedColor = useMemo(
    () => detail?.colors.find((color) => color.id === colorId),
    [colorId, detail?.colors],
  );
  const selectedSize = useMemo(
    () => detail?.sizes.find((size) => size.id === sizeId),
    [detail?.sizes, sizeId],
  );
  const isPreorder = (product.ctaLabel ?? "").toLowerCase() === "pre-order";
  const bagLabel = product.ctaLabel ?? "Add to bag";

  const gallery = detail?.gallery?.length
    ? detail.gallery
    : [{ src: product.image, alt: product.image_alt || product.name }];

  const activeGalleryImage = useMemo(
    () => gallery.find((image) => image.src === activeImage) ?? gallery[0],
    [activeImage, gallery],
  );

  const descriptionParagraphs = (detail?.longDescription ?? product.description)
    .split(/\n\n+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const reviewsBlock = useMemo(() => resolveProductReviews(product), [product]);
  const availableReviews = reviewsBlock.reviews;
  const visibleReviews = availableReviews.slice(0, visibleReviewCount);
  const remainingReviews = Math.max(0, availableReviews.length - visibleReviewCount);

  useEffect(() => {
    setCartItems(readCollectionCart(profile.slug));
  }, [profile.slug]);

  useEffect(() => {
    setVisibleReviewCount(REVIEW_INITIAL_COUNT);
  }, [product.id]);

  useEffect(() => {
    if (!galleryOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setGalleryOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [galleryOpen]);

  function updateCart(next: CollectionCartItem[]) {
    setCartItems(next);
    writeCollectionCart(profile.slug, next);
  }

  function addToCart() {
    const colorLabel = selectedColor?.label;
    const sizeLabel = selectedSize?.label;
    const variantParts = [
      colorLabel ? `Color: ${colorLabel}` : null,
      sizeLabel ? `Size: ${sizeLabel}` : null,
    ].filter(Boolean);
    const variant = variantParts.length > 0 ? variantParts.join(" · ") : undefined;
    updateCart(addProductToCart(cartItems, product, variant));
    setCartOpen(true);
  }

  function selectColor(nextId: string, image: string) {
    setColorId(nextId);
    setActiveImage(image);
  }

  function openGallery() {
    setGalleryOpen(true);
  }

  function closeGallery() {
    setGalleryOpen(false);
  }

  return (
    <>
      <PageBodyClass pageClass="page-profile" />
      <div className="app-shell page-profile page-collection page-product-detail">
        <LeftNav />
        <main className="main-content profile-page collection-page product-detail-page">
          <header className="product-detail-topbar">
            <div className="product-detail-topbar__inner">
              <Link
                href={`/feed/profile/${profile.slug}/collection`}
                className="product-detail-back btn btn--sm btn--icon btn--secondary"
                aria-label="Back to collection"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                </svg>
              </Link>

              <div className="product-detail-topbar__seller">
                <div
                  className="story-avatar product-detail-topbar__avatar"
                  style={{ "--story-color": profile.avatar_color } as React.CSSProperties}
                  aria-hidden="true"
                >
                  {profile.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.avatar_url} alt="" width={36} height={36} />
                  ) : (
                    profile.avatar_initials
                  )}
                </div>
                <p className="product-detail-topbar__name">{profile.name}</p>
              </div>

              <CartButton count={cartCount} onClick={() => setCartOpen(true)} />
            </div>
          </header>

          <div className="profile-page__inner">
            <div className="product-detail">
              <div className="product-detail__main">
                <section className="product-detail__gallery" aria-label="Product images">
                  <div className="product-detail__stage-wrap">
                    <button
                      type="button"
                      className="product-detail__stage"
                      aria-label="Expand image view"
                      onClick={openGallery}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={activeImage} alt="" width={800} height={800} />
                      {product.offer ? (
                        <span className="collection-product__media-badge product-detail__badge">
                          {product.offer.badge}
                        </span>
                      ) : null}
                      <span className="product-detail__expand" aria-hidden="true">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="15 3 21 3 21 9" />
                          <polyline points="9 21 3 21 3 15" />
                          <line x1="21" y1="3" x2="14" y2="10" />
                          <line x1="3" y1="21" x2="10" y2="14" />
                        </svg>
                        <span>Expand view</span>
                      </span>
                    </button>
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
                  </div>
                  {gallery.length > 1 ? (
                    <div className="product-detail__thumbs" role="list">
                      {gallery.map((image) => {
                        const selected = activeImage === image.src;
                        return (
                          <button
                            key={image.src}
                            type="button"
                            role="listitem"
                            className={`product-detail__thumb${selected ? " is-active" : ""}`}
                            aria-label={image.alt}
                            aria-pressed={selected}
                            onClick={() => setActiveImage(image.src)}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={image.src} alt="" width={120} height={120} />
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </section>

                <section className="product-detail__info" aria-labelledby="product-detail-heading">
                  <div className="product-detail__price-row">
                    <div className="product-detail__prices">
                      <span className="product-detail__price">{product.price}</span>
                      {product.compareAtPrice ? (
                        <span className="product-detail__compare">{product.compareAtPrice}</span>
                      ) : null}
                      {product.offer?.discountLabel ? (
                        <span className="product-detail__discount">{product.offer.discountLabel}</span>
                      ) : null}
                    </div>
                    <div className="product-detail__actions">
                      <button type="button" className="product-detail__icon-btn" aria-label="Share product">
                        <ShareIcon size={18} />
                      </button>
                    </div>
                  </div>

                  <h1 id="product-detail-heading" className="product-detail__title">
                    {product.name}
                  </h1>
                  <p className="product-detail__headline">{detail?.headline ?? product.description}</p>

                  <div className="product-detail__rating-row">
                    <StarRating rating={detail?.reviewAverage ?? product.rating} size={14} />
                    <span>
                      {(detail?.reviewAverage ?? product.rating).toFixed(1)} · {product.soldLabel}
                    </span>
                  </div>

                  <div className="product-detail__purchase">
                    {detail?.colors?.length ? (
                      <div className="product-detail__option">
                        <p className="product-detail__option-label">
                          Color: <strong>{selectedColor?.label ?? "—"}</strong>
                        </p>
                        <div className="product-detail__colors" role="list">
                          {detail.colors.map((color) => {
                            const selected = color.id === colorId;
                            return (
                              <button
                                key={color.id}
                                type="button"
                                role="listitem"
                                className={`product-detail__color${selected ? " is-active" : ""}`}
                                aria-label={color.label}
                                aria-pressed={selected}
                                onClick={() => selectColor(color.id, color.image)}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={color.image} alt="" width={56} height={56} />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    {detail?.sizes?.length ? (
                      <div className="product-detail__option">
                        <p className="product-detail__option-label">
                          Size:{" "}
                          <strong>
                            {selectedSize
                              ? `${selectedSize.label} (${selectedSize.hint})`
                              : "—"}
                          </strong>
                        </p>
                        <div className="product-detail__sizes" role="list">
                          {detail.sizes.map((size) => {
                            const selected = size.id === sizeId;
                            return (
                              <button
                                key={size.id}
                                type="button"
                                role="listitem"
                                className={`product-detail__size${selected ? " is-active" : ""}`}
                                aria-pressed={selected}
                                onClick={() => setSizeId(size.id)}
                              >
                                <span>{size.label}</span>
                                <span className="product-detail__size-hint">{size.hint}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    <div
                      className={`product-detail__cta-row${isPreorder ? " product-detail__cta-row--single" : ""}`}
                    >
                      {!isPreorder ? (
                        <button type="button" className="btn btn--primary product-detail__cta" onClick={addToCart}>
                          Buy now
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className={`btn product-detail__cta${isPreorder ? " btn--primary" : " btn--secondary"}`}
                        onClick={addToCart}
                      >
                        <BagCtaContent label={bagLabel} />
                      </button>
                    </div>
                  </div>
                </section>
              </div>

              <aside className="product-detail__aside" aria-label="Delivery and returns">
                <div className="product-detail__panel">
                  <h2>Delivery options</h2>
                  {product.kind === "digital" ? (
                    <div className="product-detail__digital-note">
                      <span className="product-detail__digital-note-icon" aria-hidden="true">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                      </span>
                      <p>
                        This is a digitally delivered product. After checkout, we&apos;ll email you with
                        instructions on how to download and access it.
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="product-detail__panel-row">
                        <span>{detail?.delivery.location ?? "Western, Colombo 1-15"}</span>
                        <button type="button" className="product-detail__edit" aria-label="Edit delivery location">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                          </svg>
                        </button>
                      </p>
                      <p className="product-detail__panel-meta">
                        Standard delivery · {detail?.delivery.standardFee ?? "$7"}
                      </p>
                      {(detail?.delivery.cod ?? true) ? (
                        <p className="product-detail__cod">Cash on Delivery available</p>
                      ) : null}
                    </>
                  )}
                </div>

                <div className="product-detail__panel">
                  <h2>Return &amp; warranty</h2>
                  <p className="product-detail__panel-meta">{detail?.delivery.returns ?? "14 days easy return"}</p>
                  <p className="product-detail__panel-meta">{detail?.delivery.warranty ?? "Warranty not available"}</p>
                  <div className="product-detail__buyer-protection">
                    <span className="product-detail__buyer-protection-icon" aria-hidden="true">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        <polyline points="9 12 11 14 15 10" />
                      </svg>
                    </span>
                    <div>
                      <p className="product-detail__buyer-protection-title">Buyer Protection</p>
                      <p className="product-detail__buyer-protection-copy">
                        Get a full refund if the item is not as described or if it is not delivered.
                      </p>
                    </div>
                  </div>
                </div>
              </aside>

              <section className="product-detail__section" aria-labelledby="product-description-heading">
                <h2 id="product-description-heading">Description</h2>
                {descriptionParagraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </section>

              <section
                className="product-detail__section product-detail__section--reviews"
                aria-labelledby="product-reviews-heading"
              >
                <h2 id="product-reviews-heading">Ratings &amp; reviews</h2>

                {reviewsBlock.empty ? (
                  <div className="product-detail__reviews-empty">
                    <p className="product-detail__reviews-empty-title">No reviews yet</p>
                    <p className="product-detail__reviews-empty-copy">
                      Be the first to share your thoughts. Only verified buyers of this product can leave a
                      review.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="product-detail__rating-board">
                      <div className="product-detail__rating-summary">
                        <p className="product-detail__rating-average">
                          <strong>{reviewsBlock.average.toFixed(1)}</strong>
                          <span>/5</span>
                        </p>
                        <StarRating rating={reviewsBlock.average} size={16} />
                        <p className="product-detail__rating-count">
                          Based on {reviewsBlock.count} reviews
                        </p>
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
                                <span
                                  className="product-detail__rate-bar-fill"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="product-detail__reviews">
                      {visibleReviews.map((review) => (
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
                      ))}
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
                  </>
                )}
              </section>
            </div>
          </div>
        </main>
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

      {galleryOpen ? (
        <div
          className="product-gallery-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`${product.name} image gallery`}
        >
          <button
            type="button"
            className="product-gallery-lightbox__backdrop"
            aria-label="Close image gallery"
            onClick={closeGallery}
          />
          <div className="product-gallery-lightbox__panel">
            <header className="product-gallery-lightbox__header">
              <p className="product-gallery-lightbox__title">{product.name}</p>
              <button
                type="button"
                className="product-gallery-lightbox__close"
                aria-label="Close image gallery"
                onClick={closeGallery}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </header>

            <div className="product-gallery-lightbox__body">
              <div className="product-gallery-lightbox__stage">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activeGalleryImage.src}
                  alt={activeGalleryImage.alt || product.name}
                  width={1200}
                  height={1200}
                />
              </div>

              {gallery.length > 1 ? (
                <div className="product-gallery-lightbox__thumbs" role="list" aria-label="Select image">
                  {gallery.map((image) => {
                    const selected = activeImage === image.src;
                    return (
                      <button
                        key={image.src}
                        type="button"
                        role="listitem"
                        className={`product-gallery-lightbox__thumb${selected ? " is-active" : ""}`}
                        aria-label={image.alt}
                        aria-pressed={selected}
                        onClick={() => setActiveImage(image.src)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={image.src} alt="" width={120} height={120} />
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
