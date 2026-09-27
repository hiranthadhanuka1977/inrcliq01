"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import ProtectionTierIcon from "@/components/guardian/ProtectionTierIcon";
import { ControlHealthInfoIcon } from "@/components/guardian/family-center/ControlHealthInfoIcon";
import { ChildCardDmAvatars } from "@/components/guardian/family-center/ChildCardDmAvatars";
import { ChildSafetyScoreRing } from "@/components/guardian/family-center/ChildSafetyScoreRing";
import AgeZoneBadge from "@/components/guardian/family-center/AgeZoneBadge";
import { FamilyActivityLog } from "@/components/guardian/family-center/FamilyActivityLog";
import { SafeContactCircle } from "@/components/guardian/family-center/SafeContactCircle";
import SafetyAlertAcknowledgeButton from "@/components/guardian/family-center/SafetyAlertAcknowledgeButton";
import SafetyAlertContentViewer from "@/components/guardian/family-center/SafetyAlertContentViewer";
import SafetyAlertDecisionActions, {
  SafetyAlertBlockButton,
} from "@/components/guardian/family-center/SafetyAlertDecisionActions";
import SafetyAlertReportDialog from "@/components/guardian/family-center/SafetyAlertReportDialog";
import type { FamilyCenterChild, FamilyCenterData } from "@/lib/guardian/family-center";
import {
  buildControlHealthForChild,
  buildFamilyActivityHistory,
  filterFamilyActivityForChild,
  staticDashboardExtras,
  type FamilyActivityItem,
} from "@/lib/guardian/family-center-static";
import { computeChildSafetySecureScore } from "@/lib/guardian/safety-score";
import type { FamilySafetyAlertCard } from "@/lib/guardian/safety-alerts";
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
  const controlHealth = buildControlHealthForChild(child);
  const safetyScore = computeChildSafetySecureScore(child, controlHealth.items);

  return (
    <li className="family-center__child">
      <div className="family-center__child-row">
        <ChildSafetyScoreRing
          score={safetyScore.score}
          tone={safetyScore.tone}
          childName={child.fullName}
          protectionLabel={child.protectionLevelLabel}
          controlItems={controlHealth.items}
        />
        <Link
          href={`/family-circle/accounts/${child.id}`}
          className="family-center__child-main"
        >
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
          <span className="family-center__child-copy">
            <span className="family-center__child-name">{child.fullName}</span>
            <span className="family-center__child-meta">
              <span className="family-center__child-handle">{child.handleLabel}</span>
              {child.ageZoneIconBadgeKey && child.ageZoneLabel ? (
                <AgeZoneBadge
                  iconBadgeKey={child.ageZoneIconBadgeKey}
                  zone={child.ageZone}
                  zoneLabel={child.ageZoneLabel}
                  age={child.age}
                  description={child.ageZoneIntro}
                />
              ) : null}
            </span>
            <span className="family-center__child-details">
              <span
                className={`family-center__detail-chip family-center__detail-chip--protection family-center__detail-chip--${child.protectionLevel ?? "unset"}`}
              >
                <ProtectionTierIcon tier={child.protectionLevel} />
                <span>{child.protectionLevelLabel} protection</span>
              </span>
              <span className="family-center__detail-chip family-center__detail-chip--linked">
                <svg
                  className="family-center__detail-chip-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span>Linked {child.linkedAtDisplay}</span>
              </span>
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

function SafetyAlertCardView({ alert }: { alert: FamilySafetyAlertCard }) {
  const awaitingDecision = alert.statusCode === "AWAITING_DECISION";
  const awaitingAck = alert.statusCode === "AWAITING_ACKNOWLEDGEMENT";
  const resolved = !awaitingDecision && !awaitingAck;
  const counterpartName = alert.counterpart?.name ?? "this contact";
  const showBlockAndReport = Boolean(alert.counterpart) && (awaitingDecision || resolved);

  return (
    <article
      className={`family-center__alert-card${alert.priority === "high" && !resolved ? " family-center__alert-card--high" : ""}${awaitingDecision ? " family-center__alert-card--decision" : ""}${resolved ? " family-center__alert-card--resolved" : ""}`}
    >
      <div className="family-center__alert-banner" role="status">
        <span className="family-center__alert-priority-icon" aria-hidden="true">
          !
        </span>
        <span>{alert.priorityLabel}</span>
        <span className="family-center__alert-channel">{alert.channel}</span>
      </div>
      <div className="family-center__alert-body">
        <div className="family-center__alert-people">
          <p className="family-center__alert-child">
            {alert.childName}
            {alert.childBadge ? (
              <AgeZoneBadge
                iconBadgeKey={alert.childBadge.iconBadgeKey}
                zone={alert.childBadge.zone}
                zoneLabel={alert.childBadge.zoneLabel}
                age={alert.childBadge.age}
                description={alert.childBadge.description}
              />
            ) : null}
          </p>
          {alert.counterpart ? (
            <p className="family-center__alert-counterpart">
              <span className="family-center__alert-counterpart-label">From</span>
              <span className="family-center__alert-counterpart-name">{alert.counterpart.name}</span>
              {alert.counterpart.handle ? (
                <span className="family-center__alert-counterpart-handle">{alert.counterpart.handle}</span>
              ) : null}
              {alert.counterpart.isAdult ? (
                <span className="family-center__alert-adult-badge">Adult account</span>
              ) : null}
            </p>
          ) : null}
        </div>
        <p className="family-center__alert-category">{alert.category}</p>
        {alert.bodyLine ? <p className="family-center__alert-line">{alert.bodyLine}</p> : null}
        <p className="family-center__alert-action">{alert.actionTaken}</p>
        <div className="family-center__alert-meta">
          <time>{alert.timeAgo}</time>
          <span
            className={`family-center__alert-status family-center__alert-status--${alert.statusCode.toLowerCase()}`}
          >
            {alert.status}
          </span>
        </div>
        {alert.kind === "informational" ? (
          <div className="family-center__safe-preview" aria-label="Safe preview">
            <span className="family-center__safe-preview-blur" aria-hidden="true" />
            <span className="family-center__safe-preview-label">
              Safe preview · message content is not shown
            </span>
          </div>
        ) : null}
        <div className="family-center__alert-actions">
          {alert.kind === "decision" && alert.contentAvailable ? (
            <SafetyAlertContentViewer alertId={alert.id} />
          ) : null}
          {awaitingDecision && alert.canDecide ? (
            <SafetyAlertDecisionActions
              alertId={alert.id}
              childFirstName={alert.childFirstName}
              counterpartName={counterpartName}
              recipientZone={alert.recipientZone}
            />
          ) : null}
          {awaitingAck ? <SafetyAlertAcknowledgeButton alertId={alert.id} /> : null}
          {showBlockAndReport && alert.canBlock ? (
            <SafetyAlertBlockButton
              alertId={alert.id}
              counterpartName={counterpartName}
              childFirstName={alert.childFirstName}
              blocked={alert.counterpartBlocked}
            />
          ) : null}
          {showBlockAndReport ? (
            <SafetyAlertReportDialog alertId={alert.id} counterpartName={counterpartName} />
          ) : null}
          {alert.reviewSettingsHref ? (
            <Link href={alert.reviewSettingsHref} className="btn btn--ghost btn--sm">
              Review DM settings
            </Link>
          ) : null}
          {!resolved && alert.messageChildHref ? (
            <Link href={alert.messageChildHref} className="btn btn--ghost btn--sm">
              Message {alert.childFirstName}
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function AlertsPanel({
  alerts,
  showHead = true,
}: {
  alerts: FamilySafetyAlertCard[];
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
        </div>
      ) : null}
      <ul className="family-center__alert-list">
        {alerts.map((alert) => (
          <li key={alert.id}>
            <SafetyAlertCardView alert={alert} />
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
      You see safety events and control outcomes for linked accounts — not private conversations. Flagged
      messages are only shown if you choose to view them, with explicit words and contact details partly hidden.
    </p>
  );
}

export function useFamilyCenterExtras(data: FamilyCenterData, extras?: Extras) {
  return extras ?? staticDashboardExtras(data.children);
}

export function FamilyCenterOverview({
  data,
  extras: extrasProp,
}: {
  data: FamilyCenterData;
  extras?: Extras;
}) {
  const extras = extrasProp ?? staticDashboardExtras(data.children);
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
          {guardianFirstName
            ? `Welcome back, ${guardianFirstName}. Look after your linked family’s safety here.`
            : "Look after your linked family’s safety here."}
        </p>
      </div>

      <section className="family-center__summary" aria-labelledby="family-center-summary">
        <h2 id="family-center-summary" className="family-center__summary-title">
          Summary
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
            hint="Control changes awaiting review"
            tone={extras.pendingRequests > 0 ? "accent" : "default"}
          />
          <SummaryStat
            label="Controls healthy"
            value={controlsSummary}
            hint="Linked accounts with recommended defaults"
          />
        </div>
      </section>

      {extras.alerts.length > 0 ? (
        <section className="family-center__panel" aria-labelledby="family-overview-alerts">
          <div className="family-center__panel-head">
            <h2 id="family-overview-alerts" className="family-center__panel-title">
              Recent safety alerts
            </h2>
            <Link href="/family-circle/alerts" className="family-center__panel-link">
              View all
            </Link>
          </div>
          <AlertsPanel alerts={extras.alerts.slice(0, 1)} showHead={false} />
        </section>
      ) : null}

      <SafeContactCircle
        linkedChildren={data.children}
        guardian={data.guardian}
        contactTrustBandsByChild={data.contactTrustBandsByChild}
      />

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

export function FamilyCenterAlertsPage({
  data,
  extras: extrasProp,
}: {
  data: FamilyCenterData;
  extras?: Extras;
}) {
  const extras = extrasProp ?? staticDashboardExtras(data.children);
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

export function FamilyCenterActivityPage({
  data,
  childId,
  activityItems,
}: {
  data: FamilyCenterData;
  childId?: string;
  /** When provided (server-loaded), includes live DM safety alerts. */
  activityItems?: FamilyActivityItem[];
}) {
  const allItems =
    activityItems ?? buildFamilyActivityHistory(data.children, []);
  const filteredChild = childId ? data.children.find((child) => child.id === childId) : null;
  const items =
    filteredChild != null ? filterFamilyActivityForChild(allItems, filteredChild.id) : allItems;

  return (
    <section className="family-portal-panel" aria-labelledby="family-activity-title">
      <div className="family-portal-panel__head">
        {filteredChild ? (
          <Link href={`/family-circle/accounts/${filteredChild.id}`} className="family-portal-panel__back">
            ← {filteredChild.firstName}&apos;s account
          </Link>
        ) : null}
        <h1 className="family-portal-panel__title" id="family-activity-title">
          {filteredChild ? `Activity · ${filteredChild.fullName}` : "Activity"}
        </h1>
        <p className="family-portal-panel__subtitle">
          {filteredChild
            ? `Safety events, control changes, and account updates for ${filteredChild.firstName}.`
            : "Complete family activity history across linked accounts — alerts, requests, controls, and account events."}
        </p>
        {filteredChild ? (
          <Link href="/family-circle/activity" className="family-portal-panel__filter-clear">
            View all family activity
          </Link>
        ) : null}
      </div>
      <FamilyActivityLog items={items} showChildName={!filteredChild} />
      <FamilyCenterPrivacyNote />
    </section>
  );
}
