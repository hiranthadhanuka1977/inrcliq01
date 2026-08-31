"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import LeftNav from "@/components/feed/LeftNav";
import MobileNav from "@/components/feed/MobileNav";
import ProtectionTierIcon from "@/components/guardian/ProtectionTierIcon";
import { ChildCardDmAvatars } from "@/components/guardian/family-center/ChildCardDmAvatars";
import type { FamilyCenterChild, FamilyCenterData } from "@/lib/guardian/family-center";

type FamilyCenterTab = "overview" | "accounts" | "controls" | "alerts" | "requests";

/** Private zone label for guardian overview only (spec §3). */
function zoneLabelForAge(age: number | null): string | null {
  if (age == null) return null;
  if (age >= 8 && age <= 12) return "Kids Zone";
  if (age >= 13 && age <= 15) return "Teens Zone";
  if (age >= 16 && age <= 17) return "Mature Teens Zone";
  return null;
}

const TAB_META: Record<FamilyCenterTab, { label: string; title: string; subtitle: string }> = {
  overview: {
    label: "Overview",
    title: "Overview",
    subtitle: "Protection status, safety alerts, and control requests at a glance.",
  },
  accounts: {
    label: "Linked accounts",
    title: "Linked accounts",
    subtitle: "Minor accounts you have approved and linked to your guardian profile.",
  },
  controls: {
    label: "Controls",
    title: "Controls",
    subtitle: "Recommended safety defaults and current settings for each linked account.",
  },
  alerts: {
    label: "Safety alerts",
    title: "Safety alerts",
    subtitle: "High-signal safety events with safe previews and next-step actions.",
  },
  requests: {
    label: "Requests",
    title: "Control requests",
    subtitle: "Setting changes requested by linked accounts awaiting your review.",
  },
};

const TAB_ORDER: FamilyCenterTab[] = ["overview", "accounts", "controls", "alerts", "requests"];

/** Static prototype content — not wired to backend yet. */
function staticDashboardExtras(children: FamilyCenterChild[]) {
  const primaryChild = children[0];
  const childName = primaryChild?.firstName ?? "your child";

  return {
    unresolvedAlerts: children.length > 0 ? 1 : 0,
    pendingRequests: children.length > 0 ? 1 : 0,
    controlsHealthyCount: children.length,
    controlsTotal: children.length,
    alerts: children.length > 0
      ? [
          {
            id: "alert-demo-1",
            priority: "high" as const,
            priorityLabel: "High priority",
            childName: primaryChild?.fullName ?? "Linked account",
            category: "Wellbeing safety concern",
            actionTaken: "Content was not shared and is under review.",
            timeAgo: "2h ago",
            status: "Awaiting acknowledgement",
          },
        ]
      : [],
    requests: children.length > 0
      ? [
          {
            id: "req-demo-1",
            childName: primaryChild?.fullName ?? "Linked account",
            setting: "Direct messaging",
            detail: `${childName} asked to allow DMs from approved contacts.`,
            submittedAgo: "Yesterday",
          },
        ]
      : [],
    controlHealth: children.map((child) => ({
      childId: child.id,
      childName: child.firstName,
      zone: zoneLabelForAge(child.age),
      tier: child.protectionLevelLabel,
      items: [
        { label: "Discoverability", value: "Private", status: "ok" as const },
        { label: "Direct messaging", value: child.protectionLevel === "strict" ? "Off" : "Restricted", status: "ok" as const },
        { label: "Safety alerts", value: "On", status: "ok" as const },
        {
          label: "Location sharing",
          value: "Off",
          status: child.protectionLevel === "relaxed" ? ("watch" as const) : ("ok" as const),
        },
      ],
    })),
  };
}

function SummaryStat({
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

function ChildCard({ child }: { child: FamilyCenterChild }) {
  const zone = zoneLabelForAge(child.age);

  const avatar = (
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
  );

  return (
    <li className="family-center__child">
      <div className="family-center__child-row">
        <Link href={`/family-circle/accounts/${child.id}`} className="family-center__child-main">
          {avatar}
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

function AlertsPanel({
  alerts,
  showHead = true,
}: {
  alerts: ReturnType<typeof staticDashboardExtras>["alerts"];
  showHead?: boolean;
}) {
  if (alerts.length === 0) {
    return (
      <div className="family-center__empty family-center__empty--tab">
        <h2 className="family-center__empty-title">No safety alerts</h2>
        <p className="family-center__empty-copy">
          When a qualifying safety event occurs, you will see a safe summary here — not private message content.
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

function RequestsPanel({
  requests,
  showHead = true,
}: {
  requests: ReturnType<typeof staticDashboardExtras>["requests"];
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

function ControlsHealthPanel({
  controlHealth,
  showHead = true,
}: {
  controlHealth: ReturnType<typeof staticDashboardExtras>["controlHealth"];
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
                  <span className="family-center__health-row-label">{item.label}</span>
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

function LinkedAccountsPanel({ linkedChildren }: { linkedChildren: FamilyCenterChild[] }) {
  if (linkedChildren.length === 0) {
    return (
      <div className="family-center__empty family-center__empty--tab" aria-labelledby="family-center-empty">
        <h2 id="family-center-empty" className="family-center__empty-title">
          No linked children yet
        </h2>
        <p className="family-center__empty-copy">
          When you approve a minor&apos;s signup request, their account will appear here with protection status and
          safety activity.
        </p>
      </div>
    );
  }

  return (
    <section className="family-center__panel family-center__panel--flush" aria-labelledby="family-center-accounts">
      <ul className="family-center__list" aria-label="Linked children">
        {linkedChildren.map((child) => (
          <ChildCard key={child.id} child={child} />
        ))}
      </ul>
    </section>
  );
}

export default function FamilyCenterView({
  data,
  firstName,
}: {
  data: FamilyCenterData;
  firstName: string | null;
}) {
  const [activeTab, setActiveTab] = useState<FamilyCenterTab>("overview");
  const extras = staticDashboardExtras(data.children);
  const linkedCount = data.children.length;
  const controlsSummary =
    linkedCount > 0 ? `${extras.controlsHealthyCount} of ${extras.controlsTotal}` : "—";
  const tabMeta = TAB_META[activeTab];
  const guardianFirstName = data.guardianName?.split(/\s+/)[0];

  function navBadge(tab: FamilyCenterTab) {
    if (tab === "alerts" && extras.unresolvedAlerts > 0) {
      return extras.unresolvedAlerts;
    }
    if (tab === "requests" && extras.pendingRequests > 0) {
      return extras.pendingRequests;
    }
    if (tab === "accounts" && linkedCount > 0) {
      return linkedCount;
    }
    return null;
  }

  return (
    <div className="app-shell">
      <LeftNav firstName={firstName} />
      <main className="main-content family-center" id="main">
        <div className="family-center__card">
          <header className="family-center__header">
            <p className="family-center__eyebrow">Family Circle</p>
            <h1 className="family-center__title">{tabMeta.title}</h1>
            <p className="family-center__subtitle">
              {activeTab === "overview" && guardianFirstName ? `Welcome back, ${guardianFirstName}. ` : ""}
              {tabMeta.subtitle}
            </p>
          </header>

          <nav className="family-center__nav" aria-label="Family Circle sections">
            {TAB_ORDER.map((tab) => {
              const badge = navBadge(tab);
              return (
                <button
                  key={tab}
                  type="button"
                  className={`family-center__nav-item${activeTab === tab ? " is-active" : ""}`}
                  aria-current={activeTab === tab ? "page" : undefined}
                  onClick={() => setActiveTab(tab)}
                >
                  {TAB_META[tab].label}
                  {badge != null ? (
                    <span className="family-center__nav-badge" aria-hidden="true">
                      {badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>

          <div className="family-center__tab-panel">
            {activeTab === "overview" ? (
              <>
                <section className="family-center__summary" aria-labelledby="family-center-summary">
                  <h2 id="family-center-summary" className="family-center__summary-title">
                    Dashboard summary
                  </h2>
                  <div className="family-center__summary-grid">
                    <SummaryStat
                      label="Linked accounts"
                      value={linkedCount}
                      hint={linkedCount === 1 ? "1 minor connected" : linkedCount > 1 ? "Minors connected" : "None yet"}
                    />
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
                      <button
                        type="button"
                        className="family-center__panel-link"
                        onClick={() => setActiveTab("alerts")}
                      >
                        View all
                      </button>
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
                      <button
                        type="button"
                        className="family-center__panel-link"
                        onClick={() => setActiveTab("requests")}
                      >
                        View all
                      </button>
                    </div>
                    <RequestsPanel requests={extras.requests.slice(0, 1)} showHead={false} />
                  </section>
                ) : null}
              </>
            ) : null}

            {activeTab === "accounts" ? <LinkedAccountsPanel linkedChildren={data.children} /> : null}
            {activeTab === "controls" ? <ControlsHealthPanel controlHealth={extras.controlHealth} /> : null}
            {activeTab === "alerts" ? <AlertsPanel alerts={extras.alerts} /> : null}
            {activeTab === "requests" ? <RequestsPanel requests={extras.requests} /> : null}
          </div>

          <p className="family-center__privacy-note">
            You see safety events and control outcomes for linked accounts — not private message content.
          </p>

          <div className="family-center__actions">
            <Link href="/feed/me" className="btn btn--secondary">
              Back to profile
            </Link>
            <Link href="/feed" className="btn btn--secondary">
              Back to feed
            </Link>
          </div>
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
