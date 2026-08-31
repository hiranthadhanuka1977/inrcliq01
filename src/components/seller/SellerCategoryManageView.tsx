"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  SellerImageUploadField,
  servicePosterUrl,
} from "@/components/seller/SellerImageUploadField";
import type {
  CreatorRequestsContent,
  RequestCategory,
  RequestDeliveryFormatKind,
  RequestService,
} from "@/lib/feed/special-requests";
import { formatRequestPriceRange } from "@/lib/feed/special-requests";
import {
  enabledDeliveryFormatKinds,
  newLengthOption,
  resolveServiceDeliveryFormats,
} from "@/lib/feed/delivery-formats";
import {
  categoryHasRequiredImage,
  createEmptyService,
  getCategoryReadiness,
  getServiceReadiness,
  pruneOrphanGalleryItems,
  recomputeStartingRange,
  serviceHasRequiredImage,
  slugifyServiceId,
  withServicePoster,
  type SellerServiceRequestsConfig,
} from "@/lib/seller/service-requests-helpers";

const DELIVERY_FORMAT_LABELS: Record<RequestDeliveryFormatKind, string> = {
  text: "Text",
  audio: "Audio",
  video: "Video",
};

const CATEGORY_ICONS = ["gift", "coach", "stage"] as const;
const BACK_HREF = "/seller/service-requests?tab=offerings";

type ServiceEditTarget = {
  service: RequestService;
  isNew: boolean;
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

type SellerCategoryManageViewProps = {
  categoryId: string;
  initialConfig: SellerServiceRequestsConfig;
};

export function SellerCategoryManageView({
  categoryId,
  initialConfig,
}: SellerCategoryManageViewProps) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialConfig.enabled);
  const [content, setContent] = useState<CreatorRequestsContent>(initialConfig.content);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editTarget, setEditTarget] = useState<ServiceEditTarget | null>(null);
  const [publishPrompt, setPublishPrompt] = useState<RequestService | null>(null);
  const [publishLive, setPublishLive] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  const category = useMemo(
    () => content.categories.find((item) => item.id === categoryId) ?? null,
    [content.categories, categoryId],
  );

  const categoryDisplayName = category?.title.trim() || "Untitled category";
  const readiness = category ? getCategoryReadiness(category) : null;
  const canAddOffering = category ? categoryHasRequiredImage(category) : false;
  const deleteNameMatches = deleteConfirmName.trim() === categoryDisplayName;

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  async function saveConfig(nextEnabled: boolean, nextContent: CreatorRequestsContent) {
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
      setMessage("Saved. Fan profile requests will use this catalog.");
      return true;
    } catch {
      setError("Unable to save changes.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  function updateCategory(
    patch: Partial<
      Pick<
        RequestCategory,
        "title" | "intent" | "blurb" | "popular" | "icon" | "image" | "imageAlt" | "instantBooking"
      >
    >,
  ) {
    setContent((current) => ({
      ...current,
      categories: current.categories.map((item) =>
        item.id === categoryId ? { ...item, ...patch } : item,
      ),
    }));
  }

  async function saveCategoryDetails() {
    if (!category) return;

    // Draft categories (no offerings yet) can be saved without an image.
    // Once offerings exist, the tile image is required.
    if (category.services.length > 0 && !categoryHasRequiredImage(category)) {
      setError(
        `Add a background image for “${category.title || "Untitled category"}” before saving.`,
      );
      return;
    }

    await saveConfig(enabled, content);
  }

  function openNewService() {
    if (!category) return;
    const used = new Set(
      content.categories.flatMap((item) => item.services.map((service) => service.id)),
    );
    setPublishPrompt(null);
    setPublishLive(false);
    setEditTarget({
      service: createEmptyService("New service", used),
      isNew: true,
    });
  }

  function openEditService(service: RequestService) {
    setPublishPrompt(null);
    setPublishLive(false);
    setEditTarget({
      service: JSON.parse(JSON.stringify(service)) as RequestService,
      isNew: false,
    });
  }

  function requestServiceSave(service: RequestService) {
    if (!editTarget || !category) return;

    if (!serviceHasRequiredImage(service)) {
      setError("Add a preview image for this offering before saving.");
      return;
    }

    if (!categoryHasRequiredImage(category)) {
      setError(
        `Add a background image for “${category.title || "Untitled category"}” before adding offerings.`,
      );
      return;
    }

    if (editTarget.isNew) {
      setError("");
      setPublishLive(false);
      // Keep the filled draft on editTarget so Back can remount the editor with it.
      setEditTarget({ service, isNew: true });
      setPublishPrompt(service);
      return;
    }

    void commitServiceEdit(service);
  }

  function cancelPublishPrompt() {
    if (publishPrompt && editTarget) {
      setEditTarget({ service: publishPrompt, isNew: editTarget.isNew });
    }
    setPublishPrompt(null);
    setPublishLive(false);
  }

  async function confirmPublishPrompt() {
    if (!publishPrompt) return;
    const ok = await commitServiceEdit({ ...publishPrompt, published: publishLive });
    if (ok) {
      setPublishPrompt(null);
      setPublishLive(false);
    }
  }

  async function commitServiceEdit(service: RequestService): Promise<boolean> {
    if (!editTarget || !category) return false;

    if (!serviceHasRequiredImage(service)) {
      setError("Add a preview image for this offering before saving.");
      return false;
    }

    if (!categoryHasRequiredImage(category)) {
      setError(
        `Add a background image for “${category.title || "Untitled category"}” before adding offerings.`,
      );
      return false;
    }

    let nextService = service;
    if (editTarget.isNew) {
      const used = new Set(
        content.categories.flatMap((item) => item.services.map((entry) => entry.id)),
      );
      nextService = {
        ...service,
        id: slugifyServiceId(service.label, used),
        published: Boolean(service.published),
      };
    }

    const nextCategories = content.categories.map((item) => {
      if (item.id !== categoryId) return item;
      if (editTarget.isNew) {
        return { ...item, services: [...item.services, nextService] };
      }
      return {
        ...item,
        services: item.services.map((entry) =>
          entry.id === nextService.id ? nextService : entry,
        ),
      };
    });

    const nextContent: CreatorRequestsContent = {
      ...content,
      categories: nextCategories,
      startingRange: recomputeStartingRange({ ...content, categories: nextCategories }),
    };

    const ok = await saveConfig(enabled, nextContent);
    if (ok) setEditTarget(null);
    return ok;
  }

  async function removeService(serviceId: string) {
    const confirmed = window.confirm("Remove this offering from your public catalog?");
    if (!confirmed) return;

    const previousContent = content;
    const nextCategories = content.categories.map((item) => {
      if (item.id !== categoryId) return item;
      return {
        ...item,
        services: item.services.filter((service) => service.id !== serviceId),
      };
    });
    const nextContent = pruneOrphanGalleryItems({
      ...content,
      categories: nextCategories,
      startingRange: recomputeStartingRange({ ...content, categories: nextCategories }),
    });

    setContent(nextContent);
    const ok = await saveConfig(enabled, nextContent);
    if (!ok) setContent(previousContent);
  }

  function openDeleteDialog() {
    setMenuOpen(false);
    setDeleteConfirmName("");
    setDeleteOpen(true);
    setError("");
  }

  function closeDeleteDialog() {
    setDeleteOpen(false);
    setDeleteConfirmName("");
  }

  async function confirmDeleteCategory(event: FormEvent) {
    event.preventDefault();
    if (!category || !deleteNameMatches) return;

    const nextCategories = content.categories.filter((item) => item.id !== categoryId);
    const nextContent = pruneOrphanGalleryItems({
      ...content,
      categories: nextCategories,
      startingRange: recomputeStartingRange({ ...content, categories: nextCategories }),
    });

    const ok = await saveConfig(enabled, nextContent);
    if (ok) router.push(BACK_HREF);
  }

  if (!category || !readiness) {
    return (
      <section className="seller-panel">
        <div className="seller-empty">
          <strong>Category not found</strong>
          <p>This category may have been deleted. Return to your offerings list to continue.</p>
          <Link href={BACK_HREF} className="btn btn--secondary btn--sm">
            Back to offerings
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="seller-panel" aria-labelledby="seller-category-manage-title">
      <div className="seller-panel__head seller-requests-head">
        <div>
          <p className="seller-breadcrumb">
            <Link href={BACK_HREF}>Offerings</Link>
            <span aria-hidden="true"> / </span>
            <span>Manage category</span>
          </p>
          <div className="seller-panel__title-row">
            <h1 className="seller-panel__title" id="seller-category-manage-title">
              {category.title.trim() || "Untitled category"}
            </h1>
            <span className={`seller-status seller-status--${readiness.status}`}>
              {readiness.label}
            </span>
          </div>
          <p className="seller-panel__subtitle">
            Edit the category tile fans see first, then manage the bookable offerings inside it.
          </p>
        </div>
        <div className="seller-requests-head__actions">
          <div className="seller-context-menu" ref={menuRef}>
            <button
              type="button"
              className="btn btn--ghost btn--sm btn--icon seller-context-menu__trigger"
              aria-label="Category settings"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              disabled={saving}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" width="18" height="18">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
            {menuOpen ? (
              <div className="seller-context-menu__dropdown" role="menu" aria-label="Category settings">
                <button
                  type="button"
                  className="seller-context-menu__item seller-context-menu__item--danger"
                  role="menuitem"
                  disabled={saving}
                  onClick={openDeleteDialog}
                >
                  Delete category
                </button>
              </div>
            ) : null}
          </div>
          <Link href={BACK_HREF} className="btn btn--ghost btn--sm">
            Back to list
          </Link>
        </div>
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

      <div className="seller-category-manage">
        <section className="seller-manage-section" aria-labelledby="cat-tile-heading">
          <header className="seller-manage-section__head">
            <div>
              <h2 id="cat-tile-heading" className="seller-manage-section__title">
                Category tile
              </h2>
              <p className="seller-manage-section__hint">
                What fans see first when choosing an experience. Save these details separately from
                offerings.
              </p>
            </div>
          </header>

          <div className="seller-form-grid">
            <label className="field">
              <span className="field-label">Title</span>
              <input
                className="input"
                value={category.title}
                onChange={(event) => updateCategory({ title: event.target.value })}
                placeholder="Special occasion shout outs"
              />
            </label>
            <label className="field">
              <span className="field-label">Intent (fan-facing)</span>
              <input
                className="input"
                value={category.intent}
                onChange={(event) => updateCategory({ intent: event.target.value })}
                placeholder="Celebrate someone"
              />
            </label>
            <label className="field">
              <span className="field-label">Icon</span>
              <select
                className="select"
                value={category.icon}
                onChange={(event) =>
                  updateCategory({
                    icon: event.target.value as RequestCategory["icon"],
                  })
                }
              >
                {CATEGORY_ICONS.map((icon) => (
                  <option key={icon} value={icon}>
                    {icon}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="field">
            <span className="field-label">Short blurb</span>
            <textarea
              className="input seller-textarea"
              rows={2}
              value={category.blurb}
              onChange={(event) => updateCategory({ blurb: event.target.value })}
              placeholder="A line that helps fans understand this category"
            />
          </label>

          <SellerImageUploadField
            label="Category background image"
            hint="Used on the category tile in the fan choose flow. Required before offerings go live."
            value={category.image}
            required
            aspect="square"
            disabled={saving}
            onChange={(url) =>
              updateCategory({
                image: url,
                imageAlt: category.imageAlt || category.title || "Category",
              })
            }
            onError={setError}
          />

          <label className="field">
            <span className="field-label">Image alt text</span>
            <input
              className="input"
              value={category.imageAlt}
              onChange={(event) => updateCategory({ imageAlt: event.target.value })}
              placeholder="Describe the image for accessibility"
            />
          </label>

          <label className="seller-toggle seller-toggle--compact">
            <input
              type="checkbox"
              checked={Boolean(category.popular)}
              onChange={(event) => updateCategory({ popular: event.target.checked })}
            />
            <span>Mark category as popular</span>
          </label>

          <div className="seller-toggle seller-toggle--switch">
            <span>
              <strong id="instant-booking-label" className="seller-toggle__label-row">
                Instant booking
                <span className="help-tip">
                  <button
                    type="button"
                    className="help-tip__trigger"
                    aria-label="About instant booking"
                    aria-describedby="instant-booking-tip"
                  >
                    <svg
                      className="help-tip__icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  </button>
                  <span className="help-tip__content" id="instant-booking-tip" role="tooltip">
                    Instant bookings are approved automatically after payment. Other bookings stay
                    pending until you and the fan agree on the details and conditions.
                  </span>
                </span>
              </strong>
            </span>
            <label className={`toggle-switch${saving ? " is-disabled" : ""}`}>
              <input
                type="checkbox"
                checked={Boolean(category.instantBooking)}
                disabled={saving}
                onChange={(event) => updateCategory({ instantBooking: event.target.checked })}
                aria-labelledby="instant-booking-label"
              />
              <span className="toggle-switch__track" aria-hidden="true">
                <span className="toggle-switch__thumb" />
              </span>
            </label>
          </div>

          <div className="seller-form-actions">
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => void saveCategoryDetails()}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save category details"}
            </button>
          </div>
        </section>

        <section className="seller-manage-section" aria-labelledby="cat-offerings-heading">
          <header className="seller-manage-section__head">
            <div>
              <h2 id="cat-offerings-heading" className="seller-manage-section__title">
                Offerings in this category
              </h2>
              <p className="seller-manage-section__hint">
                Bookable services inside this category. Changes save as soon as you add, edit, or
                remove an offering.
              </p>
            </div>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={openNewService}
              disabled={saving || !canAddOffering}
              title={
                canAddOffering
                  ? undefined
                  : "Add a category background image before adding offerings"
              }
            >
              Add offering
            </button>
          </header>

          {!canAddOffering ? (
            <p className="seller-inline-hint" role="status">
              Add a category background image above before you can add offerings.
            </p>
          ) : null}

          {category.services.length === 0 ? (
            <div className="seller-empty seller-empty--inset">
              <strong>No offerings yet</strong>
              <p>Add the first bookable service fans can choose in this category.</p>
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={openNewService}
                disabled={saving || !canAddOffering}
              >
                Add offering
              </button>
            </div>
          ) : (
            <ul className="seller-service-list">
              {category.services.map((service) => {
                const poster = servicePosterUrl(service);
                const serviceReady = getServiceReadiness(service);
                return (
                  <li key={service.id} className="seller-service-row">
                    <div className="seller-service-row__media">
                      {poster ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={poster} alt="" />
                      ) : (
                        <span className="seller-service-row__media-empty">No image</span>
                      )}
                    </div>
                    <div className="seller-service-row__copy">
                      <div className="seller-service-row__top">
                        <strong>{service.label}</strong>
                        <span className={`seller-status seller-status--${serviceReady.status}`}>
                          {serviceReady.label}
                        </span>
                      </div>
                      <p>{service.blurb || "No short description yet."}</p>
                      <span className="seller-service-row__meta">
                        {formatRequestPriceRange(service.priceMin, service.priceMax)}
                        {service.popular ? " · Popular" : ""}
                        {service.media.kind === "audio" ? " · Audio" : ""}
                      </span>
                    </div>
                    <div className="seller-service-row__actions">
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        onClick={() => openEditService(service)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm seller-btn-danger"
                        onClick={() => void removeService(service.id)}
                        disabled={saving}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {editTarget && !publishPrompt ? (
        <ServiceEditorModal
          service={editTarget.service}
          isNew={editTarget.isNew}
          saving={saving}
          onClose={() => setEditTarget(null)}
          onSave={requestServiceSave}
        />
      ) : null}

      {publishPrompt ? (
        <div
          className="modal-backdrop is-open"
          role="dialog"
          aria-modal="true"
          aria-labelledby="publish-offering-title"
        >
          <div className="modal seller-publish-modal">
            <h2 id="publish-offering-title">Publish this offering?</h2>
            <p className="seller-publish-modal__copy">
              <strong>{publishPrompt.label.trim() || "Untitled offering"}</strong> will be saved to
              this category. Turn on the toggle below if you want fans to book it now. Leave it off
              to keep it as a draft.
            </p>
            <label className="seller-toggle">
              <input
                type="checkbox"
                checked={publishLive}
                onChange={(event) => setPublishLive(event.target.checked)}
                disabled={saving}
              />
              <span>
                <strong>Publish and make live</strong>
                <span className="seller-toggle__hint">
                  Ready state — visible on your public requests page for fans to book.
                </span>
              </span>
            </label>
            <div className="seller-form-actions">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={cancelPublishPrompt}
                disabled={saving}
              >
                Back
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => void confirmPublishPrompt()}
                disabled={saving}
              >
                {saving
                  ? "Saving…"
                  : publishLive
                    ? "Publish offering"
                    : "Save as draft"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteOpen ? (
        <div className="modal-backdrop is-open" role="dialog" aria-modal="true" aria-labelledby="delete-category-title">
          <div className="modal seller-delete-modal">
            <h2 id="delete-category-title">Delete category?</h2>
            <p className="seller-delete-modal__copy">
              This permanently removes the category and all of its offerings from your public
              catalog. To confirm, type the category name exactly:
            </p>
            <p className="seller-delete-modal__name">
              <strong>{categoryDisplayName}</strong>
            </p>
            <form onSubmit={(event) => void confirmDeleteCategory(event)}>
              <label className="field">
                <span className="field-label">Category name</span>
                <input
                  className="input"
                  value={deleteConfirmName}
                  onChange={(event) => setDeleteConfirmName(event.target.value)}
                  placeholder={categoryDisplayName}
                  autoFocus
                  disabled={saving}
                  autoComplete="off"
                />
              </label>
              <div className="seller-form-actions">
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={closeDeleteDialog}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn--danger"
                  disabled={saving || !deleteNameMatches}
                >
                  {saving ? "Deleting…" : "Delete category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ServiceEditorModal({
  service: initial,
  isNew,
  saving,
  onClose,
  onSave,
}: {
  service: RequestService;
  isNew: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (service: RequestService) => void | Promise<void>;
}) {
  const [service, setService] = useState<RequestService>(() => ({
    ...initial,
    deliveryFormats: resolveServiceDeliveryFormats(initial),
  }));
  const [onOfferText, setOnOfferText] = useState(linesToText(initial.details.onOffer));
  const [imageError, setImageError] = useState("");
  const [formatError, setFormatError] = useState("");
  const deliveryFormats = resolveServiceDeliveryFormats(service);

  function patchFormat(
    kind: RequestDeliveryFormatKind,
    patch: Partial<(typeof deliveryFormats)[RequestDeliveryFormatKind]>,
  ) {
    setFormatError("");
    setService((current) => {
      const formats = resolveServiceDeliveryFormats(current);
      return {
        ...current,
        deliveryFormats: {
          ...formats,
          [kind]: {
            ...formats[kind],
            ...patch,
          },
        },
      };
    });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const formats = resolveServiceDeliveryFormats(service);
    if (!enabledDeliveryFormatKinds(formats).length) {
      setFormatError("Enable at least one delivery format (Text, Audio, or Video).");
      return;
    }
    for (const kind of enabledDeliveryFormatKinds(formats)) {
      const config = formats[kind];
      if (config.lengthEnabled && !config.lengthOptions.length) {
        setFormatError(`Add at least one length option for ${DELIVERY_FORMAT_LABELS[kind]}.`);
        return;
      }
    }
    const next: RequestService = {
      ...service,
      label: service.label.trim(),
      blurb: service.blurb.trim(),
      priceMin: Number(service.priceMin) || 0,
      priceMax: Number(service.priceMax) || 0,
      deliveryFormats: formats,
      details: {
        ...service.details,
        about: service.details.about.trim(),
        onOffer: textToLines(onOfferText),
      },
    };
    if (!next.label) return;
    if (next.priceMax < next.priceMin) {
      next.priceMax = next.priceMin;
    }
    if (!serviceHasRequiredImage(next)) {
      setImageError("Add a preview image before saving this offering.");
      return;
    }
    setImageError("");
    setFormatError("");
    void onSave(next);
  }

  return (
    <div className="modal-backdrop is-open" role="dialog" aria-modal="true">
      <div className="modal seller-service-modal">
        <h2>{isNew ? "Add offering" : "Edit offering"}</h2>
        <p className="seller-service-modal__lead">
          This is what fans book inside the category. A preview image is required before it can go
          live.
        </p>
        <form onSubmit={handleSubmit}>
          <SellerImageUploadField
            label="Preview / sample image"
            hint="Shown on the service detail card fans see when booking."
            value={servicePosterUrl(service)}
            required
            aspect="wide"
            disabled={saving}
            onChange={(url) => {
              setImageError("");
              setService({
                ...withServicePoster(service, url),
                deliveryFormats: resolveServiceDeliveryFormats(service),
              });
            }}
            onError={setImageError}
          />
          {imageError ? (
            <p className="field-error" role="alert">
              {imageError}
            </p>
          ) : null}

          <div className="seller-form-grid">
            <label className="field">
              <span className="field-label">Offering name</span>
              <input
                className="input"
                required
                value={service.label}
                onChange={(event) => setService({ ...service, label: event.target.value })}
                placeholder="Birthday greeting"
              />
            </label>
            <label className="seller-toggle seller-toggle--compact">
              <input
                type="checkbox"
                checked={Boolean(service.popular)}
                onChange={(event) => setService({ ...service, popular: event.target.checked })}
              />
              <span>Mark as popular</span>
            </label>
          </div>
          {!isNew ? (
            <label className="seller-toggle">
              <input
                type="checkbox"
                checked={service.published !== false}
                onChange={(event) => setService({ ...service, published: event.target.checked })}
                disabled={saving}
              />
              <span>
                <strong>Publish and make live</strong>
                <span className="seller-toggle__hint">
                  When on, fans can book this offering on your public requests page.
                </span>
              </span>
            </label>
          ) : null}
          <label className="field">
            <span className="field-label">Short description</span>
            <input
              className="input"
              value={service.blurb}
              onChange={(event) => setService({ ...service, blurb: event.target.value })}
              placeholder="A one-line summary shown in the offering list"
            />
          </label>
          <div className="seller-form-grid">
            <label className="field">
              <span className="field-label">Price min ($)</span>
              <input
                className="input"
                type="number"
                min={0}
                value={service.priceMin}
                onChange={(event) =>
                  setService({ ...service, priceMin: Number(event.target.value) })
                }
              />
            </label>
            <label className="field">
              <span className="field-label">Price max ($)</span>
              <input
                className="input"
                type="number"
                min={0}
                value={service.priceMax}
                onChange={(event) =>
                  setService({ ...service, priceMax: Number(event.target.value) })
                }
              />
            </label>
          </div>

          <fieldset className="seller-delivery-formats">
            <legend className="seller-delivery-formats__legend">Delivery formats</legend>
            <p className="seller-delivery-formats__hint">
              Choose which formats fans can request. For each enabled format, decide which options
              they pick — and set length add-ons on top of the base price.
            </p>
            {(Object.keys(DELIVERY_FORMAT_LABELS) as RequestDeliveryFormatKind[]).map((kind) => {
              const config = deliveryFormats[kind];
              return (
                <div
                  key={kind}
                  className={`seller-delivery-format${config.enabled ? " is-enabled" : ""}`}
                >
                  <label className="seller-toggle seller-toggle--compact">
                    <input
                      type="checkbox"
                      checked={config.enabled}
                      disabled={saving}
                      onChange={(event) => patchFormat(kind, { enabled: event.target.checked })}
                    />
                    <span>
                      <strong>{DELIVERY_FORMAT_LABELS[kind]}</strong>
                    </span>
                  </label>

                  {config.enabled ? (
                    <div className="seller-delivery-format__body">
                      <div className="seller-delivery-format__options" role="group" aria-label={`${DELIVERY_FORMAT_LABELS[kind]} options`}>
                        {(
                          [
                            ["lengthEnabled", "Length"],
                            ["toneEnabled", "Tone"],
                            ["framingEnabled", "Framing"],
                            ["captionsEnabled", "Captions"],
                          ] as const
                        ).map(([key, label]) => (
                          <label key={key} className="seller-toggle seller-toggle--compact">
                            <input
                              type="checkbox"
                              checked={config[key]}
                              disabled={saving}
                              onChange={(event) => patchFormat(kind, { [key]: event.target.checked })}
                            />
                            <span>{label}</span>
                          </label>
                        ))}
                      </div>

                      {config.lengthEnabled ? (
                        <div className="seller-length-options">
                          <div className="seller-length-options__head">
                            <p className="seller-length-options__title">Length pricing</p>
                            <p className="seller-length-options__hint">
                              Add-on amounts are charged on top of the base (price min).
                            </p>
                          </div>
                          <div className="seller-length-options__rows">
                            {config.lengthOptions.map((option, index) => (
                              <div key={option.id} className="seller-length-options__row">
                                <label className="field">
                                  <span className="field-label">Label</span>
                                  <input
                                    className="input"
                                    value={option.label}
                                    disabled={saving}
                                    onChange={(event) => {
                                      const lengthOptions = config.lengthOptions.map((row, rowIndex) =>
                                        rowIndex === index
                                          ? { ...row, label: event.target.value }
                                          : row,
                                      );
                                      patchFormat(kind, { lengthOptions });
                                    }}
                                  />
                                </label>
                                <label className="field">
                                  <span className="field-label">Add-on ($)</span>
                                  <input
                                    className="input"
                                    type="number"
                                    min={0}
                                    step={1}
                                    value={option.priceAddon}
                                    disabled={saving}
                                    onChange={(event) => {
                                      const lengthOptions = config.lengthOptions.map((row, rowIndex) =>
                                        rowIndex === index
                                          ? {
                                              ...row,
                                              priceAddon: Math.max(0, Number(event.target.value) || 0),
                                            }
                                          : row,
                                      );
                                      patchFormat(kind, { lengthOptions });
                                    }}
                                  />
                                </label>
                                <button
                                  type="button"
                                  className="btn btn--secondary seller-length-options__remove"
                                  disabled={saving || config.lengthOptions.length <= 1}
                                  onClick={() => {
                                    patchFormat(kind, {
                                      lengthOptions: config.lengthOptions.filter((_, rowIndex) => rowIndex !== index),
                                    });
                                  }}
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                          <button
                            type="button"
                            className="btn btn--secondary seller-length-options__add"
                            disabled={saving}
                            onClick={() => {
                              patchFormat(kind, {
                                lengthOptions: [
                                  ...config.lengthOptions,
                                  newLengthOption(kind, config.lengthOptions.length + 1),
                                ],
                              });
                            }}
                          >
                            Add length option
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
            {formatError ? (
              <p className="field-error" role="alert">
                {formatError}
              </p>
            ) : null}
          </fieldset>

          <label className="field">
            <span className="field-label">About</span>
            <textarea
              className="input seller-textarea"
              rows={3}
              value={service.details.about}
              onChange={(event) =>
                setService({
                  ...service,
                  details: { ...service.details, about: event.target.value },
                })
              }
              placeholder="Describe the experience for fans"
            />
          </label>
          <label className="field">
            <span className="field-label">What&apos;s included (one per line)</span>
            <textarea
              className="input seller-textarea"
              rows={4}
              value={onOfferText}
              onChange={(event) => setOnOfferText(event.target.value)}
              placeholder={"Personalized video message\nDelivered by your chosen date"}
            />
          </label>
          <div className="seller-form-actions">
            <button type="button" className="btn btn--secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? "Saving…" : isNew ? "Add offering" : "Save offering"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
