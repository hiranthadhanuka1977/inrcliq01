"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  VERIFIED_MEMBERSHIP_PERIOD_LABEL,
  VERIFIED_MEMBERSHIP_PRICE_LABEL,
} from "@/lib/seller/constants";

const REDIRECT_COOLDOWN_SECONDS = 2;

type CardSource = "saved" | "new";

const SAVED_CARD = {
  brand: "Visa",
  last4: "4242",
  expiry: "08/28",
  name: "Verified member",
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

export function SellerMembershipCheckoutView({
  firstName,
}: {
  firstName?: string | null;
}) {
  const router = useRouter();
  const redirectStartedRef = useRef(false);
  const memberName = firstName?.trim() || "Creator";

  const [cardSource, setCardSource] = useState<CardSource>("saved");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [country, setCountry] = useState("Sri Lanka");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [redirectCooldown, setRedirectCooldown] = useState(0);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

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
  }

  async function handlePay() {
    if (submitted || submitting) return;

    if (!acceptedTerms) {
      setError("Accept the membership terms to continue.");
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
      // Brief pause so the mock checkout feels like a payment processor.
      await new Promise((resolve) => window.setTimeout(resolve, 700));

      const response = await fetch("/api/seller/membership", { method: "POST" });
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        redirectTo?: string;
        error?: string;
      } | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Payment could not be completed.");
      }

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
    if (redirectCooldown > 0 || !submitted || redirectStartedRef.current) return;
    redirectStartedRef.current = true;
    router.push("/seller");
    router.refresh();
  }, [redirectCooldown, submitted, router]);

  return (
    <div className="stripe-checkout">
      <aside className="stripe-checkout__summary" aria-labelledby="membership-checkout-amount">
        <div className="stripe-checkout__summary-inner">
          <Link href="/seller" className="stripe-checkout__logo" aria-label="Seller Tools home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/logo-InrCliq.svg"
              alt="InrCliq"
              className="stripe-checkout__logo-img"
              width={114}
              height={27}
            />
          </Link>

          <Link href="/seller#verified-membership" className="stripe-checkout__back">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Back
          </Link>

          <p className="stripe-checkout__merchant">Subscribe to Verified</p>
          <p className="stripe-checkout__amount" id="membership-checkout-amount">
            <span className="stripe-checkout__currency">$</span>
            {VERIFIED_MEMBERSHIP_PRICE_LABEL.replace("$", "")}
          </p>

          <ul className="stripe-checkout__lines">
            <li>
              <div>
                <strong>Verified membership</strong>
                <span>
                  Unlock Seller Tools for {memberName} · billed {VERIFIED_MEMBERSHIP_PERIOD_LABEL}ly
                </span>
              </div>
              <em>{VERIFIED_MEMBERSHIP_PRICE_LABEL}</em>
            </li>
          </ul>

          <div className="stripe-checkout__summary-total">
            <span>Total due today</span>
            <strong>{VERIFIED_MEMBERSHIP_PRICE_LABEL}</strong>
          </div>
        </div>
      </aside>

      <main className="stripe-checkout__panel">
        <div className="stripe-checkout__panel-inner">
          <header className="stripe-checkout__panel-head">
            <h1>Payment details</h1>
            <p>Complete your membership payment securely. This is a demo checkout — no real charge.</p>
          </header>

          <section className="stripe-checkout__block" aria-labelledby="membership-payment-method">
            <h2 id="membership-payment-method">Payment method</h2>
            <div className="stripe-checkout__methods" role="radiogroup" aria-label="Card options">
              <label
                className={`stripe-checkout__method${cardSource === "saved" ? " is-selected" : ""}`}
              >
                <input
                  type="radio"
                  name="membership-card-source"
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

              <label
                className={`stripe-checkout__method${cardSource === "new" ? " is-selected" : ""}`}
              >
                <input
                  type="radio"
                  name="membership-card-source"
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
            <section className="stripe-checkout__block" aria-labelledby="membership-card-details">
              <h2 id="membership-card-details">Card information</h2>
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

          <section className="stripe-checkout__block" aria-labelledby="membership-country">
            <h2 id="membership-country">Billing country</h2>
            <label className="stripe-checkout__field">
              <span className="visually-hidden">Country</span>
              <select
                value={country}
                onChange={(event) => setCountry(event.target.value)}
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

          <label className="stripe-checkout__terms">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(event) => {
                setAcceptedTerms(event.target.checked);
                setError(null);
              }}
              disabled={submitting || submitted}
            />
            <span>
              I agree to the Verified membership terms. This demo checkout unlocks Seller Tools
              without a real charge.
            </span>
          </label>

          {submitted ? (
            <div className="stripe-checkout__success-wrap" role="status" aria-live="polite">
              <p className="stripe-checkout__success">
                Payment complete. You’re verified — opening Seller Tools…
              </p>
              <div
                className="stripe-checkout__redirect-cooldown"
                aria-hidden={redirectCooldown <= 0}
              >
                <div
                  className="stripe-checkout__redirect-progress"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(redirectPercent)}
                >
                  <span
                    className="stripe-checkout__redirect-progress-bar"
                    style={{ width: `${redirectPercent}%` }}
                  />
                </div>
                <p className="stripe-checkout__redirect-countdown">
                  Redirecting in {redirectCooldown}s
                </p>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="stripe-checkout__pay"
              disabled={submitting}
              onClick={() => void handlePay()}
            >
              {submitting
                ? "Processing…"
                : `Subscribe · ${VERIFIED_MEMBERSHIP_PRICE_LABEL}`}
            </button>
          )}

          <p className="stripe-checkout__secure">
            Payments are encrypted. Demo mode — no card is charged.
          </p>
        </div>
      </main>
    </div>
  );
}
