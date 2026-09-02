"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import ProtectionTierIcon from "@/components/guardian/ProtectionTierIcon";
import { ControlHealthInfoIcon } from "@/components/guardian/family-center/ControlHealthInfoIcon";
import { ChildCardDmAvatars } from "@/components/guardian/family-center/ChildCardDmAvatars";
import { ChildSafetyScoreRing } from "@/components/guardian/family-center/ChildSafetyScoreRing";
import { FamilyActivityLog } from "@/components/guardian/family-center/FamilyActivityLog";
import type { FamilyCenterChild, FamilyCenterData } from "@/lib/guardian/family-center";
import {
  buildControlHealthForChild,
  staticDashboardExtras,
  staticFamilyActivityHistory,
  zoneLabelForAge,
} from "@/lib/guardian/family-center-static";
import { computeChildSafetySecureScore } from "@/lib/guardian/safety-score";

export function SummaryStat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint: string;
  tone?: "default" | "warn" | "accent";
}) {
  return (
    <div className={`family-center__summary-stat family-center__summary-stat--${tone}`}>
      <span className="family-center__summary-stat-value">{value}</span>
      <span className="family-center__summary-stat-label">{label}</span>
      <span className="family-center__summary-stat-hint">{hint}</span>
    </div>
  );
}

function LinkedAccountAvatar({
  child,
  href,
}: {
  child: FamilyCenterChild;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="family-center__summary-avatar"
      title={child.fullName}
      aria-label={child.fullName}
    >
      <span
        className="family-center__summary-avatar-inner"
        style={{ "--story-color": child.avatarColor } as CSSProperties}
      >
        {child.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={child.avatarUrl} alt="" width={28} height={28} />
        ) : (
          child.avatarInitials
        )}
      </span>
    </Link>
  );
}

export function LinkedAccountsSummaryStat({ linkedChildren }: { linkedChildren: FamilyCenterChild[] }) {
  const linkedCount = linkedChildren.length;
  const visibleChildren = linkedChildren.slice(0, 3);
  const hint =
    linkedCount === 1 ? "1 minor connected" : linkedCount > 1 ? "Minors connected" : "None yet";

  return (
    <div className="family-center__summary-stat family-center__summary-stat--linked">
      <div className="family-center__summary-stat-top">
        <span className="family-center__summary-stat-value">{linkedCount}</span>
        <div className="family-center__summary-avatars" aria-label="Linked account profiles">
          {visibleChildren.map((child) => (
            <LinkedAccountAvatar
              key={child.id}
              child={child}
              href={`/family-circle/accounts/${child.id}`}
            />
          ))}
          <Link
            href="/family-circle/accounts"
            className="family-center__summary-avatar family-center__summary-avatar--more"
            aria-label={linkedCount > 0 ? "View all linked accounts" : "Go to linked accounts"}
            title="View linked accounts"
          >
            <span className="family-center__summary-avatar-inner family-center__summary-avatar-inner--more">
              +
            </span>
          </Link>
        </div>
      </div>
      <span className="family-center__summary-stat-label">Linked accounts</span>
      <span className="family-center__summary-stat-hint">{hint}</span>
    </div>
  );
}

export function ChildCard({ child }: { child: FamilyCenterChild }) {
  const zone = zoneLabelForAge(child.age);
  const controlHealth = buildControlHealthForChild(child);
  const safetyScore = computeChildSafetySecureScore(child, controlHealth.items);

  return (
    <li className="family-center__child">
      <div className="family-center__child-row">
        <Link
          href={`/family-circle/accounts/${child.id}`}
          className="family-center__child-main"
        >
          <span className="family-center__child-identity">
            <ChildSafetyScoreRing
              score={safetyScore.score}
              tone={safetyScore.tone}
              childName={child.fullName}
            />
            <span
              className="family-center__avatar"
              style={{ "--story-color": child.avatarColor } as CSSProperties}
              aria-hidden="true"
            >
              {child.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={child.avatarUrl} alt="" width={48} height={48} />
              ) : (
                child.avatarInitials
              )}
            </span>
          </span>
          <span className="family-center__child-copy">
            <span className="family-center__child-name">{child.fullName}</span>
            <span className="family-center__child-meta">
              {child.handleLabel}
              {child.age != null ? ` · ${child.age} years old` : ""}
              {zone ? ` · ${zone}` : ""}
            </span>
            <span className="family-center__child-details">
              <span className="family-center__protection">
                <ProtectionTierIcon tier={child.protectionLevel} />
                <span>{child.protectionLevelLabel} protection</span>
              </span>
              <span className="family-center__child-linked">· Linked {child.linkedAtDisplay}</span>
            </span>
          </span>
        </Link>
        <ChildCardDmAvatars childId={child.id} contacts={child.dmContacts} />
        <div className="family-center__child-aside">
          <span className="family-center__status-badge">{child.statusLabel}</span>
          <Link
            href={child.messagesHref}
            className="family-center__child-message"
            aria-label={`Message ${child.fullName}`}
            title={`Message ${child.fullName}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </Link>
        </div>
      </div>
    </li>
  );
}

type Extras = ReturnType<typeof staticDashboardExtras>;

export function AlertsPanel({
  alerts,
  showHead = true,
}: {
  alerts: Extras["alerts"];
  showHead?: boolean;
}) {
  if (alerts.length === 0) {
    return (
      <div className="family-center__empty family-center__empty--tab">
        <h2 className="family-center__empty-title">No safety alerts</h2>
        <p className="family-center__empty-copy">
          When a qualifying safety event occurs, you will see a safe summary here — not private message
          content.
        </p>
      </div>
    );
  }

  return (
    <section className="family-center__panel family-center__panel--flush" aria-labelledby="family-center-alerts">
      {showHead ? (
        <div className="family-center__panel-head">
          <h2 id="family-center-alerts" className="family-center__panel-title">
            Safety alerts
          </h2>
          <span className="family-center__panel-meta">Prototype preview</span>
        </div>
      ) : null}
      <ul className="family-center__alert-list">
        {alerts.map((alert) => (
          <li key={alert.id}>
            <article className="family-center__alert-card family-center__alert-card--high">
              <div className="family-center__alert-banner" role="status">
                <span className="family-center__alert-priority-icon" aria-hidden="true">
                  !
                </span>
                <span>{alert.priorityLabel}</span>
              </div>
              <div className="family-center__alert-body">
                <p className="family-center__alert-child">{alert.childName}</p>
                <p className="family-center__alert-category">{alert.category}</p>
                <p className="family-center__alert-action">{alert.actionTaken}</p>
                <div className="family-center__alert-meta">
                  <time>{alert.timeAgo}</time>
                  <span className="family-center__alert-status">{alert.status}</span>
                </div>
                <div className="family-center__safe-preview" aria-label="Safe preview placeholder">
                  <span className="family-center__safe-preview-blur" aria-hidden="true" />
                  <span className="family-center__safe-preview-label">Safe preview · blurred by default</span>
                </div>
                <div className="family-center__alert-actions">
                  <button type="button" className="btn btn--outline-brand btn--sm" disabled>
                    Acknowledge
                  </button>
                  <button type="button" className="btn btn--ghost btn--sm" disabled>
                    View guidance
                  </button>
                </div>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function RequestsPanel({
  requests,
  showHead = true,
}: {
  requests: Extras["requests"];
  showHead?: boolean;
}) {
  if (requests.length === 0) {
    return (
      <div className="family-center__empty family-center__empty--tab">
        <h2 className="family-center__empty-title">No pending requests</h2>
        <p className="family-center__empty-copy">
          When a linked account asks to change a guardian-managed setting, it will appear here for your review.
        </p>
      </div>
    );
  }

  return (
    <section className="family-center__panel family-center__panel--flush" aria-labelledby="family-center-requests">
      {showHead ? (
        <div className="family-center__panel-head">
          <h2 id="family-center-requests" className="family-center__panel-title">
            Control requests
          </h2>
          <span className="family-center__panel-meta">Prototype preview</span>
        </div>
      ) : null}
      <ul className="family-center__request-list">
        {requests.map((request) => (
          <li key={request.id}>
            <article className="family-center__request-card">
              <p className="family-center__request-child">{request.childName}</p>
              <p className="family-center__request-setting">
                Requested change: <strong>{request.setting}</strong>
              </p>
              <p className="family-center__request-detail">{request.detail}</p>
              <p className="family-center__request-meta">Submitted {request.submittedAgo}</p>
              <div className="family-center__request-actions">
                <button type="button" className="btn btn--outline-brand btn--sm" disabled>
                  Review
                </button>
                <button type="button" className="btn btn--ghost btn--sm" disabled>
                  Decline
                </button>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ControlsHealthPanel({
  controlHealth,
  showHead = true,
}: {
  controlHealth: Extras["controlHealth"];
  showHead?: boolean;
}) {
  if (controlHealth.length === 0) {
    return (
      <div className="family-center__empty family-center__empty--tab">
        <h2 className="family-center__empty-title">No controls to review</h2>
        <p className="family-center__empty-copy">
          Link a minor account to see recommended safety defaults and control health.
        </p>
      </div>
    );
  }

  return (
    <section className="family-center__panel family-center__panel--flush" aria-labelledby="family-center-controls">
      {showHead ? (
        <div className="family-center__panel-head">
          <h2 id="family-center-controls" className="family-center__panel-title">
            Controls health
          </h2>
          <span className="family-center__panel-meta">Recommended defaults</span>
        </div>
      ) : null}
      <div className="family-center__health-grid">
        {controlHealth.map((entry) => (
          <article key={entry.childId} className="family-center__health-card">
            <header className="family-center__health-head">
              <h3 className="family-center__health-name">{entry.childName}</h3>
              <p className="family-center__health-zone">
                {entry.zone ?? "Zone pending"}
                {entry.tier ? ` · ${entry.tier} protection` : ""}
              </p>
            </header>
            <ul className="family-center__health-list">
              {entry.items.map((item) => (
                <li
                  key={item.label}
                  className={`family-center__health-row family-center__health-row--${item.status}`}
                >
                  <span className="family-center__health-row-label">
                    <ControlHealthInfoIcon label={item.label} info={item.info} />
                    {item.label}
                  </span>
                  <span className="family-center__health-row-value">{item.value}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

export function LinkedAccountsPanel({ linkedChildren }: { linkedChildren: FamilyCenterChild[] }) {
  if (linkedChildren.length === 0) {
    return (
      <div className="family-center__empty family-center__empty--tab" aria-labelledby="family-center-empty">
        <h2 id="family-center-empty" className="family-center__empty-title">
          No linked children yet
        </h2>
        <p className="family-center__empty-copy">
          When you approve a minor&apos;s signup request, their account will appear here with protection status
          and safety activity.
        </p>
      </div>
    );
  }

  return (
    <ul className="family-center__list" aria-label="Linked children">
      {linkedChildren.map((child) => (
        <ChildCard key={child.id} child={child} />
      ))}
    </ul>
  );
}

export function FamilyCenterPrivacyNote() {
  return (
    <p className="family-center__privacy-note">
      You see safety events and control outcomes for linked accounts — not private message content.
    </p>
  );
}

export function useFamilyCenterExtras(data: FamilyCenterData) {
  return staticDashboardExtras(data.children);
}

export function FamilyCenterOverview({ data }: { data: FamilyCenterData }) {
  const extras = staticDashboardExtras(data.children);
  const linkedCount = data.children.length;
  const controlsSummary =
    linkedCount > 0 ? `${extras.controlsHealthyCount} of ${extras.controlsTotal}` : "—";
  const guardianFirstName = data.guardianName?.split(/\s+/)[0];

  return (
    <section className="family-portal-panel" aria-labelledby="family-overview-title">
      <div className="family-portal-panel__head">
        <h1 className="family-portal-panel__title" id="family-overview-title">
          Overview
        </h1>
        <p className="family-portal-panel__subtitle">
          {guardianFirstName ? `Welcome back, ${guardianFirstName}. ` : ""}
          Protection status, safety alerts, and control requests at a glance.
        </p>
      </div>

      <section className="family-center__summary" aria-labelledby="family-center-summary">
        <h2 id="family-center-summary" className="family-center__summary-title">
          Dashboard summary
        </h2>
        <div className="family-center__summary-grid">
          <LinkedAccountsSummaryStat linkedChildren={data.children} />
          <SummaryStat
            label="Unresolved alerts"
            value={extras.unresolvedAlerts}
            hint="Safety events needing review"
            tone={extras.unresolvedAlerts > 0 ? "warn" : "default"}
          />
          <SummaryStat
            label="Pending requests"
            value={extras.pendingRequests}
            hint="Setting changes to review"
            tone={extras.pendingRequests > 0 ? "accent" : "default"}
          />
          <SummaryStat
            label="Controls health"
            value={controlsSummary}
            hint={linkedCount > 0 ? "Accounts using recommended defaults" : "No linked accounts"}
          />
        </div>
      </section>

      {extras.alerts.length > 0 ? (
        <section className="family-center__panel" aria-labelledby="family-center-overview-alerts">
          <div className="family-center__panel-head">
            <h2 id="family-center-overview-alerts" className="family-center__panel-title">
              Recent safety alerts
            </h2>
            <Link href="/family-circle/alerts" className="family-center__panel-link">
              View all
            </Link>
          </div>
          <AlertsPanel alerts={extras.alerts.slice(0, 1)} showHead={false} />
        </section>
      ) : null}

      {extras.requests.length > 0 ? (
        <section className="family-center__panel" aria-labelledby="family-center-overview-requests">
          <div className="family-center__panel-head">
            <h2 id="family-center-overview-requests" className="family-center__panel-title">
              Recent requests
            </h2>
            <Link href="/family-circle/requests" className="family-center__panel-link">
              View all
            </Link>
          </div>
          <RequestsPanel requests={extras.requests.slice(0, 1)} showHead={false} />
        </section>
      ) : null}

      <FamilyCenterPrivacyNote />
    </section>
  );
}

export function FamilyCenterAccountsPage({ data }: { data: FamilyCenterData }) {
  return (
    <section className="family-portal-panel" aria-labelledby="family-accounts-title">
      <div className="family-portal-panel__head">
        <h1 className="family-portal-panel__title" id="family-accounts-title">
          Linked accounts
        </h1>
        <p className="family-portal-panel__subtitle">
          Minor accounts you have approved and linked to your guardian profile.
        </p>
      </div>
      <LinkedAccountsPanel linkedChildren={data.children} />
      <FamilyCenterPrivacyNote />
    </section>
  );
}

export function FamilyCenterControlsPage({ data }: { data: FamilyCenterData }) {
  const extras = staticDashboardExtras(data.children);
  return (
    <section className="family-portal-panel" aria-labelledby="family-controls-title">
      <div className="family-portal-panel__head">
        <h1 className="family-portal-panel__title" id="family-controls-title">
          Controls
        </h1>
        <p className="family-portal-panel__subtitle">
          Recommended safety defaults and current settings for each linked account.
        </p>
      </div>
      <ControlsHealthPanel controlHealth={extras.controlHealth} showHead={false} />
      <FamilyCenterPrivacyNote />
    </section>
  );
}

export function FamilyCenterAlertsPage({ data }: { data: FamilyCenterData }) {
  const extras = staticDashboardExtras(data.children);
  return (
    <section className="family-portal-panel" aria-labelledby="family-alerts-title">
      <div className="family-portal-panel__head">
        <h1 className="family-portal-panel__title" id="family-alerts-title">
          Safety alerts
        </h1>
        <p className="family-portal-panel__subtitle">
          High-signal safety events with safe previews and next-step actions.
        </p>
      </div>
      <AlertsPanel alerts={extras.alerts} showHead={false} />
      <FamilyCenterPrivacyNote />
    </section>
  );
}

export function FamilyCenterRequestsPage({ data }: { data: FamilyCenterData }) {
  const extras = staticDashboardExtras(data.children);
  return (
    <section className="family-portal-panel" aria-labelledby="family-requests-title">
      <div className="family-portal-panel__head">
        <h1 className="family-portal-panel__title" id="family-requests-title">
          Control requests
        </h1>
        <p className="family-portal-panel__subtitle">
          Setting changes requested by linked accounts awaiting your review.
        </p>
      </div>
      <RequestsPanel requests={extras.requests} showHead={false} />
      <FamilyCenterPrivacyNote />
    </section>
  );
}

export function FamilyCenterActivityPage({ data }: { data: FamilyCenterData }) {
  const items = staticFamilyActivityHistory(data.children);

  return (
    <section className="family-portal-panel" aria-labelledby="family-activity-title">
      <div className="family-portal-panel__head">
        <h1 className="family-portal-panel__title" id="family-activity-title">
          Activity
        </h1>
        <p className="family-portal-panel__subtitle">
          Complete family activity history across linked accounts — alerts, requests, controls, and account events.
        </p>
      </div>
      <FamilyActivityLog items={items} />
      <FamilyCenterPrivacyNote />
    </section>
  );
}
