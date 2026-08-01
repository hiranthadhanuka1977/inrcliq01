"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ProfileData } from "@/types/feed/profile";
import {
  extractContentType,
  extractDuration,
  extractTone,
  generateBookingReference,
  parseDeliveryDeadline,
} from "@/lib/feed/booking-confirmation";

type RequestCheckoutData = {
  request?: string;
  category?: string;
  delivery?: string;
  content?: string;
  when?: string;
  duration?: string;
  occasion?: string;
  recipient?: string;
  username?: string;
  message?: string;
  instructions?: string;
  location?: string;
  expectation?: string;
  reference?: string;
  dayRate?: number;
  feedFee?: number;
  totalFee: number;
  isAppearance?: boolean;
};

type CardSource = "saved" | "new";

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

const REDIRECT_MS = 2000;

function formatCardNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function buildBookingPayload(
  data: RequestCheckoutData,
  creatorName: string,
) {
  const reference = generateBookingReference();
  const contentSummary = data.content?.trim() || "";
  return {
    reference,
    requestLabel: data.request?.trim() || "Special request",
    category: data.category?.trim() || "",
    occasion: data.occasion?.trim() || data.category?.trim() || data.request?.trim() || "—",
    contentType: data.isAppearance ? "Live appearance" : extractContentType(contentSummary),
    duration: data.isAppearance
      ? data.duration?.trim() || "—"
      : extractDuration(contentSummary, data.duration),
    tone: data.isAppearance ? null : extractTone(contentSummary),
    contentSummary: data.isAppearance ? null : contentSummary || null,
    publishingMethod: data.delivery?.trim() || "Direct message",
    recipientLabel: data.recipient?.trim() || "",
    recipientUsername: data.username?.trim() || "",
    shoutoutMessage: data.message?.trim() || "",
    specialInstructions: data.instructions?.trim() || "",
    isAppearance: Boolean(data.isAppearance),
    appearanceLocation: data.location?.trim() || "",
    appearanceExpectation: data.expectation?.trim() || "",
    appearanceReference: data.reference?.trim() || "",
    dayRate: data.dayRate ?? data.totalFee,
    feedFee: data.feedFee ?? 0,
    totalFee: data.totalFee,
    currency: "USD",
    when: data.when?.trim() || "",
    deliverBy: parseDeliveryDeadline(data.when),
    creatorName,
  };
}

export default function RequestCheckoutView({
  profile,
  data,
}: {
  profile: ProfileData;
  data: RequestCheckoutData;
}) {
  const router = useRouter();
  const redirectTimerRef = useRef<number | null>(null);
  const [cardSource, setCardSource] = useState<CardSource>("saved");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [country, setCountry] = useState("Sri Lanka");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [progressing, setProgressing] = useState(false);
  const [paying, setPaying] = useState(false);

  const backHref = `/feed/profile/${profile.slug}/requests/choose`;
  const requestLabel = data.request?.trim() || "Special request";
  const dayRate = data.dayRate ?? data.totalFee;
  const feedFee = data.feedFee ?? 0;

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current != null) {
        window.clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  function selectCardSource(next: CardSource) {
    if (submitted || paying) return;
    setCardSource(next);
    setError(null);
  }

  async function finishPayment() {
    setPaying(true);
    setError(null);

    try {
      const booking = buildBookingPayload(data, profile.name);
      const response = await fetch("/api/feed/messages/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: profile.slug,
          booking,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "Could not confirm booking message.");
      }

      const result = (await response.json()) as { threadId?: string };
      setSubmitted(true);
      setProgressing(true);

      redirectTimerRef.current = window.setTimeout(() => {
        const params = new URLSearchParams();
        if (result.threadId) params.set("thread", result.threadId);
        params.set("slug", profile.slug);
        router.push(`/feed/messages?${params.toString()}`);
      }, REDIRECT_MS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment succeeded, but messaging failed.");
      setSubmitted(true);
    } finally {
      setPaying(false);
    }
  }

  function submitPayment() {
    if (submitted || paying || progressing) return;

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

    void finishPayment();
  }

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
                  disabled={submitted || paying}
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
                  disabled={submitted || paying}
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
                    disabled={submitted || paying}
                    onChange={(event) => {
                      setCardNumber(formatCardNumber(event.target.value));
                      setError(null);
                    }}
                    placeholder="1234 5678 9012 3456"
                  />
                </label>
                <div className="stripe-checkout__field-row">
                  <label className="stripe-checkout__field">
                    <span>Expiry</span>
                    <input
                      inputMode="numeric"
                      autoComplete="cc-exp"
                      value={cardExpiry}
                      disabled={submitted || paying}
                      onChange={(event) => {
                        setCardExpiry(formatExpiry(event.target.value));
                        setError(null);
                      }}
                      placeholder="MM / YY"
                    />
                  </label>
                  <label className="stripe-checkout__field">
                    <span>CVV</span>
                    <input
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      value={cardCvv}
                      disabled={submitted || paying}
                      onChange={(event) => {
                        setCardCvv(event.target.value.replace(/\D/g, "").slice(0, 4));
                        setError(null);
                      }}
                      placeholder="CVV"
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
                disabled={submitted || paying}
                onChange={(event) => {
                  setCountry(event.target.value);
                  setError(null);
                }}
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
            <div className="stripe-checkout__success-block" role="status">
              <p className="stripe-checkout__success">
                Payment confirmed. Your request has been submitted.
              </p>
              {progressing ? (
                <div className="stripe-checkout__progress" aria-label="Redirecting to messages">
                  <div className="stripe-checkout__progress-track">
                    <span className="stripe-checkout__progress-fill" />
                  </div>
                  <p className="stripe-checkout__progress-label">Taking you to messages…</p>
                </div>
              ) : null}
            </div>
          ) : null}

          <button
            type="button"
            className="stripe-checkout__pay"
            onClick={submitPayment}
            disabled={submitted || paying || progressing}
          >
            {paying ? "Processing…" : `Pay $${data.totalFee}`}
          </button>

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
