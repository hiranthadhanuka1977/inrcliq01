"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const REDIRECT_COOLDOWN_SECONDS = 2;

type CardSource = "saved" | "new";

type BalanceCheckoutData = {
  id: string;
  reference: string;
  requestLabel: string;
  totalFee: number;
  currency: string;
  depositPaid: number;
  balanceDue: number;
  creatorName: string;
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

export default function BookingBalanceCheckoutView({ data }: { data: BalanceCheckoutData }) {
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
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const backHref = `/feed/bookings?tab=outbound&booking=${encodeURIComponent(data.id)}`;
  const redirectTarget = `/feed/bookings?tab=outbound&booking=${encodeURIComponent(data.id)}&toast=balance_paid&ref=${encodeURIComponent(data.reference)}`;

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
    redirectStartedRef.current = false;
  }

  async function submitPayment() {
    if (submitting || submitted) return;

    if (!acceptedTerms) {
      setError("Accept the Terms & Conditions to continue.");
      return;
    }

    if (!country.trim()) {
      setError("Select a country of origin to continue.");
      return;
    }

    if (cardSource === "new") {
      const numberDigits = cardNumber.replace(/\D/g, "");
      const expiryDigits = cardExpiry.replace(/\D/g, "");
      const cvvDigits = cardCvv.replace(/\D/g, "");
      const valid =
        numberDigits.length >= 12 && expiryDigits.length === 4 && cvvDigits.length >= 3;

      if (!valid) {
        setError("Enter valid card details to continue.");
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      await new Promise((resolve) => window.setTimeout(resolve, 600));

      const response = await fetch(`/api/feed/bookings/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pay_balance" }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload) {
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
    router.push(redirectTarget);
  }, [redirectCooldown, redirectTarget, router, submitted]);

  return (
    <div className="stripe-checkout">
      <aside className="stripe-checkout__summary" aria-labelledby="balance-checkout-amount">
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
            Back to request
          </Link>

          <p className="stripe-checkout__merchant">Pay {data.creatorName}</p>
          <p className="stripe-checkout__amount" id="balance-checkout-amount">
            <span className="stripe-checkout__currency">$</span>
            {data.balanceDue}
          </p>

          <ul className="stripe-checkout__lines">
            <li>
              <div>
                <strong>{data.requestLabel}</strong>
                <span>Ref {data.reference}</span>
              </div>
              <em>
                ${data.totalFee} {data.currency}
              </em>
            </li>
            <li>
              <div>
                <strong>Deposit paid</strong>
                <span>Initial booking fee</span>
              </div>
              <em>-${data.depositPaid}</em>
            </li>
          </ul>

          <div className="stripe-checkout__summary-total">
            <span>Balance due</span>
            <strong>
              ${data.balanceDue} {data.currency}
            </strong>
          </div>
        </div>
      </aside>

      <main className="stripe-checkout__panel">
        <div className="stripe-checkout__panel-inner">
          <header className="stripe-checkout__panel-head">
            <h1>Complete balance payment</h1>
            <p>
              Accept the new offer from {data.creatorName} by paying the remaining balance. After
              payment, they will confirm the booking for final delivery.
            </p>
          </header>

          <section className="stripe-checkout__block" aria-labelledby="balance-payment-method">
            <h2 id="balance-payment-method">Payment method</h2>
            <div className="stripe-checkout__methods" role="radiogroup" aria-label="Card options">
              <label className={`stripe-checkout__method${cardSource === "saved" ? " is-selected" : ""}`}>
                <input
                  type="radio"
                  name="balance-card-source"
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
                  name="balance-card-source"
                  value="new"
                  checked={cardSource === "new"}
                  onChange={() => selectCardSource("new")}
                  disabled={submitting || submitted}
                />
                <span className="stripe-checkout__method-copy">
                  <strong>Use a new card</strong>
                  <span>Visa, Mastercard, Amex</span>
                </span>
              </label>
            </div>

            {cardSource === "new" ? (
              <section className="stripe-checkout__block" aria-labelledby="balance-card-details">
                <h2 id="balance-card-details">Card details</h2>
                <div className="stripe-checkout__fields">
                  <label className="stripe-checkout__field">
                    <span>Card number</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="cc-number"
                      placeholder="1234 5678 9012 3456"
                      value={cardNumber}
                      onChange={(event) => setCardNumber(formatCardNumber(event.target.value))}
                      disabled={submitting || submitted}
                    />
                  </label>
                  <div className="stripe-checkout__field-row">
                    <label className="stripe-checkout__field">
                      <span>Expiry</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="cc-exp"
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={(event) => setCardExpiry(formatExpiry(event.target.value))}
                        disabled={submitting || submitted}
                      />
                    </label>
                    <label className="stripe-checkout__field">
                      <span>CVC</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="cc-csc"
                        placeholder="123"
                        value={cardCvv}
                        onChange={(event) =>
                          setCardCvv(event.target.value.replace(/\D/g, "").slice(0, 4))
                        }
                        disabled={submitting || submitted}
                      />
                    </label>
                  </div>
                </div>
              </section>
            ) : null}
          </section>

          <section className="stripe-checkout__block" aria-labelledby="balance-country">
            <h2 id="balance-country">Billing country</h2>
            <label className="stripe-checkout__field">
              <span>Country of origin</span>
              <select
                value={country}
                onChange={(event) => setCountry(event.target.value)}
                disabled={submitting || submitted}
              >
                {COUNTRIES.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
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
                if (event.target.checked) setError(null);
              }}
              disabled={submitting || submitted}
            />
            <span>
              I agree to the booking terms. This demo checkout records the balance payment — no real
              charge.
            </span>
          </label>

          {submitted ? (
            <div className="stripe-checkout__success-wrap" role="status" aria-live="polite">
              <p className="stripe-checkout__success">Balance payment received.</p>
              <div className="stripe-checkout__redirect-cooldown" aria-hidden="true">
                <div
                  className="stripe-checkout__redirect-progress"
                  style={{ ["--progress" as string]: `${redirectPercent}%` }}
                >
                  <span
                    className="stripe-checkout__redirect-progress-bar"
                    style={{ width: `${redirectPercent}%` }}
                  />
                </div>
                <p className="stripe-checkout__redirect-countdown">
                  Returning to your request{redirectCooldown > 0 ? ` in ${redirectCooldown}s` : "…"}
                </p>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="stripe-checkout__pay"
              onClick={submitPayment}
              disabled={submitting}
            >
              {submitting ? "Processing…" : `Pay $${data.balanceDue}`}
            </button>
          )}

          <p className="stripe-checkout__secure">
            Demo checkout — payments are simulated for testing.
          </p>
        </div>
      </main>
    </div>
  );
}
