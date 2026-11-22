"use client";

import { useState } from "react";
import { AgeCheckArt } from "@/components/seller/SellerIllustrations";

export function AgeIdVerifyStep({
  onBack,
  onStart,
  disabled,
}: {
  onBack: () => void;
  onStart: () => void;
  disabled?: boolean;
}) {
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="seller-age-verify__page">
      <header className="seller-age-verify__intro">
        <p className="seller-verify__eyebrow">Before the scan</p>
        <h1 className="seller-verify__title">Age and ID verification</h1>
        <p className="seller-verify__lead">
          Confirm you are 18 or older before the camera opens. Next you scan an ID, then take a
          selfie so we can match them.
        </p>
      </header>

      <div className="seller-age-verify__why">
        <AgeCheckArt />
        <div>
          <h2>What you need</h2>
          <ul>
            <li>
              <strong>You are 18 or older.</strong> Selling, bookings, and an adult account all
              require this check.
            </li>
            <li>
              <strong>A current ID.</strong> Passport, national ID, or driving licence. All four
              corners need to be visible.
            </li>
            <li>
              <strong>A selfie.</strong> We match your face to the photo on that ID. It is the same
              check used when a guardian approves a child.
            </li>
          </ul>
        </div>
      </div>

      <div className="seller-age-verify__consent">
        <label className="seller-age-verify__check">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(event) => setAgreed(event.target.checked)}
            disabled={disabled}
          />
          <span>I am 18 or older and I agree to verify with an ID and a selfie.</span>
        </label>
        <div className="seller-age-verify__actions">
          <button type="button" className="btn btn--secondary" onClick={onBack}>
            Back
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={!agreed || disabled}
            onClick={onStart}
          >
            Start ID scan
          </button>
        </div>
      </div>
    </div>
  );
}
