"use client";

import { useState } from "react";
import { getCountryLabel } from "@/lib/constants/locations";
import { ID_DOC_TYPE_LABELS, maskIdNumber, simulateExtractedIdNumber, type IdDocType } from "@/lib/guardian/constants";

export function SellerIdentityReviewStep({
  fullName,
  dateOfBirthDisplay,
  country,
  email,
  idDocType,
  isSubmitting,
  onContinue,
}: {
  fullName: string;
  dateOfBirthDisplay: string;
  country: string | null;
  email: string;
  idDocType: IdDocType;
  isSubmitting?: boolean;
  onContinue: () => void;
}) {
  const [idRevealed, setIdRevealed] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const idNumber = simulateExtractedIdNumber(email);
  const idTypeLabel = `${ID_DOC_TYPE_LABELS[idDocType]} · ${getCountryLabel(country ?? "GB")}`;

  return (
    <div className="identity-review">
      <div className="identity-review__hero text-center">
        <div className="identity-review__hero-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <polyline points="9 12 11 14 15 10" />
          </svg>
        </div>
        <h1 className="parent-signup__title identity-review__title">Identity verified</h1>
        <p className="subtitle mt-2">Face matched to government ID</p>
      </div>

      <div className="identity-review__success-banner mt-4" role="status">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span>Your age meets the requirements to sell and take payment on InrCliq.</span>
      </div>

      <section className="identity-review__card mt-6" aria-labelledby="seller-review-id-heading">
        <div className="identity-review__card-header">
          <h2 className="identity-review__card-title" id="seller-review-id-heading">
            Extracted from your ID
          </h2>
          <span className="identity-review__verified-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Verified
          </span>
        </div>

        <dl className="identity-review__details">
          <div className="identity-review__detail">
            <dt className="identity-review__detail-label">Full name</dt>
            <dd className="identity-review__detail-value">
              <strong>{fullName}</strong>
            </dd>
          </div>
          <div className="identity-review__detail">
            <dt className="identity-review__detail-label">Date of birth</dt>
            <dd className="identity-review__detail-value">
              <strong>{dateOfBirthDisplay}</strong>
            </dd>
          </div>
          <div className="identity-review__detail">
            <dt className="identity-review__detail-label">ID type</dt>
            <dd className="identity-review__detail-value">
              <strong>{idTypeLabel}</strong>
            </dd>
          </div>
          <div className="identity-review__detail">
            <dt className="identity-review__detail-label">ID number</dt>
            <dd className="identity-review__detail-value">
              <strong>{idRevealed ? idNumber : maskIdNumber(idNumber)}</strong>
              <button
                type="button"
                className="parent-signup__edit-btn"
                aria-label={idRevealed ? "Hide ID number" : "Show ID number"}
                aria-pressed={idRevealed}
                onClick={() => setIdRevealed((value) => !value)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </dd>
          </div>
        </dl>
      </section>

      <div className="identity-review__info-note mt-4" role="note">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <p>Check these details before you pay. They were read from the ID you just captured.</p>
      </div>

      <label className="parent-signup__confirm identity-review__confirm mt-8">
        <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
        <span>I confirm this information is correct and I am 18 or older.</span>
      </label>

      <button
        type="button"
        className="btn btn--primary identity-review__continue mt-6"
        disabled={!confirmed || isSubmitting}
        onClick={onContinue}
      >
        {isSubmitting ? "Continuing…" : "Continue to payment"}
      </button>
    </div>
  );
}
