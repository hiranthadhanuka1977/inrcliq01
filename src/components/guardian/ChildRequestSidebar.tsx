import type { GuardianChildContext } from "@/lib/auth/guardian-flow";
import { SidebarEditButton } from "@/components/guardian/SidebarEditButton";
import { getInitials } from "@/lib/utils/format-dates";

export function ChildRequestSidebar({
  child,
  onDecline,
}: {
  child: GuardianChildContext;
  onDecline: () => void;
}) {
  const firstName = child.firstName;

  return (
    <aside className="parent-signup__sidebar" aria-label="Child request details">
      <div className="parent-signup__profile">
        <div className="parent-signup__avatar" id="par-child-avatar" aria-hidden="true">
          {getInitials(child.fullName)}
        </div>
        <div>
          <strong className="parent-signup__profile-name" id="par-child-display-name">
            {child.fullName}
          </strong>
          <p className="parent-signup__profile-age" id="par-child-age">
            {child.age != null ? `${child.age} years old` : "Age pending"}
          </p>
        </div>
        <span className="parent-signup__status-badge">Awaiting your approval</span>
      </div>

      <hr className="parent-signup__divider" />

      <dl className="parent-signup__details">
        <div className="parent-signup__detail">
          <dt className="parent-signup__detail-label">Name</dt>
          <dd className="parent-signup__detail-value">
            <strong id="par-child-detail-name">{child.fullName}</strong>
            <SidebarEditButton label="Edit name" />
          </dd>
        </div>

        <hr className="parent-signup__divider" />

        <div className="parent-signup__detail">
          <dt className="parent-signup__detail-label">Email</dt>
          <dd className="parent-signup__detail-value">
            <strong id="par-child-detail-email">{child.email}</strong>
          </dd>
        </div>

        <hr className="parent-signup__divider" />

        <div className="parent-signup__detail">
          <dt className="parent-signup__detail-label">Date of birth</dt>
          <dd className="parent-signup__detail-value">
            <strong id="par-child-detail-dob">{child.dateOfBirthDisplay ?? "—"}</strong>
            <SidebarEditButton label="Edit date of birth" />
          </dd>
        </div>

        <hr className="parent-signup__divider" />

        <div className="parent-signup__detail">
          <dt className="parent-signup__detail-label">Country</dt>
          <dd className="parent-signup__detail-value">
            <strong id="par-child-detail-country">{child.countryLabel ?? "—"}</strong>
            <SidebarEditButton label="Edit country" />
          </dd>
        </div>

        <hr className="parent-signup__divider" />

        <div className="parent-signup__detail">
          <dt className="parent-signup__detail-label">State</dt>
          <dd className="parent-signup__detail-value">
            <strong id="par-child-detail-state">{child.region ?? "—"}</strong>
          </dd>
        </div>

        <hr className="parent-signup__divider" />

        <div className="parent-signup__detail">
          <dt className="parent-signup__detail-label">Request sent</dt>
          <dd className="parent-signup__detail-value">
            <strong id="par-child-detail-sent">{child.sentAtDisplay}</strong>
          </dd>
        </div>
      </dl>

      <hr className="parent-signup__divider" />

      <div className="parent-signup__sidebar-decline">
        <p className="parent-signup__sidebar-decline-text">Something looks wrong?</p>
        <button type="button" className="parent-signup__decline-btn" id="btn-parent-decline-sidebar" onClick={onDecline}>
          Decline the request
        </button>
      </div>

      <hr className="parent-signup__divider" />

      <div className="parent-signup__sidebar-note">
        <span className="parent-signup__sidebar-note-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </span>
        <p>
          Your account is separate from <span id="par-sidebar-privacy-child">{firstName}</span>&apos;s. You won&apos;t
          share a login. Identity data is encrypted and used for compliance only.
        </p>
      </div>
    </aside>
  );
}
