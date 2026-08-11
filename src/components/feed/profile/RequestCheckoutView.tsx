"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ProfileData } from "@/types/feed/profile";

const REDIRECT_COOLDOWN_SECONDS = 2;

type RequestCheckoutData = {
  request?: string;
  category?: string;
  delivery?: string;
  content?: string;
  recipient?: string;
  when?: string;
  dayRate?: number;
  feedFee?: number;
  totalFee: number;
  isAppearance?: boolean;
  occasion?: string;
  location?: string;
  duration?: string;
  expectation?: string;
  reference?: string;
  message?: string;
  username?: string;
  instructions?: string;
};

type CardSource = "saved" | "new";

type BookingResponse = {
  threadId?: string;
  specialRequestId?: string;
  reference?: string;
  error?: string;
};

const SAVED_CARD = {
  brand: "Visa",
  last4: "4242",
  expiry: "08/28",
  name: "Hiran Karunananda",
};

const COUNTRIES = [
  "Sri Lanka",
  "United States",
  "United Kingdom",
  "India",
  "Australia",
  "Canada",
  "Singapore",
  "United Arab Emirates",
  "Germany",
  "France",
];

function formatCardNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function buildMessagesHref(profileSlug: string, payload: BookingResponse) {
  const params = new URLSearchParams();
  if (payload.threadId) params.set("thread", payload.threadId);
  params.set("slug", profileSlug);
  if (payload.specialRequestId) params.set("booking", payload.specialRequestId);
  params.set("focus", "latest");
  return `/feed/messages?${params.toString()}`;
}

export default function RequestCheckoutView({
  profile,
  data,
}: {
  profile: ProfileData;
  data: RequestCheckoutData;
}) {
  const router = useRouter();
  const redirectStartedRef = useRef(false);

  const [cardSource, setCardSource] = useState<CardSource>("saved");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [country, setCountry] = useState("Sri Lanka");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [redirectCooldown, setRedirectCooldown] = useState(0);
  const [redirectTarget, setRedirectTarget] = useState<string | null>(null);

  const backHref = `/feed/profile/${profile.slug}/requests/choose`;
  const requestLabel = data.request?.trim() || "Special request";
  const dayRate = data.dayRate ?? data.totalFee;
  const feedFee = data.feedFee ?? 0;

  const redirectPercent =
    redirectCooldown > 0
      ? Math.min(
          100,
          ((REDIRECT_COOLDOWN_SECONDS - redirectCooldown) / REDIRECT_COOLDOWN_SECONDS) * 100,
        )
      : 100;

  function selectCardSource(next: CardSource) {
    setCardSource(next);
    setError(null);
    if (!submitted) return;
    setSubmitted(false);
    setRedirectCooldown(0);
    setRedirectTarget(null);
    redirectStartedRef.current = false;
  }

  async function submitPayment() {
    if (submitting || submitted) return;

    if (!country.trim()) {
      setError("Select a country of origin to continue.");
      return;
    }

    if (cardSource === "new") {
      const numberDigits = cardNumber.replace(/\D/g, "");
      const expiryDigits = cardExpiry.replace(/\D/g, "");
      const cvvDigits = cardCvv.replace(/\D/g, "");
      const valid =
        numberDigits.length >= 12 &&
        expiryDigits.length === 4 &&
        cvvDigits.length >= 3;

      if (!valid) {
        setError("Enter valid card details to continue.");
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/feed/messages/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: profile.slug,
          booking: {
            requestLabel,
            category: data.category,
            contentType: data.content,
            publishingMethod: data.delivery,
            recipientLabel: data.recipient,
            recipientUsername: data.username,
            shoutoutMessage: data.message,
            specialInstructions: data.instructions,
            occasion: data.occasion,
            appearanceLocation: data.location,
            duration: data.duration,
            appearanceExpectation: data.expectation,
            appearanceReference: data.reference,
            isAppearance: Boolean(data.isAppearance),
            when: data.when,
            dayRate: data.dayRate,
            feedFee: data.feedFee,
            totalFee: data.totalFee,
            currency: "USD",
            creatorName: profile.name,
          },
        }),
      });

      const payload = (await response.json().catch(() => null)) as BookingResponse | null;
      if (!response.ok || !payload) {
        throw new Error(payload?.error || "Payment could not be completed.");
      }

      setRedirectTarget(buildMessagesHref(profile.slug, payload));
      setSubmitted(true);
      setRedirectCooldown(REDIRECT_COOLDOWN_SECONDS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment could not be completed.");
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (redirectCooldown <= 0) return;
    const timer = window.setTimeout(() => {
      setRedirectCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [redirectCooldown]);

  useEffect(() => {
    if (redirectCooldown > 0 || !redirectTarget || !submitted || redirectStartedRef.current) return;
    redirectStartedRef.current = true;
    router.push(redirectTarget);
  }, [redirectCooldown, redirectTarget, router, submitted]);

  return (
    <div className="stripe-checkout">
      <aside className="stripe-checkout__summary" aria-labelledby="stripe-checkout-amount">
        <div className="stripe-checkout__summary-inner">
          <Link href="/" className="stripe-checkout__logo" aria-label="InrCliq home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/logo-InrCliq.svg"
              alt="InrCliq"
              className="stripe-checkout__logo-img"
              width={114}
              height={27}
            />
          </Link>

          <Link href={backHref} className="stripe-checkout__back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Back
          </Link>

          <p className="stripe-checkout__merchant">Pay {profile.name}</p>
          <p className="stripe-checkout__amount" id="stripe-checkout-amount">
            <span className="stripe-checkout__currency">$</span>
            {data.totalFee}
          </p>

          <ul className="stripe-checkout__lines">
            <li>
              <div>
                <strong>{requestLabel}</strong>
                {data.category ? <span>{data.category}</span> : null}
              </div>
              <em>${dayRate}</em>
            </li>
            {feedFee > 0 ? (
              <li>
                <div>
                  <strong>Feed post</strong>
                  <span>Tagged delivery</span>
                </div>
                <em>${feedFee}</em>
              </li>
            ) : null}
          </ul>

          <div className="stripe-checkout__summary-total">
            <span>Total due</span>
            <strong>${data.totalFee}</strong>
          </div>
        </div>
      </aside>

      <main className="stripe-checkout__panel">
        <div className="stripe-checkout__panel-inner">
          <header className="stripe-checkout__panel-head">
            <h1>Payment details</h1>
            <p>Complete your payment securely.</p>
          </header>

          <section className="stripe-checkout__block" aria-labelledby="stripe-payment-method">
            <h2 id="stripe-payment-method">Payment method</h2>
            <div className="stripe-checkout__methods" role="radiogroup" aria-label="Card options">
              <label className={`stripe-checkout__method${cardSource === "saved" ? " is-selected" : ""}`}>
                <input
                  type="radio"
                  name="request-card-source"
                  value="saved"
                  checked={cardSource === "saved"}
                  onChange={() => selectCardSource("saved")}
                  disabled={submitting || submitted}
                />
                <span className="stripe-checkout__method-copy">
                  <strong>
                    {SAVED_CARD.brand} ···· {SAVED_CARD.last4}
                  </strong>
                  <span>
                    {SAVED_CARD.name} · Expires {SAVED_CARD.expiry}
                  </span>
                </span>
                <span className="stripe-checkout__badge">Saved</span>
              </label>

              <label className={`stripe-checkout__method${cardSource === "new" ? " is-selected" : ""}`}>
                <input
                  type="radio"
                  name="request-card-source"
                  value="new"
                  checked={cardSource === "new"}
                  onChange={() => selectCardSource("new")}
                  disabled={submitting || submitted}
                />
                <span className="stripe-checkout__method-copy">
                  <strong>New card</strong>
                  <span>Enter card number, expiry, and CVV</span>
                </span>
              </label>
            </div>
          </section>

          {cardSource === "new" ? (
            <section className="stripe-checkout__block" aria-labelledby="stripe-card-details">
              <h2 id="stripe-card-details">Card information</h2>
              <div className="stripe-checkout__fields">
                <label className="stripe-checkout__field">
                  <span>Card number</span>
                  <input
                    inputMode="numeric"
                    autoComplete="cc-number"
                    value={cardNumber}
                    onChange={(event) => {
                      setCardNumber(formatCardNumber(event.target.value));
                      setError(null);
                    }}
                    placeholder="1234 5678 9012 3456"
                    disabled={submitting || submitted}
                  />
                </label>
                <div className="stripe-checkout__field-row">
                  <label className="stripe-checkout__field">
                    <span>Expiry</span>
                    <input
                      inputMode="numeric"
                      autoComplete="cc-exp"
                      value={cardExpiry}
                      onChange={(event) => {
                        setCardExpiry(formatExpiry(event.target.value));
                        setError(null);
                      }}
                      placeholder="MM / YY"
                      disabled={submitting || submitted}
                    />
                  </label>
                  <label className="stripe-checkout__field">
                    <span>CVV</span>
                    <input
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      value={cardCvv}
                      onChange={(event) => {
                        setCardCvv(event.target.value.replace(/\D/g, "").slice(0, 4));
                        setError(null);
                      }}
                      placeholder="CVV"
                      disabled={submitting || submitted}
                    />
                  </label>
                </div>
              </div>
            </section>
          ) : null}

          <section className="stripe-checkout__block" aria-labelledby="stripe-country">
            <h2 id="stripe-country">Country of origin</h2>
            <label className="stripe-checkout__field">
              <span className="visually-hidden">Country of origin</span>
              <select
                autoComplete="country-name"
                value={country}
                onChange={(event) => {
                  setCountry(event.target.value);
                  setError(null);
                }}
                disabled={submitting || submitted}
              >
                {COUNTRIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </section>

          {error ? (
            <p className="stripe-checkout__error" role="alert">
              {error}
            </p>
          ) : null}
          {submitted ? (
            <div className="stripe-checkout__success-wrap" role="status" aria-live="polite">
              <p className="stripe-checkout__success">
                Payment confirmed. Your request has been submitted.
              </p>
              <div
                className="stripe-checkout__redirect-cooldown"
                aria-label="Opening messages"
              >
                <div
                  className="stripe-checkout__redirect-progress"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={REDIRECT_COOLDOWN_SECONDS}
                  aria-valuenow={REDIRECT_COOLDOWN_SECONDS - redirectCooldown}
                >
                  <div
                    className="stripe-checkout__redirect-progress-bar"
                    style={{ width: `${redirectPercent}%` }}
                  />
                </div>
                <p className="stripe-checkout__redirect-countdown">
                  Opening messages{redirectCooldown > 0 ? ` in ${redirectCooldown}s` : "…"}
                </p>
              </div>
            </div>
          ) : null}

          {!submitted ? (
            <button
              type="button"
              className="stripe-checkout__pay"
              onClick={() => void submitPayment()}
              disabled={submitting}
            >
              {submitting ? "Processing…" : `Pay $${data.totalFee}`}
            </button>
          ) : null}

          <p className="stripe-checkout__secure">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Payments are encrypted and secure.
          </p>
        </div>
      </main>
    </div>
  );
}
