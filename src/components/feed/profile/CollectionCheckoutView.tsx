"use client";

import Link from "next/link";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import LeftNav from "@/components/feed/LeftNav";
import MobileNav from "@/components/feed/MobileNav";
import PageBodyClass from "@/components/feed/PageBodyClass";
import {
  cartDeliveryFee,
  cartItemCount,
  cartNeedsDelivery,
  cartSubtotal,
  formatCartMoney,
  normalizeCollectionPromo,
  parsePriceAmount,
  readCollectionCart,
  readCollectionPromo,
  type CollectionCartItem,
  type CollectionPromoCode,
  writeCollectionPromo,
} from "@/lib/feed/collection-cart";
import type { ProfileData } from "@/types/feed/profile";

type PaymentMethod = "card" | "cod";

type ShippingAddress = {
  name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
};

const DEFAULT_ADDRESS: ShippingAddress = {
  name: "Hiran Karunananda",
  phone: "+94 0773725702",
  line1: "No. 124, Baseline Road",
  line2: "Dematagoda",
  city: "Colombo 09",
  region: "Western Province",
  postalCode: "00900",
  country: "Sri Lanka",
};

const CVV_POPOVER_GAP = 10;
const CVV_POPOVER_WIDTH = 204;
const VIEWPORT_PAD = 12;

type PopoverCoords = {
  top: number;
  left: number;
  width: number;
  placement: "above" | "below";
};

function placeCvvPopover(anchor: DOMRect, popover: DOMRect | null): PopoverCoords {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(popover?.width || CVV_POPOVER_WIDTH, vw - VIEWPORT_PAD * 2);
  const height = popover?.height || 180;

  const spaceAbove = anchor.top - VIEWPORT_PAD;
  const spaceBelow = vh - anchor.bottom - VIEWPORT_PAD;
  const placement: "above" | "below" =
    spaceAbove >= height + CVV_POPOVER_GAP || spaceAbove > spaceBelow ? "above" : "below";

  let top =
    placement === "above" ? anchor.top - CVV_POPOVER_GAP - height : anchor.bottom + CVV_POPOVER_GAP;
  top = Math.min(Math.max(top, VIEWPORT_PAD), Math.max(VIEWPORT_PAD, vh - height - VIEWPORT_PAD));

  let left = anchor.right - width;
  left = Math.min(Math.max(left, VIEWPORT_PAD), Math.max(VIEWPORT_PAD, vw - width - VIEWPORT_PAD));

  return { top, left, width, placement };
}

function CvvHelpTip({ tipId }: { tipId: string }) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<PopoverCoords | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  function cancelClose() {
    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function scheduleClose() {
    cancelClose();
    closeTimerRef.current = window.setTimeout(() => setOpen(false), 120);
  }

  function show() {
    cancelClose();
    const anchor = triggerRef.current?.getBoundingClientRect();
    if (anchor) setCoords(placeCvvPopover(anchor, null));
    setOpen(true);
  }

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }

    function updatePosition() {
      const anchor = triggerRef.current?.getBoundingClientRect();
      if (!anchor) return;
      const popover = popoverRef.current?.getBoundingClientRect() ?? null;
      setCoords(placeCvvPopover(anchor, popover));
    }

    updatePosition();
    const frame = window.requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => () => cancelClose(), []);

  const popoverStyle: CSSProperties = {
    top: coords?.top ?? 0,
    left: coords?.left ?? 0,
    width: coords?.width ?? CVV_POPOVER_WIDTH,
    visibility: coords ? "visible" : "hidden",
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`checkout-cvv-info${open ? " is-open" : ""}`}
        aria-label="What is CVV?"
        aria-describedby={open ? tipId : undefined}
        aria-expanded={open}
        onMouseEnter={show}
        onMouseLeave={scheduleClose}
        onFocus={show}
        onBlur={(event) => {
          const next = event.relatedTarget as Node | null;
          if (popoverRef.current?.contains(next)) return;
          scheduleClose();
        }}
        onClick={(event) => {
          event.preventDefault();
          if (open) setOpen(false);
          else show();
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
          <path
            d="M12 10.5v5.25M12 8.25h.01"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
      {mounted && open
        ? createPortal(
            <div
              ref={popoverRef}
              id={tipId}
              className={`checkout-cvv-popover checkout-cvv-popover--${coords?.placement ?? "above"}`}
              role="tooltip"
              style={popoverStyle}
              onMouseEnter={show}
              onMouseLeave={scheduleClose}
            >
              <span className="checkout-cvv-popover__card" aria-hidden="true">
                <span className="checkout-cvv-popover__strip" />
                <span className="checkout-cvv-popover__signature">
                  <span className="checkout-cvv-popover__code">123</span>
                </span>
              </span>
              <span className="checkout-cvv-popover__copy">
                The 3 or 4-digit security code on the back of your card. On American Express, it is on the front.
              </span>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function AmexMark() {
  return (
    <span className="collection-checkout__pay-mark" aria-label="American Express">
      <svg viewBox="0 0 48 32" role="img" aria-hidden="true">
        <rect width="48" height="32" rx="4" fill="#016FD0" />
        <text x="24" y="19.5" textAnchor="middle" fill="#fff" fontFamily="Arial, Helvetica, sans-serif" fontSize="7.2" fontWeight="700" letterSpacing="0.4">
          AMEX
        </text>
      </svg>
    </span>
  );
}

function MastercardMark() {
  return (
    <span className="collection-checkout__pay-mark" aria-label="Mastercard">
      <svg viewBox="0 0 48 32" role="img" aria-hidden="true">
        <rect width="48" height="32" rx="4" fill="#fff" />
        <circle cx="19.5" cy="16" r="7.2" fill="#EB001B" />
        <circle cx="28.5" cy="16" r="7.2" fill="#F79E1B" />
        <path d="M24 10.55a7.2 7.2 0 0 1 0 10.9 7.2 7.2 0 0 1 0-10.9z" fill="#FF5F00" />
      </svg>
    </span>
  );
}

function VisaMark() {
  return (
    <span className="collection-checkout__pay-mark" aria-label="Visa">
      <svg viewBox="0 0 48 32" role="img" aria-hidden="true">
        <rect width="48" height="32" rx="4" fill="#fff" />
        <text x="24" y="20.5" textAnchor="middle" fill="#1A1F71" fontFamily="Arial, Helvetica, sans-serif" fontSize="11" fontStyle="italic" fontWeight="800" letterSpacing="1.2">
          VISA
        </text>
        <path d="M12.5 9.2h3.2l-.7 1.1h-3.2l.7-1.1z" fill="#F9A51A" />
      </svg>
    </span>
  );
}

function formatCardNumber(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, "$1 ")
    .trim();
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function formatArrivalEstimate(daysAhead: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function CheckoutLineItem({ item }: { item: CollectionCartItem }) {
  const lineTotal = parsePriceAmount(item.price) * item.quantity;

  return (
    <li className="checkout-line-item">
      <div className="checkout-line-item__thumb">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.image} alt="" />
      </div>
      <div className="checkout-line-item__meta">
        <p className="checkout-line-item__name">{item.name}</p>
        {item.variant ? <p className="checkout-line-item__variant">{item.variant}</p> : null}
        <p className="checkout-line-item__qty">Qty {item.quantity}</p>
      </div>
      <p className="checkout-line-item__price">{formatCartMoney(lineTotal)}</p>
    </li>
  );
}

export default function CollectionCheckoutView({ profile }: { profile: ProfileData }) {
  const promoId = useId();
  const cvvHelpId = useId();
  const [items, setItems] = useState<CollectionCartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [address, setAddress] = useState<ShippingAddress>(DEFAULT_ADDRESS);
  const [editingAddress, setEditingAddress] = useState(false);
  const [couponDraft, setCouponDraft] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<CollectionPromoCode | null>(null);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [placed, setPlaced] = useState(false);

  useEffect(() => {
    setItems(readCollectionCart(profile.slug));
    const saved = readCollectionPromo(profile.slug);
    if (saved) {
      setAppliedCoupon(saved);
      setCouponDraft(saved.label);
    } else {
      setAppliedCoupon(null);
      setCouponDraft("");
    }
  }, [profile.slug]);

  const needsDelivery = cartNeedsDelivery(items);
  const count = cartItemCount(items);
  const subtotal = cartSubtotal(items);
  const deliveryFee = cartDeliveryFee(items);
  const couponDiscount = appliedCoupon ? Math.min(appliedCoupon.amount, subtotal) : 0;
  const total = Math.max(0, subtotal - couponDiscount + deliveryFee);

  const addressLines = useMemo(
    () => [address.line1, address.line2, `${address.city}, ${address.region} ${address.postalCode}`, address.country].filter(Boolean),
    [address],
  );

  const physicalItems = useMemo(
    () => items.filter((item) => (item.kind ?? "physical") === "physical"),
    [items],
  );
  const digitalItems = useMemo(() => items.filter((item) => item.kind === "digital"), [items]);
  const deliveryEstimate = useMemo(() => formatArrivalEstimate(3), []);

  function applyCoupon() {
    const match = normalizeCollectionPromo(couponDraft);
    if (!match) {
      setCouponMessage("Enter a promo code.");
      return;
    }
    setAppliedCoupon(match);
    setCouponDraft(match.label);
    writeCollectionPromo(profile.slug, match);
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
    writeCollectionPromo(profile.slug, null);
  }

  function placeOrder() {
    if (items.length === 0) return;
    if (paymentMethod === "card") {
      const digits = cardNumber.replace(/\s/g, "");
      if (!cardName.trim() || digits.length < 12 || cardExpiry.length < 4 || cardCvv.length < 3) {
        return;
      }
    }
    setPlaced(true);
  }

  return (
    <>
      <PageBodyClass pageClass="page-profile" />
      <div className="app-shell page-profile page-collection page-checkout">
        <LeftNav />
        <main className="main-content profile-page collection-page checkout-page">
          <header className="product-detail-topbar checkout-topbar">
            <div className="product-detail-topbar__inner checkout-topbar__inner">
              <Link
                href={`/feed/profile/${profile.slug}/collection`}
                className="product-detail-back checkout-back btn btn--sm btn--icon btn--secondary"
                aria-label="Back to collection"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                </svg>
              </Link>
              <div className="checkout-topbar__copy">
                <h1>Checkout</h1>
                <p>
                  {count === 0
                    ? "Your bag is empty"
                    : `${count} ${count === 1 ? "item" : "items"} from ${profile.name}`}
                </p>
              </div>
            </div>
          </header>

          <div className="profile-page__inner checkout-layout">
            {placed ? (
                <section className="checkout-success" aria-live="polite">
                  <h2>Order placed</h2>
                  <p>
                    Thanks{address.name ? `, ${address.name.split(" ")[0]}` : ""}. Your payment is confirmed
                    and a receipt is on the way.
                  </p>
                  <Link href={`/feed/profile/${profile.slug}/collection`} className="btn btn--primary">
                    Back to collection
                  </Link>
                </section>
              ) : items.length === 0 ? (
                <section className="checkout-empty">
                  <h2>Nothing to check out</h2>
                  <p>Add items to your bag before placing an order.</p>
                  <Link href={`/feed/profile/${profile.slug}/collection`} className="btn btn--primary">
                    Browse collection
                  </Link>
                </section>
              ) : (
                <>
                  <div className="checkout-main">
                  <section className="checkout-card" aria-labelledby="checkout-shipping-heading">
                    <div className="checkout-card__head">
                      <h2 id="checkout-shipping-heading">
                        {needsDelivery ? "Shipping address" : "Delivery details"}
                      </h2>
                      {needsDelivery ? (
                        <button
                          type="button"
                          className="checkout-card__change"
                          onClick={() => setEditingAddress((value) => !value)}
                        >
                          {editingAddress ? "Save" : "Change"}
                        </button>
                      ) : null}
                    </div>

                    {needsDelivery ? (
                      editingAddress ? (
                        <div className="checkout-address-form">
                          <label>
                            Full name
                            <input
                              value={address.name}
                              onChange={(event) => setAddress((prev) => ({ ...prev, name: event.target.value }))}
                            />
                          </label>
                          <label>
                            Phone
                            <input
                              value={address.phone}
                              onChange={(event) => setAddress((prev) => ({ ...prev, phone: event.target.value }))}
                            />
                          </label>
                          <label>
                            Address line 1
                            <input
                              value={address.line1}
                              onChange={(event) => setAddress((prev) => ({ ...prev, line1: event.target.value }))}
                            />
                          </label>
                          <label>
                            Address line 2
                            <input
                              value={address.line2}
                              onChange={(event) => setAddress((prev) => ({ ...prev, line2: event.target.value }))}
                            />
                          </label>
                          <div className="checkout-address-form__row">
                            <label>
                              City
                              <input
                                value={address.city}
                                onChange={(event) => setAddress((prev) => ({ ...prev, city: event.target.value }))}
                              />
                            </label>
                            <label>
                              Postal code
                              <input
                                value={address.postalCode}
                                onChange={(event) =>
                                  setAddress((prev) => ({ ...prev, postalCode: event.target.value }))
                                }
                              />
                            </label>
                          </div>
                        </div>
                      ) : (
                        <div className="checkout-address">
                          <p className="checkout-address__primary">
                            {address.name} <span>{address.phone}</span>
                          </p>
                          {addressLines.map((line) => (
                            <p key={line}>{line}</p>
                          ))}
                        </div>
                      )
                    ) : (
                      <p className="checkout-digital-note">
                        This order includes only digital products. After payment, we&apos;ll send an email with
                        instructions on how to download your digital merchandise — no shipping address required.
                      </p>
                    )}
                  </section>

                  <section className="checkout-card" aria-labelledby="checkout-items-heading">
                    <div className="checkout-card__head">
                      <h2 id="checkout-items-heading">Review items and delivery</h2>
                    </div>

                    <div className="checkout-shipments">
                      {physicalItems.length > 0 ? (
                        <article className="checkout-shipment" aria-labelledby="checkout-shipment-physical">
                          <header className="checkout-shipment__head">
                            <div className="checkout-shipment__badge checkout-shipment__badge--physical">
                              Shipment 1
                            </div>
                            <div className="checkout-shipment__title-block">
                              <h3 id="checkout-shipment-physical">Arriving {deliveryEstimate}</h3>
                              <p>
                                Standard delivery · {formatCartMoney(deliveryFee)}
                                {address.city ? ` · to ${address.city}` : ""}
                              </p>
                            </div>
                          </header>
                          <p className="checkout-shipment__method">
                            These items will be packed and shipped to your address after payment.
                          </p>
                          <ul className="checkout-shipment__items">
                            {physicalItems.map((item) => (
                              <CheckoutLineItem
                                key={`physical:${item.productId}:${item.variant ?? ""}`}
                                item={item}
                              />
                            ))}
                          </ul>
                        </article>
                      ) : null}

                      {digitalItems.length > 0 ? (
                        <article className="checkout-shipment" aria-labelledby="checkout-shipment-digital">
                          <header className="checkout-shipment__head">
                            <div className="checkout-shipment__badge checkout-shipment__badge--digital">
                              Digital delivery
                            </div>
                            <div className="checkout-shipment__title-block">
                              <h3 id="checkout-shipment-digital">Available immediately</h3>
                              <p>Get it now · Free</p>
                            </div>
                          </header>
                          <p className="checkout-shipment__method">
                            After payment, we&apos;ll send an email with instructions on how to download your
                            digital merchandise — no shipping required.
                          </p>
                          <ul className="checkout-shipment__items">
                            {digitalItems.map((item) => (
                              <CheckoutLineItem
                                key={`digital:${item.productId}:${item.variant ?? ""}`}
                                item={item}
                              />
                            ))}
                          </ul>
                        </article>
                      ) : null}
                    </div>
                  </section>

                  <section className="checkout-card" aria-labelledby="checkout-payment-heading">
                    <div className="checkout-card__head">
                      <h2 id="checkout-payment-heading">Payment methods</h2>
                    </div>

                    <div className="checkout-payment-list" role="radiogroup" aria-label="Payment methods">
                      <label className={`checkout-payment-option${paymentMethod === "card" ? " is-selected" : ""}`}>
                        <input
                          type="radio"
                          name="payment-method"
                          value="card"
                          checked={paymentMethod === "card"}
                          onChange={() => setPaymentMethod("card")}
                        />
                        <span className="checkout-payment-option__icon" aria-hidden="true">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="5" width="20" height="14" rx="2" />
                            <line x1="2" y1="10" x2="22" y2="10" />
                          </svg>
                        </span>
                        <span className="checkout-payment-option__copy">
                          <strong>Credit Card</strong>
                        </span>
                        <span className="checkout-payment-option__marks">
                          <AmexMark />
                          <MastercardMark />
                          <VisaMark />
                        </span>
                      </label>

                      {needsDelivery ? (
                        <label className={`checkout-payment-option${paymentMethod === "cod" ? " is-selected" : ""}`}>
                          <input
                            type="radio"
                            name="payment-method"
                            value="cod"
                            checked={paymentMethod === "cod"}
                            onChange={() => setPaymentMethod("cod")}
                          />
                          <span className="checkout-payment-option__icon" aria-hidden="true">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="2" y="6" width="20" height="12" rx="2" />
                              <circle cx="12" cy="12" r="2" />
                              <path d="M6 12h.01M18 12h.01" />
                            </svg>
                          </span>
                          <span className="checkout-payment-option__copy">
                            <strong>Cash on Delivery</strong>
                          </span>
                        </label>
                      ) : null}
                    </div>

                    {paymentMethod === "card" ? (
                      <div className="checkout-card-fields">
                        <label>
                          Name on card
                          <input
                            autoComplete="cc-name"
                            value={cardName}
                            onChange={(event) => setCardName(event.target.value)}
                            placeholder="Full name"
                          />
                        </label>
                        <label>
                          Card number
                          <input
                            inputMode="numeric"
                            autoComplete="cc-number"
                            value={cardNumber}
                            onChange={(event) => setCardNumber(formatCardNumber(event.target.value))}
                            placeholder="1234 5678 9012 3456"
                          />
                        </label>
                        <div className="checkout-card-fields__row">
                          <label>
                            Expiry
                            <input
                              inputMode="numeric"
                              autoComplete="cc-exp"
                              value={cardExpiry}
                              onChange={(event) => setCardExpiry(formatExpiry(event.target.value))}
                              placeholder="MM/YY"
                            />
                          </label>
                          <label className="checkout-cvv-field">
                            <span className="checkout-field-label-row">
                              CVV
                              <CvvHelpTip tipId={cvvHelpId} />
                            </span>
                            <input
                              inputMode="numeric"
                              autoComplete="cc-csc"
                              value={cardCvv}
                              onChange={(event) => setCardCvv(event.target.value.replace(/\D/g, "").slice(0, 4))}
                              placeholder="123"
                            />
                          </label>
                        </div>
                      </div>
                    ) : (
                      <p className="checkout-cod-note">
                        Pay in cash when your order arrives. Keep the exact amount ready if possible.
                      </p>
                    )}
                  </section>
                </div>

                <aside className="checkout-summary" aria-labelledby="checkout-summary-heading">
                  <h2 id="checkout-summary-heading">Summary</h2>

                  <div className="checkout-summary__rows">
                    <div className="checkout-summary__row">
                      <span>Sub total</span>
                      <strong>{formatCartMoney(subtotal)}</strong>
                    </div>

                    <div className="checkout-summary__promo">
                      <div className="checkout-summary__promo-label" id={promoId}>
                        Promo code
                      </div>
                      {appliedCoupon ? (
                        <div className="checkout-summary__promo-applied">
                          <span className="checkout-summary__promo-value">{appliedCoupon.label}</span>
                          <button type="button" className="checkout-card__change" onClick={clearCoupon}>
                            Change
                          </button>
                        </div>
                      ) : (
                        <div className="checkout-summary__promo-panel">
                          <div className="checkout-summary__promo-row">
                            <input
                              type="text"
                              aria-labelledby={promoId}
                              value={couponDraft}
                              placeholder="Enter code"
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
                            <button type="button" className="btn btn--secondary btn--sm" onClick={applyCoupon}>
                              Apply
                            </button>
                          </div>
                          {couponMessage ? <p className="checkout-summary__promo-message">{couponMessage}</p> : null}
                        </div>
                      )}
                    </div>

                    {couponDiscount > 0 ? (
                      <div className="checkout-summary__row checkout-summary__row--discount">
                        <span>Discount ({appliedCoupon?.label})</span>
                        <strong>−{formatCartMoney(couponDiscount)}</strong>
                      </div>
                    ) : null}

                    <div className="checkout-summary__row">
                      <span>{needsDelivery ? "Shipping" : "Delivery fee"}</span>
                      <strong>{deliveryFee === 0 ? "Free" : formatCartMoney(deliveryFee)}</strong>
                    </div>
                  </div>

                  <div className="checkout-summary__total">
                    <div className="checkout-summary__row checkout-summary__row--grand">
                      <span>Total charge</span>
                      <strong>{formatCartMoney(total)}</strong>
                    </div>
                    <p className="checkout-summary__vat">VAT included, where applicable</p>
                  </div>

                  <button type="button" className="btn btn--primary checkout-summary__place" onClick={placeOrder}>
                    Place order
                  </button>
                  <p className="checkout-summary__terms">
                    Upon clicking &apos;Confirm &amp; pay&apos;, I confirm I have read and acknowledged all
                    terms and policies.
                  </p>
                </aside>
              </>
            )}
          </div>
        </main>
      </div>
      <MobileNav />
    </>
  );
}
