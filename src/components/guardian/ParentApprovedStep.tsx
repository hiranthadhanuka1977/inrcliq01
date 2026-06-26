"use client";

import Link from "next/link";
import {
  PROTECTION_TIER_LABELS,
  getProtectionChecklistItems,
  type ProtectionTier,
} from "@/lib/guardian/constants";
import { formatActivatedDisplay, getInitials } from "@/lib/utils/format-dates";

export function ParentApprovedStep({
  childFullName,
  childFirstName,
  childHandle,
  childAge,
  parentEmail,
  protectionLevel,
  activatedAt,
  onDone,
}: {
  childFullName: string;
  childFirstName: string;
  childHandle: string | null;
  childAge: number | null;
  parentEmail: string;
  protectionLevel: ProtectionTier;
  activatedAt: string;
  onDone: () => void;
}) {
  const tierLabel = PROTECTION_TIER_LABELS[protectionLevel];
  const checklist = getProtectionChecklistItems(protectionLevel, childFirstName);
  const meta = childHandle
    ? `@${childHandle}${childAge != null ? ` · ${childAge} years old` : ""}`
    : childAge != null
      ? `${childAge} years old`
      : "";

  return (
    <div className="parent-approved">
      <div className="parent-approved__hero text-center">
        <div className="parent-approved__hero-icon" aria-hidden="true">
          <span className="parent-approved__hero-icon-inner">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
        </div>
        <h1 className="parent-signup__title parent-approved__title">{childFirstName}&apos;s account is live!</h1>
        <p className="subtitle mt-2">
          {tierLabel} protection is active. {childFirstName} can now log in and start exploring InrCliq.
        </p>
      </div>

      <section className="parent-approved__card mt-8" aria-label="Activated account summary">
        <div className="parent-approved__profile">
          <div className="parent-approved__avatar" aria-hidden="true">
            {getInitials(childFullName)}
          </div>
          <div className="parent-approved__profile-body">
            <strong className="parent-approved__profile-name">{childFullName}</strong>
            {meta ? <p className="parent-approved__profile-meta">{meta}</p> : null}
          </div>
          <div className="parent-approved__profile-badges">
            <span className="parent-approved__active-badge">
              <span className="parent-approved__active-dot" aria-hidden="true" />
              Active
            </span>
            <span className="parent-approved__tier-badge">{tierLabel}</span>
          </div>
        </div>

        <dl className="parent-approved__details">
          <div className="parent-approved__detail">
            <dt className="parent-approved__detail-label">Protection level</dt>
            <dd className="parent-approved__detail-value">{tierLabel}</dd>
          </div>
          <div className="parent-approved__detail">
            <dt className="parent-approved__detail-label">Activated</dt>
            <dd className="parent-approved__detail-value">{formatActivatedDisplay(new Date(activatedAt).getTime())}</dd>
          </div>
          <div className="parent-approved__detail">
            <dt className="parent-approved__detail-label">Parent account</dt>
            <dd className="parent-approved__detail-value">{parentEmail}</dd>
          </div>
        </dl>
      </section>

      <ul className="parent-approved__checklist" aria-label="Active protections">
        {checklist.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <div className="parent-approved__info-note mt-6" role="note">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <p>
          You can adjust {childFirstName}&apos;s protection level, pause their account, or remove access anytime from
          your Family Center dashboard.
        </p>
      </div>

      <div className="parent-approved__actions mt-8">
        <Link href="/" className="btn btn--primary">
          Go to family center
        </Link>
        <button type="button" className="btn btn--outline-info" onClick={onDone}>
          I am done for now
        </button>
      </div>
    </div>
  );
}
