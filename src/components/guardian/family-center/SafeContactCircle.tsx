"use client";

import Link from "next/link";
import {
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
} from "react";
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
import { useDialogA11y } from "@/lib/accessibility/useDialogA11y";

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

/** Keep focused profiles inside the canvas so outer bands do not spill onto the legend. */
const FOCUS_RADIUS_SCALE: Record<ContactTrustBandId, number> = {
  immediate_family: 1.26,
  relatives: 1.14,
  school_friends: 1.06,
  approved_wider: 1.02,
};

const FOCUS_RADIUS_CAP: Record<ContactTrustBandId, number> = {
  immediate_family: 72,
  relatives: 68,
  school_friends: 64,
  approved_wider: 60,
};

const VIEWBOX = 200;
const CENTER = VIEWBOX / 2;
const CONTACT_DRAG_MIME = "application/x-safe-circle-contact";

type PendingBandMove = {
  contact: SafeCircleContact;
  fromBand: ContactTrustBandId;
  toBand: ContactTrustBandId;
};

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

function bandLabel(bandId: ContactTrustBandId) {
  return CONTACT_TRUST_BANDS.find((band) => band.id === bandId)?.label ?? bandId;
}

function canMoveContact(contact: SafeCircleContact) {
  return contact.kind !== "guardian";
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

function MoveBandConfirmModal({
  open,
  pending,
  childName,
  isSaving,
  error,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  pending: PendingBandMove | null;
  childName: string;
  isSaving: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { dialogRef } = useDialogA11y(open, onCancel);
  if (!open || !pending) return null;

  return (
    <div
      className="modal-backdrop is-open"
      role="dialog"
      aria-modal="true"
      aria-labelledby="safe-circle-move-title"
    >
      <div className="modal safe-circle-move-modal text-center" ref={dialogRef} tabIndex={-1}>
        <h2 id="safe-circle-move-title">Move contact?</h2>
        <p className="subtitle mt-4">
          Move <strong>{pending.contact.name}</strong> from{" "}
          <strong>{bandLabel(pending.fromBand)}</strong> to{" "}
          <strong>{bandLabel(pending.toBand)}</strong> in {childName}&apos;s safe contact circle?
        </p>
        {error ? (
          <p className="field-error mt-4" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="button"
          className="btn btn--primary mt-8"
          onClick={onConfirm}
          disabled={isSaving}
        >
          {isSaving ? "Saving…" : "Yes, move contact"}
        </button>
        <button
          type="button"
          className="btn btn--outline-info mt-3"
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function ContactAvatar({
  contact,
  highlighted,
  dimmed,
  trustSummary,
  shouldSuppressNavigate,
}: {
  contact: SafeCircleContact;
  highlighted: boolean;
  dimmed: boolean;
  trustSummary: TrustSafetyScoreSummary;
  shouldSuppressNavigate: () => boolean;
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
            <img src={contact.avatarUrl} alt="" width={40} height={40} draggable={false} />
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
      draggable={false}
      onClick={(event) => {
        if (shouldSuppressNavigate()) {
          event.preventDefault();
        }
      }}
    >
      {body}
    </Link>
  );
}

const NO_TRUST_BANDS: Record<string, Record<string, ContactTrustBandId>> = {};

export function SafeContactCircle({
  linkedChildren,
  guardian,
  contactTrustBandsByChild = NO_TRUST_BANDS,
}: {
  linkedChildren: FamilyCenterChild[];
  guardian: FamilyCenterGuardian;
  contactTrustBandsByChild?: Record<string, Record<string, ContactTrustBandId>>;
}) {
  const corePopoverId = useId();
  const initialId = defaultSafeCircleChildId(linkedChildren);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(initialId);
  const [activeBand, setActiveBand] = useState<ContactTrustBandId | null>(null);
  const [bandOverridesByChild, setBandOverridesByChild] = useState(contactTrustBandsByChild);
  const [draggingContactId, setDraggingContactId] = useState<string | null>(null);
  const [dropTargetBand, setDropTargetBand] = useState<ContactTrustBandId | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingBandMove | null>(null);
  const [isSavingMove, setIsSavingMove] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);
  const suppressNavigateRef = useRef(false);

  const [syncedTrustBands, setSyncedTrustBands] = useState(contactTrustBandsByChild);
  if (syncedTrustBands !== contactTrustBandsByChild) {
    setSyncedTrustBands(contactTrustBandsByChild);
    setBandOverridesByChild(contactTrustBandsByChild);
  }

  const selectedChild =
    linkedChildren.find((child) => child.id === selectedChildId) ?? linkedChildren[0] ?? null;

  const contacts = useMemo(() => {
    if (!selectedChild) return [] as SafeCircleContact[];
    return buildSafeContactCircleContacts({
      child: selectedChild,
      siblings: linkedChildren,
      guardian,
      bandByContactKey: bandOverridesByChild[selectedChild.id] ?? {},
    });
  }, [selectedChild, linkedChildren, guardian, bandOverridesByChild]);

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

  function clearDragState() {
    setDraggingContactId(null);
    setDropTargetBand(null);
  }

  function requestMoveToBand(contactId: string, toBand: ContactTrustBandId) {
    const contact = contacts.find((item) => item.id === contactId);
    if (!contact || !canMoveContact(contact) || contact.band === toBand) {
      clearDragState();
      return;
    }
    setMoveError(null);
    setPendingMove({
      contact,
      fromBand: contact.band,
      toBand,
    });
    clearDragState();
  }

  async function confirmPendingMove() {
    if (!pendingMove || !selectedChild) {
      setPendingMove(null);
      return;
    }

    setIsSavingMove(true);
    setMoveError(null);
    try {
      const response = await fetch("/api/guardian/contact-trust-band", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childUserId: selectedChild.id,
          contactKey: pendingMove.contact.id,
          contactKind: pendingMove.contact.kind === "sibling" ? "sibling" : "dm",
          trustBand: pendingMove.toBand,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setMoveError(payload?.error || "Unable to save trust band.");
        return;
      }

      setBandOverridesByChild((current) => ({
        ...current,
        [selectedChild.id]: {
          ...(current[selectedChild.id] ?? {}),
          [pendingMove.contact.id]: pendingMove.toBand,
        },
      }));
      setPendingMove(null);
    } catch {
      setMoveError("Unable to save trust band.");
    } finally {
      setIsSavingMove(false);
    }
  }

  function handleContactDragStart(event: DragEvent<HTMLDivElement>, contact: SafeCircleContact) {
    if (!canMoveContact(contact)) {
      event.preventDefault();
      return;
    }
    suppressNavigateRef.current = true;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(CONTACT_DRAG_MIME, contact.id);
    event.dataTransfer.setData("text/plain", contact.id);
    setDraggingContactId(contact.id);
  }

  function handleBandDragOver(event: DragEvent, bandId: ContactTrustBandId) {
    if (!draggingContactId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (dropTargetBand !== bandId) setDropTargetBand(bandId);
  }

  function handleBandDrop(event: DragEvent, bandId: ContactTrustBandId) {
    event.preventDefault();
    const contactId =
      event.dataTransfer.getData(CONTACT_DRAG_MIME) ||
      event.dataTransfer.getData("text/plain") ||
      draggingContactId;
    if (!contactId) {
      clearDragState();
      return;
    }
    requestMoveToBand(contactId, bandId);
  }

  if (!selectedChild || !coreTrustSummary) {
    return (
      <section className="family-center__panel safe-circle" aria-labelledby="safe-circle-title">
        <div className="family-center__panel-head">
          <h2 id="safe-circle-title" className="family-center__panel-title">
            Threat Radar
          </h2>
        </div>
        <p className="safe-circle__empty">
          Link a child account to see their threat radar here.
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
  const isDragging = draggingContactId != null;

  return (
    <section className="family-center__panel safe-circle" aria-labelledby="safe-circle-title">
      <div className="family-center__panel-head">
        <div className="safe-circle__head-copy">
          <h2 id="safe-circle-title" className="family-center__panel-title">
            Threat Radar
          </h2>
          <p className="safe-circle__subtitle">
            A live scan of who surrounds {selectedChild.firstName} — trusted contacts stay near the
            centre; wider or higher-caution contacts sit farther out. Drag someone onto another band
            to reclassify them, then confirm.
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
                  clearDragState();
                  setPendingMove(null);
                  setMoveError(null);
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

      <div
        className={`safe-circle__stage${activeBand ? " is-band-focused" : ""}${
          isDragging ? " is-dragging" : ""
        }`}
      >
        <div
          className={`safe-circle__canvas-wrap${activeBand ? " is-band-focused" : ""}${
            isDragging ? " is-dragging" : ""
          }`}
        >
          <svg
            className={`safe-circle__rings${activeBand ? " is-band-focused" : ""}${
              isDragging ? " is-dragging" : ""
            }`}
            viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
            aria-hidden={isDragging ? undefined : true}
          >
            {[...CONTACT_TRUST_BANDS].reverse().map((band) => {
              const isActive = activeBand === band.id;
              const isHidden = activeBand != null && !isActive;
              const isDropTarget = dropTargetBand === band.id;
              return (
                <path
                  key={band.id}
                  d={annulusPath(BAND_INNER[band.id], BAND_OUTER[band.id])}
                  className={[
                    "safe-circle__band",
                    `safe-circle__band--${band.id}`,
                    isActive ? "is-focus-active" : "",
                    isHidden ? "is-focus-hidden" : "",
                    isDropTarget ? "is-drop-target" : "",
                    byBand[band.id].length === 0 ? "is-empty" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onDragOver={(event) => handleBandDragOver(event, band.id)}
                  onDragLeave={() => {
                    if (dropTargetBand === band.id) setDropTargetBand(null);
                  }}
                  onDrop={(event) => handleBandDrop(event, band.id)}
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
                ? Math.min(
                    FOCUS_RADIUS_CAP[band.id],
                    BAND_RADIUS[band.id] * FOCUS_RADIUS_SCALE[band.id],
                  )
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
                const movable = canMoveContact(contact);
                const isDraggingContact = draggingContactId === contact.id;
                return (
                  <div
                    key={contact.id}
                    className={[
                      "safe-circle__node",
                      isActive ? "is-focus-active" : "",
                      isHidden ? "is-focus-hidden" : "",
                      movable ? "is-movable" : "",
                      isDraggingContact ? "is-dragging" : "",
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
                    draggable={movable}
                    onDragStart={(event) => handleContactDragStart(event, contact)}
                    onDragEnd={() => {
                      clearDragState();
                      window.setTimeout(() => {
                        suppressNavigateRef.current = false;
                      }, 0);
                    }}
                  >
                    <ContactAvatar
                      contact={contact}
                      highlighted={isActive || isDraggingContact}
                      dimmed={isHidden}
                      trustSummary={trustSummary}
                      shouldSuppressNavigate={() => suppressNavigateRef.current}
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
            const isDropTarget = dropTargetBand === band.id;
            return (
              <li key={band.id}>
                <button
                  type="button"
                  className={[
                    "safe-circle__legend-btn",
                    `safe-circle__legend-btn--${band.id}`,
                    selected ? "is-selected" : "",
                    isDropTarget ? "is-drop-target" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-pressed={selected}
                  onClick={() => setActiveBand(band.id)}
                  onDragOver={(event) => handleBandDragOver(event, band.id)}
                  onDragLeave={() => {
                    if (dropTargetBand === band.id) setDropTargetBand(null);
                  }}
                  onDrop={(event) => handleBandDrop(event, band.id)}
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

      <MoveBandConfirmModal
        open={pendingMove != null}
        pending={pendingMove}
        childName={selectedChild.firstName}
        isSaving={isSavingMove}
        error={moveError}
        onCancel={() => {
          if (isSavingMove) return;
          setPendingMove(null);
          setMoveError(null);
        }}
        onConfirm={() => {
          void confirmPendingMove();
        }}
      />
    </section>
  );
}
