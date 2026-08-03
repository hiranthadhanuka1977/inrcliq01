"use client";

import Link from "next/link";
import { useState } from "react";
import type { ProfileData } from "@/types/feed/profile";

type RequestCheckoutData = {
  request?: string;
  category?: string;
  dayRate?: number;
  feedFee?: number;
  totalFee: number;
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

function formatCardNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export default function RequestCheckoutView({
  profile,
  data,
}: {
  profile: ProfileData;
  data: RequestCheckoutData;
}) {
  const [cardSource, setCardSource] = useState<CardSource>("saved");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [country, setCountry] = useState("Sri Lanka");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const backHref = `/feed/profile/${profile.slug}/requests/choose`;
  const requestLabel = data.request?.trim() || "Special request";
  const dayRate = data.dayRate ?? data.totalFee;
  const feedFee = data.feedFee ?? 0;

  function selectCardSource(next: CardSource) {
    setCardSource(next);
    setError(null);
    setSubmitted(false);
  }

  function submitPayment() {
    if (!country.trim()) {
      setError("Select a country of origin to continue.");
      return;
    }

    if (cardSource === "saved") {
      setError(null);
      setSubmitted(true);
      return;
    }

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

    setError(null);
    setSubmitted(true);
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
            <p className="stripe-checkout__success" role="status">
              Payment confirmed. Your request has been submitted.
            </p>
          ) : null}

          <button type="button" className="stripe-checkout__pay" onClick={submitPayment}>
            Pay ${data.totalFee}
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
