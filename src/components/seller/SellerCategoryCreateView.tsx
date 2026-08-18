"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { SellerImageUploadField } from "@/components/seller/SellerImageUploadField";
import type { CreatorRequestsContent, RequestCategory } from "@/lib/feed/special-requests";
import {
  createEmptyCategory,
  type SellerServiceRequestsConfig,
} from "@/lib/seller/service-requests-helpers";

const CATEGORY_ICONS = ["gift", "coach", "stage"] as const;
const BACK_HREF = "/seller/service-requests?tab=offerings";

type SellerCategoryCreateViewProps = {
  initialConfig: SellerServiceRequestsConfig;
};

export function SellerCategoryCreateView({ initialConfig }: SellerCategoryCreateViewProps) {
  const router = useRouter();
  const [enabled] = useState(initialConfig.enabled);
  const [content] = useState<CreatorRequestsContent>(initialConfig.content);
  const [title, setTitle] = useState("");
  const [intent, setIntent] = useState("");
  const [blurb, setBlurb] = useState("");
  const [icon, setIcon] = useState<RequestCategory["icon"]>("gift");
  const [image, setImage] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [popular, setPopular] = useState(false);
  const [instantBooking, setInstantBooking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Enter a category title before saving.");
      return;
    }

    setSaving(true);
    setError("");

    const used = new Set(content.categories.map((category) => category.id));
    const category = {
      ...createEmptyCategory(trimmedTitle, used),
      title: trimmedTitle,
      intent: intent.trim(),
      blurb: blurb.trim(),
      icon,
      image,
      imageAlt: imageAlt.trim() || trimmedTitle,
      popular,
      instantBooking,
    };

    const nextContent: CreatorRequestsContent = {
      ...content,
      categories: [...content.categories, category],
    };

    try {
      const response = await fetch("/api/seller/service-requests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          content: nextContent,
          autoStartingRange: true,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "Unable to save category.");
        return;
      }

      router.push(`/seller/service-requests/categories/${category.id}`);
      router.refresh();
    } catch {
      setError("Unable to save category.");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    router.push(BACK_HREF);
  }

  return (
    <section className="seller-panel" aria-labelledby="seller-category-create-title">
      <div className="seller-panel__head seller-requests-head">
        <div>
          <p className="seller-breadcrumb">
            <Link href={BACK_HREF}>Offerings</Link>
            <span aria-hidden="true"> / </span>
            <span>Add category</span>
          </p>
          <h1 className="seller-panel__title" id="seller-category-create-title">
            Add category
          </h1>
          <p className="seller-panel__subtitle">
            Create a category fans will pick first. Nothing is saved until you confirm with Save.
          </p>
        </div>
        <div className="seller-requests-head__actions">
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

      <form className="seller-category-create" onSubmit={handleSubmit}>
        <section className="seller-manage-section" aria-labelledby="new-cat-details">
          <header className="seller-manage-section__head">
            <div>
              <h2 id="new-cat-details" className="seller-manage-section__title">
                Category details
              </h2>
              <p className="seller-manage-section__hint">
                You can add offerings after this category is saved.
              </p>
            </div>
          </header>

          <div className="seller-form-grid">
            <label className="field">
              <span className="field-label">Title</span>
              <input
                className="input"
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Special occasion shout outs"
                disabled={saving}
              />
            </label>
            <label className="field">
              <span className="field-label">Intent (fan-facing)</span>
              <input
                className="input"
                value={intent}
                onChange={(event) => setIntent(event.target.value)}
                placeholder="Celebrate someone"
                disabled={saving}
              />
            </label>
            <label className="field">
              <span className="field-label">Icon</span>
              <select
                className="select"
                value={icon}
                onChange={(event) => setIcon(event.target.value as RequestCategory["icon"])}
                disabled={saving}
              >
                {CATEGORY_ICONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
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
              value={blurb}
              onChange={(event) => setBlurb(event.target.value)}
              placeholder="A line that helps fans understand this category"
              disabled={saving}
            />
          </label>

          <SellerImageUploadField
            label="Category background image"
            hint="Optional for now — required before offerings in this category can go live."
            value={image}
            aspect="square"
            disabled={saving}
            onChange={(url) => {
              setImage(url);
              if (!imageAlt.trim()) setImageAlt(title.trim() || "Category");
            }}
            onError={setError}
          />

          <label className="field">
            <span className="field-label">Image alt text</span>
            <input
              className="input"
              value={imageAlt}
              onChange={(event) => setImageAlt(event.target.value)}
              placeholder="Describe the image for accessibility"
              disabled={saving}
            />
          </label>

          <label className="seller-toggle seller-toggle--compact">
            <input
              type="checkbox"
              checked={popular}
              onChange={(event) => setPopular(event.target.checked)}
              disabled={saving}
            />
            <span>Mark category as popular</span>
          </label>

          <div className="seller-toggle seller-toggle--switch">
            <span>
              <strong id="create-instant-booking-label" className="seller-toggle__label-row">
                Instant booking
                <span className="help-tip">
                  <button
                    type="button"
                    className="help-tip__trigger"
                    aria-label="About instant booking"
                    aria-describedby="create-instant-booking-tip"
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
                  <span className="help-tip__content" id="create-instant-booking-tip" role="tooltip">
                    Instant bookings are approved automatically after payment. Other bookings stay
                    pending until you and the fan agree on the details and conditions.
                  </span>
                </span>
              </strong>
            </span>
            <label className={`toggle-switch${saving ? " is-disabled" : ""}`}>
              <input
                type="checkbox"
                checked={instantBooking}
                disabled={saving}
                onChange={(event) => setInstantBooking(event.target.checked)}
                aria-labelledby="create-instant-booking-label"
              />
              <span className="toggle-switch__track" aria-hidden="true">
                <span className="toggle-switch__thumb" />
              </span>
            </label>
          </div>

          <div className="seller-form-actions">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={handleCancel}
              disabled={saving}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? "Saving…" : "Save category"}
            </button>
          </div>
        </section>
      </form>
    </section>
  );
}
