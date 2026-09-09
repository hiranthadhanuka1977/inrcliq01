"use client";

import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";
import type { FamilyCenterChild, FamilyCenterGuardian } from "@/lib/guardian/family-center";
import {
  buildSafeContactCircleContacts,
  CONTACT_TRUST_BANDS,
  defaultSafeCircleChildId,
  type ContactTrustBandId,
  type SafeCircleContact,
} from "@/lib/guardian/family-center-static";
import { dmContactSafetyStatus } from "@/lib/guardian/dm-contact-safety";

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

function ContactAvatar({
  contact,
  highlighted,
  dimmed,
}: {
  contact: SafeCircleContact;
  highlighted: boolean;
  dimmed: boolean;
}) {
  const attention =
    contact.kind === "dm" && dmContactSafetyStatus(contact.id) === "attention";
  const statusLabel = attention ? "Attention needed" : "All clear";
  const bandMeta = CONTACT_TRUST_BANDS.find((band) => band.id === contact.band);
  const title = `${contact.name} · ${bandMeta?.label ?? "Contact"} · ${statusLabel}`;

  const className = [
    "safe-circle__avatar",
    highlighted ? "safe-circle__avatar--highlight" : "",
    attention ? "safe-circle__avatar--attention" : "",
    dimmed ? "is-dimmed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const body = (
    <>
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
      <span className="safe-circle__node-name">{shortName(contact.name)}</span>
    </>
  );

  if (!contact.href) {
    return (
      <span className="safe-circle__avatar-wrap" aria-label={title} title={title}>
        {body}
      </span>
    );
  }

  return (
    <Link href={contact.href} className="safe-circle__avatar-wrap" aria-label={title} title={title}>
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

  const srSummary = useMemo(() => {
    return CONTACT_TRUST_BANDS.map((band) => {
      const names = byBand[band.id].map((c) => c.name);
      return `${band.label}: ${names.length ? names.join(", ") : "none"}`;
    }).join(". ");
  }, [byBand]);

  if (!selectedChild) {
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

  return (
    <section className="family-center__panel safe-circle" aria-labelledby="safe-circle-title">
      <div className="family-center__panel-head">
        <div className="safe-circle__head-copy">
          <h2 id="safe-circle-title" className="family-center__panel-title">
            Safe contact circle
          </h2>
          <p className="safe-circle__subtitle">
            Who is close to {selectedChild.firstName} — family nearest the centre, wider approved
            contacts farther out.
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

      <div className="safe-circle__stage">
        <div className="safe-circle__canvas-wrap">
          <svg
            className="safe-circle__rings"
            viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
            aria-hidden="true"
          >
            {[...CONTACT_TRUST_BANDS].reverse().map((band) => {
              const isActive = activeBand === band.id;
              const isDimmed = activeBand != null && !isActive;
              return (
                <path
                  key={band.id}
                  d={annulusPath(BAND_INNER[band.id], BAND_OUTER[band.id])}
                  className={[
                    "safe-circle__band",
                    `safe-circle__band--${band.id}`,
                    isActive ? "is-active" : "",
                    isDimmed ? "is-dimmed" : "",
                    byBand[band.id].length === 0 ? "is-empty" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                />
              );
            })}
            <circle cx={CENTER} cy={CENTER} r={pctToPx(18)} className="safe-circle__core-disk" />
          </svg>

          <div className="safe-circle__plot">
            <Link
              href={childHref}
              className="safe-circle__core"
              style={{ "--story-color": selectedChild.avatarColor } as CSSProperties}
              title={selectedChild.fullName}
              aria-label={`${selectedChild.fullName} account`}
            >
              <span className="safe-circle__core-avatar">
                {selectedChild.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selectedChild.avatarUrl} alt="" width={56} height={56} />
                ) : (
                  selectedChild.avatarInitials
                )}
              </span>
              <span className="safe-circle__core-name">{selectedChild.firstName}</span>
            </Link>

            {CONTACT_TRUST_BANDS.map((band) => {
              const bandContacts = byBand[band.id];
              const dimmed = activeBand != null && activeBand !== band.id;
              return bandContacts.map((contact, index) => {
                const pos = polarPosition(
                  BAND_RADIUS[band.id],
                  index,
                  bandContacts.length,
                  BAND_ANGLE_OFFSET[band.id],
                );
                return (
                  <div
                    key={contact.id}
                    className={`safe-circle__node${dimmed ? " is-dimmed" : ""}`}
                    style={{
                      left: `${(pos.x / VIEWBOX) * 100}%`,
                      top: `${(pos.y / VIEWBOX) * 100}%`,
                    }}
                  >
                    <ContactAvatar
                      contact={contact}
                      highlighted={activeBand === band.id}
                      dimmed={dimmed}
                    />
                  </div>
                );
              });
            })}
          </div>
        </div>

        <ul className="safe-circle__legend" aria-label="Contact trust bands">
          {CONTACT_TRUST_BANDS.map((band) => {
            const count = byBand[band.id].length;
            const selected = activeBand === band.id;
            return (
              <li key={band.id}>
                <button
                  type="button"
                  className={`safe-circle__legend-btn safe-circle__legend-btn--${band.id}${selected ? " is-selected" : ""}`}
                  aria-pressed={selected}
                  onClick={() =>
                    setActiveBand((current) => (current === band.id ? null : band.id))
                  }
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
