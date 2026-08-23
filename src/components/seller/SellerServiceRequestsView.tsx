"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { SellerBookingsCalendar } from "@/components/seller/SellerBookingsCalendar";
import { SellerImageUploadField } from "@/components/seller/SellerImageUploadField";
import { bookingStatusClass } from "@/lib/feed/booking-status";
import { formatDeliverByLabel } from "@/lib/feed/booking-confirmation";
import type {
  CreatorRequestsContent,
  RequestCategory,
  RequestGalleryItem,
} from "@/lib/feed/special-requests";
import type { SettingsBookingRow } from "@/lib/settings/bookings";
import {
  formatCompactCount,
  formatCompactMoney,
  getCategoryOfferingStats,
  getCategoryReadiness,
  isCategoryActive,
  isServiceRequestsCatalogEmpty,
  slugifyServiceId,
  type SellerServiceRequestsConfig,
} from "@/lib/seller/service-requests-helpers";

type TabId = "calendar" | "offerings" | "inbox" | "setup";

type SellerServiceRequestsViewProps = {
  slug: string;
  previewHref: string;
  initialConfig: SellerServiceRequestsConfig;
  initialBookings: SettingsBookingRow[];
  initialUnavailableDates?: string[];
  initialTab?: TabId;
};

function linesToText(lines: string[]) {
  return lines.join("\n");
}

function textToLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseInitialTab(value: TabId | undefined): TabId {
  if (
    value === "calendar" ||
    value === "offerings" ||
    value === "inbox" ||
    value === "setup"
  ) {
    return value;
  }
  return "calendar";
}

function bookingDetailsHref(bookingId: string) {
  const params = new URLSearchParams({
    tab: "inbound",
    booking: bookingId,
  });
  return `/feed/bookings?${params.toString()}`;
}

export function SellerServiceRequestsView({
  slug,
  previewHref,
  initialConfig,
  initialBookings,
  initialUnavailableDates = [],
  initialTab,
}: SellerServiceRequestsViewProps) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>(parseInitialTab(initialTab));
  const [enabled, setEnabled] = useState(initialConfig.enabled);
  const [content, setContent] = useState<CreatorRequestsContent>(initialConfig.content);
  const [bookings, setBookings] = useState(initialBookings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pendingBookingId, setPendingBookingId] = useState<string | null>(null);
  const [declineDraft, setDeclineDraft] = useState<{ id: string; reason: string } | null>(null);
  const [menuCategoryId, setMenuCategoryId] = useState<string | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<RequestCategory | null>(null);
  const [activateTarget, setActivateTarget] = useState<RequestCategory | null>(null);
  const [introDismissed, setIntroDismissed] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const offeringCount = useMemo(
    () => content.categories.reduce((sum, category) => sum + category.services.length, 0),
    [content.categories],
  );

  const needsSetupIntro = isServiceRequestsCatalogEmpty(content) && !introDismissed;

  const receivedCount = useMemo(
    () => bookings.filter((booking) => booking.status === "RECEIVED").length,
    [bookings],
  );

  useEffect(() => {
    if (!menuCategoryId) return;

    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuCategoryId(null);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuCategoryId(null);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuCategoryId]);

  async function saveConfig(
    nextEnabled: boolean,
    nextContent: CreatorRequestsContent,
    options?: { successMessage?: string },
  ) {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/seller/service-requests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: nextEnabled,
          content: nextContent,
          autoStartingRange: true,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "Unable to save changes.");
        return false;
      }

      setEnabled(data.enabled);
      setContent(data.content);
      setMessage(
        options?.successMessage ?? "Saved. Fan profile requests will use this catalog.",
      );
      return true;
    } catch {
      setError("Unable to save changes.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleEnabledToggle(nextEnabled: boolean) {
    const previous = enabled;
    setEnabled(nextEnabled);
    setError("");

    const ok = await saveConfig(nextEnabled, content, {
      successMessage: nextEnabled
        ? "Special Requests are now live on your profile."
        : "Special Requests are hidden from your profile.",
    });

    if (!ok) {
      setEnabled(previous);
    }
  }

  async function handleSaveSetup(event: FormEvent) {
    event.preventDefault();

    const missingGallery = content.gallery.find((item) => !item.src.trim());
    if (missingGallery) {
      setError(
        `Add a background image for gallery slide “${missingGallery.caption || missingGallery.id}”.`,
      );
      return;
    }

    await saveConfig(enabled, content);
  }

  function openDeactivateDialog(category: RequestCategory) {
    setMenuCategoryId(null);
    setActivateTarget(null);
    setDeactivateTarget(category);
    setError("");
  }

  function closeDeactivateDialog() {
    setDeactivateTarget(null);
  }

  function openActivateDialog(category: RequestCategory) {
    setMenuCategoryId(null);
    setDeactivateTarget(null);
    setActivateTarget(category);
    setError("");
  }

  function closeActivateDialog() {
    setActivateTarget(null);
  }

  async function confirmDeactivateCategory() {
    if (!deactivateTarget) return;

    const nextContent: CreatorRequestsContent = {
      ...content,
      categories: content.categories.map((item) =>
        item.id === deactivateTarget.id ? { ...item, active: false } : item,
      ),
    };

    const ok = await saveConfig(enabled, nextContent);
    if (ok) {
      setDeactivateTarget(null);
      setMessage(
        `“${deactivateTarget.title.trim() || "Untitled category"}” is deactivated and hidden from fans.`,
      );
    }
  }

  async function confirmActivateCategory() {
    if (!activateTarget) return;

    const nextContent: CreatorRequestsContent = {
      ...content,
      categories: content.categories.map((item) =>
        item.id === activateTarget.id ? { ...item, active: true } : item,
      ),
    };

    const ok = await saveConfig(enabled, nextContent);
    if (ok) {
      setActivateTarget(null);
      setMessage(
        `“${activateTarget.title.trim() || "Untitled category"}” is active again for fans when it has live offerings.`,
      );
    }
  }

  function updateGalleryItem(id: string, patch: Partial<RequestGalleryItem>) {
    setContent((current) => ({
      ...current,
      gallery: current.gallery.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  }

  function addGallerySlide() {
    const used = new Set(content.gallery.map((item) => item.id));
    const id = slugifyServiceId(`gallery-${content.gallery.length + 1}`, used);
    const slide: RequestGalleryItem = {
      id,
      src: "",
      alt: "Example delivery",
      caption: "New example",
      categoryId: content.categories[0]?.id ?? "",
      teaser: "",
    };
    setContent((current) => ({ ...current, gallery: [...current.gallery, slide] }));
  }

  function removeGallerySlide(id: string) {
    setContent((current) => ({
      ...current,
      gallery: current.gallery.filter((item) => item.id !== id),
    }));
  }

  async function handleAccept(booking: SettingsBookingRow) {
    const confirmed = window.confirm(`Accept booking ${booking.reference}?`);
    if (!confirmed) return;

    setPendingBookingId(booking.id);
    setError("");
    try {
      const response = await fetch(`/api/seller/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "Unable to accept booking.");
        return;
      }
      setBookings((current) =>
        current.map((item) =>
          item.id === booking.id
            ? { ...item, status: data.status, statusLabel: data.statusLabel }
            : item,
        ),
      );
      setMessage(`Accepted ${booking.reference}.`);
    } catch {
      setError("Unable to accept booking.");
    } finally {
      setPendingBookingId(null);
    }
  }

  async function handleDeclineSubmit(event: FormEvent) {
    event.preventDefault();
    if (!declineDraft) return;

    setPendingBookingId(declineDraft.id);
    setError("");
    try {
      const response = await fetch(`/api/seller/bookings/${declineDraft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "decline", reason: declineDraft.reason }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "Unable to decline booking.");
        return;
      }
      setBookings((current) =>
        current.map((item) =>
          item.id === declineDraft.id
            ? { ...item, status: data.status, statusLabel: data.statusLabel }
            : item,
        ),
      );
      setDeclineDraft(null);
      setMessage("Booking declined.");
    } catch {
      setError("Unable to decline booking.");
    } finally {
      setPendingBookingId(null);
    }
  }

  return (
    <section className="seller-panel" aria-labelledby="seller-requests-title">
      <div className="seller-panel__head seller-requests-head">
        <div>
          <h1 className="seller-panel__title" id="seller-requests-title">
            Service requests
          </h1>
          <p className="seller-panel__subtitle">
            {needsSetupIntro
              ? "Turn personalized fan requests into bookings with categories, offerings, and delivery formats."
              : "Configure the same catalog fans see on your profile — offerings, availability, and incoming bookings for @" +
                slug +
                "."}
          </p>
        </div>
        {!needsSetupIntro ? (
          <div className="seller-requests-head__actions">
            <Link href={previewHref} className="btn btn--secondary btn--sm" target="_blank">
              Preview page
            </Link>
          </div>
        ) : null}
      </div>

      {needsSetupIntro ? (
        <div className="seller-sr-intro">
          <div className="seller-sr-intro__copy">
            <p className="seller-sr-intro__eyebrow">Getting started</p>
            <h2 className="seller-sr-intro__title">Introduce Service Requests to your fans</h2>
            <p className="seller-sr-intro__lead">
              Let fans book personalized text, audio, or video from you. Set up categories and
              offerings, choose which formats they can request, and go live when you&apos;re ready.
            </p>
            <ul className="seller-sr-intro__points">
              <li>Create categories like shout-outs, coaching, or appearances</li>
              <li>Price each offering and optional length add-ons</li>
              <li>Keep the storefront hidden until your first offering is ready</li>
            </ul>
            <div className="seller-sr-intro__actions">
              <Link
                href="/seller/service-requests/categories/new"
                className="btn btn--primary"
              >
                Create your first category
              </Link>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => {
                  setIntroDismissed(true);
                  setTab("setup");
                }}
              >
                Review page setup
              </button>
            </div>
          </div>

          <div className="seller-sr-intro__media" aria-label="Service Requests overview video">
            <div className="seller-sr-intro__video" role="img" aria-label="Video placeholder">
              <span className="seller-sr-intro__play" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                  <path d="M8 5.14v13.72L19 12 8 5.14z" />
                </svg>
              </span>
              <div className="seller-sr-intro__video-copy">
                <strong>Watch how Service Requests work</strong>
                <span>Video coming soon</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
      <div className="seller-requests-summary" aria-label="Service request summary">
        <div className="seller-requests-summary__item">
          <span className="seller-requests-summary__label">Storefront</span>
          <strong>{enabled ? "Live" : "Hidden"}</strong>
        </div>
        <div className="seller-requests-summary__item">
          <span className="seller-requests-summary__label">Offerings</span>
          <strong>{offeringCount}</strong>
        </div>
        <div className="seller-requests-summary__item">
          <span className="seller-requests-summary__label">Awaiting response</span>
          <strong>{receivedCount}</strong>
        </div>
        <div className="seller-requests-summary__item">
          <span className="seller-requests-summary__label">Starting from</span>
          <strong>{content.startingRange}</strong>
        </div>
      </div>

      <div className="seller-tabs" role="tablist" aria-label="Service request sections">
        {(
          [
            { id: "calendar", label: "Calendar" },
            { id: "offerings", label: "Offerings" },
            { id: "inbox", label: `Inbox${receivedCount ? ` (${receivedCount})` : ""}` },
            { id: "setup", label: "Setup" },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={`seller-tabs__tab${tab === item.id ? " is-active" : ""}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="seller-banner seller-banner--error" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="seller-banner seller-banner--ok" role="status">
          {message}
        </p>
      ) : null}

      {tab === "calendar" ? (
        <SellerBookingsCalendar
          bookings={bookings}
          initialUnavailableDates={initialUnavailableDates}
        />
      ) : null}

      {tab === "setup" ? (
        <form className="seller-requests-form" onSubmit={handleSaveSetup}>
          <div className="seller-toggle seller-toggle--switch">
            <span>
              <strong id="special-requests-profile-label">Show Special Requests on profile</strong>
              <span className="seller-toggle__hint">
                Controls the orb and `/requests` routes fans use to book you.
              </span>
            </span>
            <label className={`toggle-switch${saving ? " is-disabled" : ""}`}>
              <input
                type="checkbox"
                checked={enabled}
                disabled={saving}
                onChange={(event) => void handleEnabledToggle(event.target.checked)}
                aria-labelledby="special-requests-profile-label"
              />
              <span className="toggle-switch__track" aria-hidden="true">
                <span className="toggle-switch__thumb" />
              </span>
            </label>
          </div>

          <div className="seller-form-grid">
            <label className="field">
              <span className="field-label">Response time</span>
              <input
                className="input"
                value={content.responseTime}
                onChange={(event) =>
                  setContent((current) => ({ ...current, responseTime: event.target.value }))
                }
                placeholder="24 hours"
              />
            </label>
            <label className="field">
              <span className="field-label">Next available</span>
              <input
                className="input"
                value={content.nextAvailable}
                onChange={(event) =>
                  setContent((current) => ({ ...current, nextAvailable: event.target.value }))
                }
                placeholder="Jul 22, 2026"
              />
            </label>
            <label className="field">
              <span className="field-label">Starting range</span>
              <input
                className="input"
                value={content.startingRange}
                onChange={(event) =>
                  setContent((current) => ({ ...current, startingRange: event.target.value }))
                }
                placeholder="$80 – $240"
              />
              <span className="field-hint">Auto-updates when you save offerings.</span>
            </label>
          </div>

          <label className="field">
            <span className="field-label">Intro</span>
            <textarea
              className="input seller-textarea"
              rows={3}
              value={linesToText(content.intro)}
              onChange={(event) =>
                setContent((current) => ({
                  ...current,
                  intro: textToLines(event.target.value),
                }))
              }
            />
          </label>

          <label className="field">
            <span className="field-label">Guarantee copy</span>
            <textarea
              className="input seller-textarea"
              rows={3}
              value={content.guarantee}
              onChange={(event) =>
                setContent((current) => ({ ...current, guarantee: event.target.value }))
              }
            />
          </label>

          <div className="seller-gallery-setup">
            <div className="seller-offerings__toolbar">
              <div>
                <h2 className="seller-gallery-setup__title">Example gallery backgrounds</h2>
                <p className="seller-offerings__hint">
                  These images appear as the full-bleed examples on your Special Requests landing
                  page.
                </p>
              </div>
              <button type="button" className="btn btn--secondary btn--sm" onClick={addGallerySlide}>
                Add slide
              </button>
            </div>

            <div className="seller-gallery-setup__grid">
              {content.gallery.map((item) => (
                <article key={item.id} className="seller-gallery-card">
                  <SellerImageUploadField
                    label="Background image"
                    hint="Shown edge-to-edge in the fan gallery."
                    value={item.src}
                    required
                    aspect="wide"
                    disabled={saving}
                    onChange={(url) => updateGalleryItem(item.id, { src: url })}
                    onError={setError}
                  />
                  <label className="field">
                    <span className="field-label">Caption</span>
                    <input
                      className="input"
                      value={item.caption}
                      onChange={(event) =>
                        updateGalleryItem(item.id, { caption: event.target.value })
                      }
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">Alt text</span>
                    <input
                      className="input"
                      value={item.alt}
                      onChange={(event) => updateGalleryItem(item.id, { alt: event.target.value })}
                    />
                  </label>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => removeGallerySlide(item.id)}
                  >
                    Remove slide
                  </button>
                </article>
              ))}
            </div>
          </div>

          <div className="seller-form-actions">
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? "Saving…" : "Save setup"}
            </button>
          </div>
        </form>
      ) : null}

      {tab === "offerings" ? (
        <div className="seller-offerings">
          <div className="seller-offerings__toolbar">
            <div>
              <h2 className="seller-offerings__title">Categories &amp; offerings</h2>
              <p className="seller-offerings__hint">
                Fans pick a category first, then book an offering. Open Manage to edit a category
                and its offerings. Only categories marked Ready appear publicly.
              </p>
            </div>
            <Link
              href="/seller/service-requests/categories/new"
              className="btn btn--secondary btn--sm"
            >
              Add category
            </Link>
          </div>

          {content.categories.length === 0 ? (
            <div className="seller-empty">
              <strong>No categories yet</strong>
              <p>
                Create a category (for example “Shout-outs” or “Coaching”), then add offerings fans
                can book.
              </p>
              <Link
                href="/seller/service-requests/categories/new"
                className="btn btn--primary btn--sm"
              >
                Add your first category
              </Link>
            </div>
          ) : (
            <div className="seller-category-list">
              {content.categories.map((category) => {
                const readiness = getCategoryReadiness(category);
                const stats = getCategoryOfferingStats(category, bookings, slug);
                return (
                  <article key={category.id} className="seller-category">
                    <div className="seller-category__summary">
                      <div className="seller-category__thumb" aria-hidden="true">
                        {category.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={category.image} alt="" />
                        ) : (
                          <span className="seller-category__thumb-empty">No image</span>
                        )}
                      </div>

                      <div className="seller-category__summary-copy">
                        <div className="seller-category__summary-top">
                          <h3 className="seller-category__name">
                            {category.title.trim() || "Untitled category"}
                          </h3>
                          <span className={`seller-status seller-status--${readiness.status}`}>
                            {readiness.label}
                          </span>
                          <span
                            className={`seller-status ${
                              category.instantBooking
                                ? "seller-status--instant"
                                : "seller-status--approval"
                            }`}
                          >
                            {category.instantBooking ? "Instant" : "Approval"}
                          </span>
                        </div>
                        <p className="seller-category__intent">
                          {category.intent.trim() || "Add a short intent fans will see on the tile"}
                        </p>
                        <p className="seller-category__meta">
                          {category.services.length} offering
                          {category.services.length === 1 ? "" : "s"}
                          {readiness.readyOfferingCount > 0
                            ? ` · ${readiness.readyOfferingCount} ready`
                            : ""}
                          {category.popular ? " · Popular" : ""}
                        </p>
                      </div>

                      <div className="seller-category__summary-actions">
                        <div
                          className="seller-context-menu"
                          ref={menuCategoryId === category.id ? menuRef : undefined}
                        >
                          <button
                            type="button"
                            className="btn btn--ghost btn--sm btn--icon seller-context-menu__trigger"
                            aria-label={`Settings for ${category.title.trim() || "category"}`}
                            aria-haspopup="menu"
                            aria-expanded={menuCategoryId === category.id}
                            disabled={saving}
                            onClick={() =>
                              setMenuCategoryId((current) =>
                                current === category.id ? null : category.id,
                              )
                            }
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                              width="18"
                              height="18"
                            >
                              <circle cx="12" cy="12" r="3" />
                              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                            </svg>
                          </button>
                          {menuCategoryId === category.id ? (
                            <div
                              className="seller-context-menu__dropdown"
                              role="menu"
                              aria-label="Category options"
                            >
                              <Link
                                href={`/seller/service-requests/categories/${category.id}`}
                                className="seller-context-menu__item"
                                role="menuitem"
                                onClick={() => setMenuCategoryId(null)}
                              >
                                Manage
                              </Link>
                              {isCategoryActive(category) ? (
                                <button
                                  type="button"
                                  className="seller-context-menu__item seller-context-menu__item--danger"
                                  role="menuitem"
                                  disabled={saving}
                                  onClick={() => openDeactivateDialog(category)}
                                >
                                  Deactivate
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="seller-context-menu__item"
                                  role="menuitem"
                                  disabled={saving}
                                  onClick={() => openActivateDialog(category)}
                                >
                                  Activate
                                </button>
                              )}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div
                      className="seller-category__stats"
                      aria-label={`Performance for ${category.title.trim() || "category"}`}
                    >
                      <div className="seller-category__stat">
                        <span className="seller-category__stat-label">Views</span>
                        <strong className="seller-category__stat-value">
                          {formatCompactCount(stats.views)}
                        </strong>
                      </div>
                      <div className="seller-category__stat">
                        <span className="seller-category__stat-label">Requests</span>
                        <strong className="seller-category__stat-value">
                          {formatCompactCount(stats.requests)}
                        </strong>
                        {stats.pending > 0 ? (
                          <span className="seller-category__stat-hint">
                            {stats.pending} pending
                          </span>
                        ) : null}
                      </div>
                      <div className="seller-category__stat">
                        <span className="seller-category__stat-label">Completed</span>
                        <strong className="seller-category__stat-value">
                          {formatCompactCount(stats.completed)}
                        </strong>
                      </div>
                      <div className="seller-category__stat">
                        <span className="seller-category__stat-label">Earnings</span>
                        <strong className="seller-category__stat-value">
                          {formatCompactMoney(stats.earnings, stats.currency)}
                        </strong>
                      </div>
                      <div className="seller-category__stat">
                        <span className="seller-category__stat-label">Reviews</span>
                        <strong className="seller-category__stat-value">
                          {stats.reviews > 0 ? stats.rating.toFixed(1) : "—"}
                        </strong>
                        <span className="seller-category__stat-hint">
                          {stats.reviews > 0
                            ? `${formatCompactCount(stats.reviews)} review${
                                stats.reviews === 1 ? "" : "s"
                              }`
                            : "No reviews yet"}
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {tab === "inbox" ? (
        <div className="seller-inbox">
          {bookings.length === 0 ? (
            <div className="seller-placeholder">
              No incoming special requests yet. When fans book through your profile, they will appear
              here for accept / decline.
            </div>
          ) : (
            <div className="seller-table-wrap">
              <table className="seller-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Request</th>
                    <th>Fan</th>
                    <th>Total</th>
                    <th>Deliver by</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => {
                    const busy = pendingBookingId === booking.id;
                    const deliverByLabel = formatDeliverByLabel(booking.deliverBy);
                    return (
                      <tr
                        key={booking.id}
                        className="seller-table__row--link"
                        tabIndex={0}
                        role="link"
                        aria-label={`Open ${booking.requestLabel} (${booking.reference}) in Calendar`}
                        onClick={() => router.push(bookingDetailsHref(booking.id))}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            router.push(bookingDetailsHref(booking.id));
                          }
                        }}
                      >
                        <td>
                          <code className="seller-table__ref">{booking.reference}</code>
                          <div className="seller-table__sub">{booking.createdLabel}</div>
                        </td>
                        <td>
                          <strong>{booking.requestLabel}</strong>
                          <div className="seller-table__sub">
                            {[booking.category, booking.contentType].filter(Boolean).join(" · ")}
                          </div>
                        </td>
                        <td>
                          {booking.requesterName}
                          <div className="seller-table__sub">{booking.requesterEmail}</div>
                        </td>
                        <td>{booking.totalLabel}</td>
                        <td>{deliverByLabel || "—"}</td>
                        <td>
                          <span className={`booking-status ${bookingStatusClass(booking.status)}`}>
                            {booking.statusLabel}
                          </span>
                        </td>
                        <td
                          onClick={(event) => event.stopPropagation()}
                          onKeyDown={(event) => event.stopPropagation()}
                        >
                          {booking.status === "RECEIVED" ? (
                            <div className="seller-table__actions">
                              <button
                                type="button"
                                className="btn btn--primary btn--xs"
                                disabled={busy}
                                onClick={() => handleAccept(booking)}
                              >
                                Accept
                              </button>
                              <button
                                type="button"
                                className="btn btn--secondary btn--xs"
                                disabled={busy}
                                onClick={() => setDeclineDraft({ id: booking.id, reason: "" })}
                              >
                                Decline
                              </button>
                            </div>
                          ) : (
                            <span className="seller-table__sub">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {deactivateTarget ? (
        <div
          className="modal-backdrop is-open"
          role="dialog"
          aria-modal="true"
          aria-labelledby="deactivate-category-title"
        >
          <div className="modal seller-deactivate-modal">
            <h2 id="deactivate-category-title">Deactivate category?</h2>
            <p className="seller-deactivate-modal__copy">
              You’re about to deactivate{" "}
              <strong>{deactivateTarget.title.trim() || "Untitled category"}</strong>.
            </p>
            <ul className="seller-deactivate-modal__list">
              <li>This category and all of its offerings will be hidden from fans right away.</li>
              <li>Fans will no longer be able to start new bookings in this category.</li>
              <li>Existing requests in your inbox stay available — nothing is deleted.</li>
              <li>Your category details and offerings are kept, so you can reactivate anytime.</li>
            </ul>
            <div className="seller-form-actions">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={closeDeactivateDialog}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--danger"
                onClick={() => void confirmDeactivateCategory()}
                disabled={saving}
              >
                {saving ? "Deactivating…" : "Deactivate category"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {activateTarget ? (
        <div
          className="modal-backdrop is-open"
          role="dialog"
          aria-modal="true"
          aria-labelledby="activate-category-title"
        >
          <div className="modal seller-deactivate-modal">
            <h2 id="activate-category-title">Activate category?</h2>
            <p className="seller-deactivate-modal__copy">
              You’re about to activate{" "}
              <strong>{activateTarget.title.trim() || "Untitled category"}</strong>.
            </p>
            <ul className="seller-deactivate-modal__list">
              <li>This category becomes available again in Seller Tools as an active category.</li>
              <li>
                Fans can see and book it again once it has Ready offerings (published with required
                media).
              </li>
              <li>Draft offerings stay draft until you publish them separately.</li>
              <li>Existing inbox requests are unchanged.</li>
            </ul>
            <div className="seller-form-actions">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={closeActivateDialog}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => void confirmActivateCategory()}
                disabled={saving}
              >
                {saving ? "Activating…" : "Activate category"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {declineDraft ? (
        <div className="modal-backdrop is-open" role="dialog" aria-modal="true">
          <div className="modal">
            <h2>Decline booking?</h2>
            <p>Share a short reason. The fan is notified in Messages when a thread exists.</p>
            <form onSubmit={handleDeclineSubmit}>
              <label className="field">
                <span className="field-label">Reason</span>
                <textarea
                  className="input seller-textarea"
                  rows={4}
                  required
                  value={declineDraft.reason}
                  onChange={(event) =>
                    setDeclineDraft({ ...declineDraft, reason: event.target.value })
                  }
                />
              </label>
              <div className="seller-form-actions">
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => setDeclineDraft(null)}
                  disabled={pendingBookingId !== null}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn--danger"
                  disabled={pendingBookingId !== null}
                >
                  {pendingBookingId ? "Declining…" : "Decline"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
        </>
      )}
    </section>
  );
}
