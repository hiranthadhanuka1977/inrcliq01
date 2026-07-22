"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import {
  cartDeliveryFee,
  cartSubtotal,
  formatCartMoney,
  normalizeCollectionPromo,
  readCollectionPromo,
  type CollectionCartItem,
  type CollectionPromoCode,
  updateCartQuantity,
  writeCollectionPromo,
} from "@/lib/feed/collection-cart";

function AmexMark() {
  return (
    <span className="collection-cart-drawer__pay-mark" aria-label="American Express">
      <svg viewBox="0 0 48 32" role="img" aria-hidden="true">
        <rect width="48" height="32" rx="4" fill="#016FD0" />
        <text
          x="24"
          y="19.5"
          textAnchor="middle"
          fill="#fff"
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="7.2"
          fontWeight="700"
          letterSpacing="0.4"
        >
          AMEX
        </text>
      </svg>
    </span>
  );
}

function MastercardMark() {
  return (
    <span className="collection-cart-drawer__pay-mark" aria-label="Mastercard">
      <svg viewBox="0 0 48 32" role="img" aria-hidden="true">
        <rect width="48" height="32" rx="4" fill="#fff" />
        <circle cx="19.5" cy="16" r="7.2" fill="#EB001B" />
        <circle cx="28.5" cy="16" r="7.2" fill="#F79E1B" />
        <path
          d="M24 10.55a7.2 7.2 0 0 1 0 10.9 7.2 7.2 0 0 1 0-10.9z"
          fill="#FF5F00"
        />
      </svg>
    </span>
  );
}

function VisaMark() {
  return (
    <span className="collection-cart-drawer__pay-mark" aria-label="Visa">
      <svg viewBox="0 0 48 32" role="img" aria-hidden="true">
        <rect width="48" height="32" rx="4" fill="#fff" />
        <text
          x="24"
          y="20.5"
          textAnchor="middle"
          fill="#1A1F71"
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="11"
          fontStyle="italic"
          fontWeight="800"
          letterSpacing="1.2"
        >
          VISA
        </text>
        <path d="M12.5 9.2h3.2l-.7 1.1h-3.2l.7-1.1z" fill="#F9A51A" />
      </svg>
    </span>
  );
}

export default function CollectionCartDrawer({
  open,
  items,
  profileSlug,
  checkoutHref,
  onClose,
  onChangeItems,
}: {
  open: boolean;
  items: CollectionCartItem[];
  profileSlug: string;
  checkoutHref: string;
  onClose: () => void;
  onChangeItems: (next: CollectionCartItem[]) => void;
}) {
  const router = useRouter();
  const titleId = useId();
  const couponFieldId = useId();
  const [mounted, setMounted] = useState(false);
  const [couponDraft, setCouponDraft] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<CollectionPromoCode | null>(null);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const subtotal = cartSubtotal(items);
  const deliveryFee = cartDeliveryFee(items);
  const couponDiscount = appliedCoupon ? Math.min(appliedCoupon.amount, subtotal) : 0;
  const total = Math.max(0, subtotal - couponDiscount + deliveryFee);
  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    setMounted(true);
    const saved = readCollectionPromo(profileSlug);
    if (saved) {
      setAppliedCoupon(saved);
      setCouponDraft(saved.label);
    }
  }, [profileSlug]);

  useEffect(() => {
    if (items.length === 0) {
      setAppliedCoupon(null);
      setCouponDraft("");
      setCouponMessage(null);
      writeCollectionPromo(profileSlug, null);
    }
  }, [items.length, profileSlug]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  function applyCoupon() {
    const match = normalizeCollectionPromo(couponDraft);
    if (!match) {
      setCouponMessage("Enter a promo code.");
      return;
    }

    setAppliedCoupon(match);
    setCouponDraft(match.label);
    writeCollectionPromo(profileSlug, match);
    setCouponMessage(
      match.amount > 0
        ? `${match.label} applied — ${formatCartMoney(match.amount)} off.`
        : `${match.label} applied.`,
    );
  }

  function clearCoupon() {
    setAppliedCoupon(null);
    setCouponDraft("");
    setCouponMessage(null);
    writeCollectionPromo(profileSlug, null);
  }

  if (!mounted) return null;

  return (
    <div className={`collection-cart-drawer${open ? " is-open" : ""}`} aria-hidden={!open}>
      <button
        type="button"
        className="collection-cart-drawer__backdrop"
        aria-label="Close shopping bag"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
      />
      <aside
        className="collection-cart-drawer__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        inert={!open ? true : undefined}
      >
        <header className="collection-cart-drawer__head">
          <div>
            <h2 id={titleId}>Shopping bag</h2>
            <p className="collection-cart-drawer__count">
              {count === 0 ? "No items yet" : `${count} ${count === 1 ? "item" : "items"}`}
            </p>
          </div>
          <button
            type="button"
            className="collection-cart-drawer__close"
            aria-label="Close shopping bag"
            onClick={onClose}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <div className="collection-cart-drawer__body">
          {items.length === 0 ? (
            <p className="collection-cart-drawer__empty">
              Your bag is empty. Add items from the collection to check out.
            </p>
          ) : (
            <ul className="collection-cart-drawer__list">
              {items.map((item) => (
                <li key={`${item.productId}:${item.variant ?? ""}`} className="collection-cart-drawer__item">
                  <div className="collection-cart-drawer__thumb">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.image} alt="" />
                  </div>
                  <div className="collection-cart-drawer__meta">
                    <p className="collection-cart-drawer__name">{item.name}</p>
                    {item.variant ? (
                      <p className="collection-cart-drawer__variant">{item.variant}</p>
                    ) : null}
                    <p className="collection-cart-drawer__price">{item.price}</p>
                    <div className="collection-cart-drawer__qty">
                      <button
                        type="button"
                        aria-label={`Decrease quantity of ${item.name}`}
                        onClick={() =>
                          onChangeItems(
                            updateCartQuantity(items, item.productId, item.quantity - 1, item.variant),
                          )
                        }
                      >
                        −
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        type="button"
                        aria-label={`Increase quantity of ${item.name}`}
                        onClick={() =>
                          onChangeItems(
                            updateCartQuantity(items, item.productId, item.quantity + 1, item.variant),
                          )
                        }
                      >
                        +
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="collection-cart-drawer__foot">
          <div className="collection-cart-drawer__coupon">
            <label className="collection-cart-drawer__coupon-label" htmlFor={couponFieldId}>
              Promo code
            </label>
            <div className="collection-cart-drawer__coupon-row">
              <input
                id={couponFieldId}
                type="text"
                className="collection-cart-drawer__coupon-input"
                value={couponDraft}
                placeholder="Enter code"
                disabled={items.length === 0}
                onChange={(event) => {
                  setCouponDraft(event.target.value);
                  setCouponMessage(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    applyCoupon();
                  }
                }}
              />
              {appliedCoupon ? (
                <button type="button" className="btn btn--secondary btn--sm" onClick={clearCoupon}>
                  Remove
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  disabled={items.length === 0}
                  onClick={applyCoupon}
                >
                  Apply
                </button>
              )}
            </div>
            {couponMessage ? (
              <p
                className={`collection-cart-drawer__coupon-message${appliedCoupon ? " is-success" : " is-error"}`}
              >
                {couponMessage}
              </p>
            ) : null}
          </div>

          <div className="collection-cart-drawer__totals" aria-label="Order summary">
            <div className="collection-cart-drawer__total-row">
              <span>Subtotal</span>
              <strong>{formatCartMoney(subtotal)}</strong>
            </div>
            {couponDiscount > 0 ? (
              <div className="collection-cart-drawer__total-row collection-cart-drawer__total-row--discount">
                <span>Promo ({appliedCoupon?.label})</span>
                <strong>−{formatCartMoney(couponDiscount)}</strong>
              </div>
            ) : null}
            <div className="collection-cart-drawer__total-row">
              <span>Delivery fee</span>
              <strong>{deliveryFee === 0 ? "Free" : formatCartMoney(deliveryFee)}</strong>
            </div>
            <div className="collection-cart-drawer__total-row collection-cart-drawer__total-row--grand">
              <span>Total</span>
              <strong>{formatCartMoney(total)}</strong>
            </div>
          </div>

          <button
            type="button"
            className="btn btn--primary collection-cart-drawer__checkout"
            disabled={items.length === 0}
            onClick={() => {
              onClose();
              router.push(checkoutHref);
            }}
          >
            Checkout
          </button>
          <div className="collection-cart-drawer__pay">
            <p className="collection-cart-drawer__pay-label">Pay With</p>
            <div className="collection-cart-drawer__pay-logos" aria-label="Accepted payment methods">
              <AmexMark />
              <MastercardMark />
              <VisaMark />
            </div>
          </div>
        </footer>
      </aside>
    </div>
  );
}
