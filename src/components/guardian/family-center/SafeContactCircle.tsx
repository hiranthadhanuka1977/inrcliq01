"use client";

import Link from "next/link";
import { useId, useMemo, useState, type CSSProperties } from "react";
import type { FamilyCenterChild, FamilyCenterGuardian } from "@/lib/guardian/family-center";
import {
  buildSafeContactCircleContacts,
  CONTACT_TRUST_BANDS,
  defaultSafeCircleChildId,
  type ContactTrustBandId,
  type SafeCircleContact,
} from "@/lib/guardian/family-center-static";
import { dmContactSafetyStatus } from "@/lib/guardian/dm-contact-safety";
import {
  computeChildTrustSafetySummary,
  computeSafeCircleContactTrustSummary,
  pickDangerContactIdForChild,
  safetyScoreToneLabel,
  toChildDangerTrustSummary,
  toDangerTrustSummary,
  type TrustSafetyScoreSummary,
} from "@/lib/guardian/safety-score";

/** Mid-radius of each band as % of half-viewbox (outer rings farther apart for clarity). */
const BAND_RADIUS: Record<ContactTrustBandId, number> = {
  immediate_family: 34,
  relatives: 52,
  school_friends: 70,
  approved_wider: 88,
};

const BAND_INNER: Record<ContactTrustBandId, number> = {
  immediate_family: 22,
  relatives: 42,
  school_friends: 60,
  approved_wider: 78,
};

const BAND_OUTER: Record<ContactTrustBandId, number> = {
  immediate_family: 42,
  relatives: 60,
  school_friends: 78,
  approved_wider: 96,
};

const BAND_ANGLE_OFFSET: Record<ContactTrustBandId, number> = {
  immediate_family: -0.2,
  relatives: 0.35,
  school_friends: -0.55,
  approved_wider: 0.15,
};

const VIEWBOX = 200;
const CENTER = VIEWBOX / 2;

function pctToPx(percent: number) {
  return (percent / 100) * (VIEWBOX / 2);
}

function polarPosition(radiusPercent: number, index: number, total: number, offsetRad: number) {
  const count = Math.max(total, 1);
  const angle = -Math.PI / 2 + offsetRad + (index * (2 * Math.PI)) / count;
  const r = pctToPx(radiusPercent);
  return {
    x: CENTER + r * Math.cos(angle),
    y: CENTER + r * Math.sin(angle),
  };
}

function annulusPath(innerPct: number, outerPct: number) {
  const inner = pctToPx(innerPct);
  const outer = pctToPx(outerPct);
  // Even-odd doughnut: outer circle clockwise + inner circle counter-clockwise
  return [
    `M ${CENTER - outer} ${CENTER}`,
    `a ${outer} ${outer} 0 1 0 ${outer * 2} 0`,
    `a ${outer} ${outer} 0 1 0 ${-outer * 2} 0`,
    `M ${CENTER - inner} ${CENTER}`,
    `a ${inner} ${inner} 0 1 1 ${inner * 2} 0`,
    `a ${inner} ${inner} 0 1 1 ${-inner * 2} 0`,
  ].join(" ");
}

function shortName(name: string) {
  const first = name.trim().split(/\s+/)[0];
  return first || name;
}

function ScoreWarningBadge({
  compact = false,
  level = "watch",
}: {
  compact?: boolean;
  level?: "watch" | "danger";
}) {
  const isDanger = level === "danger";
  return (
    <span
      className={`safe-circle__warn-badge${compact ? " safe-circle__warn-badge--compact" : ""}${
        isDanger ? " safe-circle__warn-badge--danger" : ""
      }`}
      aria-hidden="true"
      title={isDanger ? "Danger — needs review" : "Attention needed"}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 2.5 1.5 20.5a1.25 1.25 0 0 0 1.1 1.85h18.8a1.25 1.25 0 0 0 1.1-1.85L12 2.5z"
        />
        <path
          fill={isDanger ? "#ffffff" : "#141720"}
          d="M12 8.2a1 1 0 0 1 1 1v4.2a1 1 0 1 1-2 0V9.2a1 1 0 0 1 1-1zm0 8.1a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3z"
        />
      </svg>
    </span>
  );
}

function TrustSafetyPopover({
  personName,
  summary,
  popoverId,
}: {
  personName: string;
  summary: TrustSafetyScoreSummary;
  popoverId: string;
}) {
  const toneLabel = safetyScoreToneLabel(summary.tone);
  const clampedScore = Math.max(0, Math.min(100, summary.score));

  return (
    <div id={popoverId} className="safe-circle__trust-popover" role="tooltip">
      <div className="safe-circle__trust-popover-head">
        <strong>Trust and safety score</strong>
        <span className={`safe-circle__trust-popover-badge safe-circle__trust-popover-badge--${summary.tone}`}>
          {toneLabel}
        </span>
      </div>
      <p className="safe-circle__trust-popover-person">{personName}</p>
      <p className="safe-circle__trust-popover-score">
        <span className="safe-circle__trust-popover-value">{clampedScore}</span>
        <span className="safe-circle__trust-popover-max">/ 100</span>
      </p>
      <p className="safe-circle__trust-popover-copy">{summary.copy}</p>
      <ul className="safe-circle__trust-popover-list">
        {summary.items.map((item) => (
          <li
            key={item.label}
            className={`safe-circle__trust-popover-item safe-circle__trust-popover-item--${item.status}`}
          >
            <span className="safe-circle__trust-popover-item-label">{item.label}</span>
            <span className="safe-circle__trust-popover-item-value">{item.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ContactAvatar({
  contact,
  highlighted,
  dimmed,
  trustSummary,
}: {
  contact: SafeCircleContact;
  highlighted: boolean;
  dimmed: boolean;
  trustSummary: TrustSafetyScoreSummary;
}) {
  const popoverId = useId();
  const attention =
    contact.kind === "dm" && dmContactSafetyStatus(contact.id) === "attention";
  const isDanger = trustSummary.tone === "danger";
  const needsWarning =
    isDanger || trustSummary.tone === "watch" || trustSummary.score < 80 || attention;
  const statusLabel = isDanger
    ? "Danger — needs review"
    : needsWarning
      ? "Attention needed"
      : "All clear";
  const bandMeta = CONTACT_TRUST_BANDS.find((band) => band.id === contact.band);
  const title = `${contact.name} · ${bandMeta?.label ?? "Contact"} · Trust and safety ${trustSummary.score}/100 · ${statusLabel}`;

  const className = [
    "safe-circle__avatar",
    highlighted ? "safe-circle__avatar--highlight" : "",
    isDanger ? "safe-circle__avatar--danger" : needsWarning ? "safe-circle__avatar--attention" : "",
    dimmed ? "is-dimmed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const body = (
    <>
      <span className="safe-circle__avatar-shell">
        <span
          className={className}
          style={{ "--story-color": contact.avatarColor } as CSSProperties}
        >
          {contact.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={contact.avatarUrl} alt="" width={40} height={40} />
          ) : (
            contact.avatarInitials
          )}
        </span>
        {needsWarning ? <ScoreWarningBadge compact level={isDanger ? "danger" : "watch"} /> : null}
      </span>
      <span className="safe-circle__node-name">{shortName(contact.name)}</span>
      <TrustSafetyPopover personName={contact.name} summary={trustSummary} popoverId={popoverId} />
    </>
  );

  if (!contact.href) {
    return (
      <span
        className="safe-circle__avatar-wrap"
        aria-label={title}
        aria-describedby={popoverId}
        tabIndex={0}
      >
        {body}
      </span>
    );
  }

  return (
    <Link
      href={contact.href}
      className="safe-circle__avatar-wrap"
      aria-label={title}
      aria-describedby={popoverId}
    >
      {body}
    </Link>
  );
}

export function SafeContactCircle({
  linkedChildren,
  guardian,
}: {
  linkedChildren: FamilyCenterChild[];
  guardian: FamilyCenterGuardian;
}) {
  const corePopoverId = useId();
  const initialId = defaultSafeCircleChildId(linkedChildren);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(initialId);
  const [activeBand, setActiveBand] = useState<ContactTrustBandId | null>(null);

  const selectedChild =
    linkedChildren.find((child) => child.id === selectedChildId) ?? linkedChildren[0] ?? null;

  const contacts = useMemo(() => {
    if (!selectedChild) return [] as SafeCircleContact[];
    return buildSafeContactCircleContacts({
      child: selectedChild,
      siblings: linkedChildren,
      guardian,
    });
  }, [selectedChild, linkedChildren, guardian]);

  const byBand = useMemo(() => {
    const map = Object.fromEntries(
      CONTACT_TRUST_BANDS.map((band) => [band.id, [] as SafeCircleContact[]]),
    ) as Record<ContactTrustBandId, SafeCircleContact[]>;
    for (const contact of contacts) {
      map[contact.band].push(contact);
    }
    return map;
  }, [contacts]);

  const dangerContactId = useMemo(
    () => (selectedChild ? pickDangerContactIdForChild(contacts, selectedChild.id) : null),
    [contacts, selectedChild],
  );

  const coreTrustSummary = useMemo(() => {
    if (!selectedChild) return null;
    const base = computeChildTrustSafetySummary(selectedChild);
    // If this child has no outer contacts to flag, put the danger state on the centre child.
    if (!dangerContactId) return toChildDangerTrustSummary(selectedChild, base);
    return base;
  }, [selectedChild, dangerContactId]);

  const contactTrustById = useMemo(() => {
    const map = new Map<string, TrustSafetyScoreSummary>();
    for (const contact of contacts) {
      const base = computeSafeCircleContactTrustSummary(contact, linkedChildren);
      map.set(
        contact.id,
        contact.id === dangerContactId ? toDangerTrustSummary(contact, base) : base,
      );
    }
    return map;
  }, [contacts, linkedChildren, dangerContactId]);

  const srSummary = useMemo(() => {
    return CONTACT_TRUST_BANDS.map((band) => {
      const names = byBand[band.id].map((c) => c.name);
      return `${band.label}: ${names.length ? names.join(", ") : "none"}`;
    }).join(". ");
  }, [byBand]);

  if (!selectedChild || !coreTrustSummary) {
    return (
      <section className="family-center__panel safe-circle" aria-labelledby="safe-circle-title">
        <div className="family-center__panel-head">
          <h2 id="safe-circle-title" className="family-center__panel-title">
            Safe contact circle
          </h2>
        </div>
        <p className="safe-circle__empty">
          Link a child account to see their approved contact circle here.
        </p>
      </section>
    );
  }

  const childHref = `/family-circle/accounts/${selectedChild.id}`;
  const coreNeedsWarning =
    coreTrustSummary.tone === "danger" ||
    coreTrustSummary.tone === "watch" ||
    coreTrustSummary.score < 80;
  const coreIsDanger = coreTrustSummary.tone === "danger";
  const coreTitle = `${selectedChild.fullName} · Trust and safety ${coreTrustSummary.score}/100${
    coreIsDanger ? " · Danger — needs review" : coreNeedsWarning ? " · Attention needed" : ""
  }`;

  return (
    <section className="family-center__panel safe-circle" aria-labelledby="safe-circle-title">
      <div className="family-center__panel-head">
        <div className="safe-circle__head-copy">
          <h2 id="safe-circle-title" className="family-center__panel-title">
            Safe contact circle
          </h2>
          <p className="safe-circle__subtitle">
            Who is close to {selectedChild.firstName} — family nearest the centre, wider approved
            contacts farther out. Hover a profile to see their trust and safety score.
          </p>
        </div>
        <Link href={`${childHref}#child-detail-dm`} className="family-center__panel-link">
          View contacts
        </Link>
      </div>

      {linkedChildren.length > 1 ? (
        <div className="safe-circle__switcher" role="tablist" aria-label="Select linked account">
          {linkedChildren.map((child) => {
            const selected = child.id === selectedChild.id;
            return (
              <button
                key={child.id}
                type="button"
                role="tab"
                aria-selected={selected}
                className={`safe-circle__switcher-btn${selected ? " is-selected" : ""}`}
                onClick={() => {
                  setSelectedChildId(child.id);
                  setActiveBand(null);
                }}
              >
                <span
                  className="safe-circle__switcher-avatar"
                  style={{ "--story-color": child.avatarColor } as CSSProperties}
                  aria-hidden="true"
                >
                  {child.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={child.avatarUrl} alt="" width={24} height={24} />
                  ) : (
                    child.avatarInitials
                  )}
                </span>
                <span className="safe-circle__switcher-name">{child.firstName}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      <p className="sr-only">{srSummary}</p>

      <div className={`safe-circle__stage${activeBand ? " is-band-focused" : ""}`}>
        <div className={`safe-circle__canvas-wrap${activeBand ? " is-band-focused" : ""}`}>
          <svg
            className={`safe-circle__rings${activeBand ? " is-band-focused" : ""}`}
            viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
            aria-hidden="true"
          >
            {[...CONTACT_TRUST_BANDS].reverse().map((band) => {
              const isActive = activeBand === band.id;
              const isHidden = activeBand != null && !isActive;
              return (
                <path
                  key={band.id}
                  d={annulusPath(BAND_INNER[band.id], BAND_OUTER[band.id])}
                  className={[
                    "safe-circle__band",
                    `safe-circle__band--${band.id}`,
                    isActive ? "is-focus-active" : "",
                    isHidden ? "is-focus-hidden" : "",
                    byBand[band.id].length === 0 ? "is-empty" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                />
              );
            })}
            <circle
              cx={CENTER}
              cy={CENTER}
              r={pctToPx(18)}
              className={`safe-circle__core-disk${activeBand ? " is-band-focused" : ""}`}
            />
          </svg>

          <div className={`safe-circle__plot${activeBand ? " is-band-focused" : ""}`}>
            <Link
              href={childHref}
              className={`safe-circle__core${
                coreIsDanger
                  ? " safe-circle__core--danger"
                  : coreNeedsWarning
                    ? " safe-circle__core--attention"
                    : ""
              }${activeBand ? " is-band-focused" : ""}`}
              style={{ "--story-color": selectedChild.avatarColor } as CSSProperties}
              title={coreTitle}
              aria-label={`${selectedChild.fullName} account. Trust and safety score ${coreTrustSummary.score} out of 100.${
                coreIsDanger ? " Danger — needs review." : coreNeedsWarning ? " Attention needed." : ""
              }`}
              aria-describedby={corePopoverId}
            >
              <span className="safe-circle__avatar-shell safe-circle__avatar-shell--core">
                <span
                  className={`safe-circle__core-avatar${
                    coreIsDanger
                      ? " safe-circle__core-avatar--danger"
                      : coreNeedsWarning
                        ? " safe-circle__core-avatar--attention"
                        : ""
                  }`}
                >
                  {selectedChild.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={selectedChild.avatarUrl} alt="" width={56} height={56} />
                  ) : (
                    selectedChild.avatarInitials
                  )}
                </span>
                {coreNeedsWarning ? (
                  <ScoreWarningBadge level={coreIsDanger ? "danger" : "watch"} />
                ) : null}
              </span>
              <span className="safe-circle__core-name">{selectedChild.firstName}</span>
              <TrustSafetyPopover
                personName={selectedChild.fullName}
                summary={coreTrustSummary}
                popoverId={corePopoverId}
              />
            </Link>

            {CONTACT_TRUST_BANDS.map((band) => {
              const bandContacts = byBand[band.id];
              const isActive = activeBand === band.id;
              const isHidden = activeBand != null && !isActive;
              const radius = isActive
                ? Math.min(78, BAND_RADIUS[band.id] * 1.28)
                : BAND_RADIUS[band.id];
              return bandContacts.map((contact, index) => {
                const pos = polarPosition(
                  radius,
                  index,
                  bandContacts.length,
                  BAND_ANGLE_OFFSET[band.id],
                );
                const trustSummary =
                  contactTrustById.get(contact.id) ??
                  computeSafeCircleContactTrustSummary(contact, linkedChildren);
                return (
                  <div
                    key={contact.id}
                    className={[
                      "safe-circle__node",
                      isActive ? "is-focus-active" : "",
                      isHidden ? "is-focus-hidden" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={{
                      left: `${(pos.x / VIEWBOX) * 100}%`,
                      top: `${(pos.y / VIEWBOX) * 100}%`,
                      transitionDelay: isHidden
                        ? `${Math.min(index * 45, 180)}ms`
                        : isActive
                          ? `${90 + Math.min(index * 45, 180)}ms`
                          : "0ms",
                    }}
                  >
                    <ContactAvatar
                      contact={contact}
                      highlighted={isActive}
                      dimmed={isHidden}
                      trustSummary={trustSummary}
                    />
                  </div>
                );
              });
            })}
          </div>
        </div>

        <ul className="safe-circle__legend" aria-label="Contact trust bands">
          <li>
            <button
              type="button"
              className={`safe-circle__legend-btn safe-circle__legend-btn--all${
                activeBand == null ? " is-selected" : ""
              }`}
              aria-pressed={activeBand == null}
              onClick={() => setActiveBand(null)}
            >
              <span className="safe-circle__legend-swatch" aria-hidden="true" />
              <span className="safe-circle__legend-copy">
                <span className="safe-circle__legend-label">All</span>
                <span className="safe-circle__legend-count">{contacts.length}</span>
              </span>
            </button>
          </li>
          {CONTACT_TRUST_BANDS.map((band) => {
            const count = byBand[band.id].length;
            const selected = activeBand === band.id;
            return (
              <li key={band.id}>
                <button
                  type="button"
                  className={`safe-circle__legend-btn safe-circle__legend-btn--${band.id}${
                    selected ? " is-selected" : ""
                  }`}
                  aria-pressed={selected}
                  onClick={() => setActiveBand(band.id)}
                >
                  <span className="safe-circle__legend-swatch" aria-hidden="true" />
                  <span className="safe-circle__legend-copy">
                    <span className="safe-circle__legend-label">{band.label}</span>
                    <span className="safe-circle__legend-count">
                      {count === 0 ? "None yet" : `${count}`}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
