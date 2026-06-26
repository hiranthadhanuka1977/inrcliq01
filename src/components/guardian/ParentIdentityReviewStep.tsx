"use client";

import { useState } from "react";
import type { GuardianChildContext } from "@/lib/auth/guardian-flow";
import { COUNTRIES, US_STATES, getCountryLabel } from "@/lib/constants/locations";
import { ID_DOC_TYPE_LABELS, maskIdNumber, type IdDocType } from "@/lib/guardian/constants";

export function ParentIdentityReviewStep({
  child,
  parentName,
  parentDob,
  idDocType,
  guardianCountry,
  idNumber,
  onContinue,
}: {
  child: GuardianChildContext;
  parentName: string;
  parentDob: string;
  idDocType: IdDocType;
  guardianCountry: string | null;
  idNumber: string;
  onContinue: (data: {
    childLivesWithGuardian: boolean;
    childLocationCountry: string | null;
    childLocationRegion: string | null;
  }) => void;
}) {
  const firstName = child.firstName;
  const [idRevealed, setIdRevealed] = useState(false);
  const [livesWithMe, setLivesWithMe] = useState(false);
  const [childCountry, setChildCountry] = useState(child.country ?? "LK");
  const [childRegion, setChildRegion] = useState(child.region ?? "");
  const [confirmed, setConfirmed] = useState(false);

  const idTypeLabel = `${ID_DOC_TYPE_LABELS[idDocType]} · ${getCountryLabel(guardianCountry ?? "GB")}`;

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
        <span>Your age meets the eSafety requirements for under-aged guardianship on InrCliq.</span>
      </div>

      <section className="identity-review__card mt-6" aria-labelledby="par-review-id-heading">
        <div className="identity-review__card-header">
          <h2 className="identity-review__card-title" id="par-review-id-heading">
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
              <strong>{parentName}</strong>
            </dd>
          </div>
          <div className="identity-review__detail">
            <dt className="identity-review__detail-label">Date of birth</dt>
            <dd className="identity-review__detail-value">
              <strong>{parentDob}</strong>
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
        <p>Your country of residence was confirmed during registration and is already on record.</p>
      </div>

      <section className="identity-review__card mt-6" aria-labelledby="par-review-child-heading">
        <h2 className="identity-review__card-title" id="par-review-child-heading">
          You are approving access for
        </h2>

        <dl className="identity-review__details">
          <div className="identity-review__detail">
            <dt className="identity-review__detail-label">Child&apos;s name</dt>
            <dd className="identity-review__detail-value">
              <strong>{child.fullName}</strong>
            </dd>
          </div>
          <div className="identity-review__detail">
            <dt className="identity-review__detail-label">Age</dt>
            <dd className="identity-review__detail-value">
              <strong>{child.age != null ? `${child.age} years old` : "—"}</strong>
            </dd>
          </div>
          <div className="identity-review__detail">
            <dt className="identity-review__detail-label">Email</dt>
            <dd className="identity-review__detail-value">
              <strong>{child.email}</strong>
            </dd>
          </div>
          <div className="identity-review__detail">
            <dt className="identity-review__detail-label">Request sent</dt>
            <dd className="identity-review__detail-value">
              <strong>{child.sentAtDisplay}</strong>
            </dd>
          </div>
        </dl>

        <hr className="identity-review__divider" />

        <div className="identity-review__location">
          <div className="identity-review__location-heading">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <div>
              <h3 className="identity-review__location-title">Where does {firstName} live?</h3>
              <p className="identity-review__location-subtitle">No street address required</p>
            </div>
          </div>

          <div className="identity-review__toggle-card mt-4">
            <div className="identity-review__toggle-card-main">
              <span className="identity-review__toggle-card-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </span>
              <div>
                <strong className="identity-review__toggle-card-label">{firstName} lives with me</strong>
                <p className="identity-review__toggle-card-caption">Same country as your residence</p>
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={livesWithMe}
                onChange={(event) => setLivesWithMe(event.target.checked)}
              />
              <span className="toggle-switch__track" aria-hidden="true">
                <span className="toggle-switch__thumb" />
              </span>
              <span className="sr-only">{firstName} lives with me</span>
            </label>
          </div>

          {!livesWithMe ? (
            <p className="identity-review__location-prompt" role="status">
              <span className="identity-review__prompt-dot" aria-hidden="true" />
              <span>Please confirm where {firstName} currently lives</span>
            </p>
          ) : null}

          {!livesWithMe ? (
            <div className="identity-review__location-fields mt-4">
              <div className="field">
                <label className="field-label" htmlFor="par-review-child-country">
                  Country *
                </label>
                <select
                  className="select"
                  id="par-review-child-country"
                  value={childCountry}
                  onChange={(event) => setChildCountry(event.target.value)}
                >
                  {COUNTRIES.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.flag} {item.label}
                    </option>
                  ))}
                </select>
              </div>
              {childCountry === "US" ? (
                <>
                  <div className="field mt-4">
                    <label className="field-label" htmlFor="par-review-child-state">
                      State *
                    </label>
                    <select
                      className="select"
                      id="par-review-child-state"
                      value={childRegion}
                      onChange={(event) => setChildRegion(event.target.value)}
                    >
                      <option value="">Select state</option>
                      {US_STATES.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="identity-review__location-footnote mt-3">
                    eSafety laws and content rules vary by state
                  </p>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <label className="parent-signup__confirm identity-review__confirm mt-8">
        <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
        <span>
          I confirm this information is correct and I am {firstName}&apos;s parent or legal guardian
        </span>
      </label>

      <button
        type="button"
        className="btn btn--primary identity-review__continue mt-6"
        disabled={!confirmed}
        onClick={() =>
          onContinue({
            childLivesWithGuardian: livesWithMe,
            childLocationCountry: livesWithMe ? null : childCountry,
            childLocationRegion: livesWithMe ? null : childCountry === "US" ? childRegion : null,
          })
        }
      >
        Continue to protection setup
      </button>
    </div>
  );
}
