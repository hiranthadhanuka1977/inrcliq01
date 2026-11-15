"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { RequestService } from "@/lib/feed/special-requests";
import { createDefaultDeliveryFormats } from "@/lib/feed/delivery-formats";
import {
  createEmptyService,
  getServiceReadiness,
  serviceHasRequiredImage,
  slugifyServiceId,
  withServicePoster,
  type SellerServiceRequestsConfig,
} from "@/lib/seller/service-requests-helpers";
import { readApiError } from "./api";
import { ImageField } from "./ImageField";

type Draft = {
  id: string | null;
  label: string;
  blurb: string;
  priceMin: string;
  priceMax: string;
  image: string;
  published: boolean;
  text: boolean;
  audio: boolean;
  video: boolean;
  source: RequestService | null;
};

function blankDraft(): Draft {
  return {
    id: null,
    label: "",
    blurb: "",
    priceMin: "",
    priceMax: "",
    image: "",
    published: false,
    text: true,
    audio: true,
    video: true,
    source: null,
  };
}

function draftFrom(service: RequestService): Draft {
  const poster = service.media.kind === "video" ? service.media.poster : "";
  return {
    id: service.id,
    label: service.label,
    blurb: service.blurb,
    priceMin: String(service.priceMin),
    priceMax: String(service.priceMax),
    image: poster,
    published: service.published !== false,
    text: service.deliveryFormats?.text.enabled !== false,
    audio: service.deliveryFormats?.audio.enabled !== false,
    video: service.deliveryFormats?.video.enabled !== false,
    source: service,
  };
}

function priceLabel(service: RequestService) {
  return service.priceMin === service.priceMax ? `${service.priceMin}` : `${service.priceMin}–${service.priceMax}`;
}

function offeringLabel(service: RequestService) {
  const status = getServiceReadiness(service).status;
  if (status === "ready") return "Live";
  if (status === "needs_media") return "Needs a photo";
  return "Draft";
}

export function CategoryEditor({
  config,
  categoryId,
}: {
  config: SellerServiceRequestsConfig;
  categoryId: string;
}) {
  const router = useRouter();
  const initial = config.content.categories.find((category) => category.id === categoryId);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [intent, setIntent] = useState(initial?.intent ?? "");
  const [blurb, setBlurb] = useState(initial?.blurb ?? "");
  const [image, setImage] = useState(initial?.image ?? "");
  const [active, setActive] = useState(initial?.active !== false);
  const [services, setServices] = useState<RequestService[]>(initial?.services ?? []);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  if (!initial) return null;

  async function persist(nextServices: RequestService[], nextActive = active) {
    setSaving(true);
    setError("");
    setSaved(false);
    const categories = config.content.categories.map((category) =>
      category.id === categoryId
        ? {
            ...category,
            title: title.trim(),
            intent: intent.trim(),
            blurb: blurb.trim(),
            image,
            imageAlt: title.trim() || category.imageAlt,
            active: nextActive,
            services: nextServices,
          }
        : category,
    );
    try {
      const response = await fetch("/api/seller/service-requests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: config.enabled,
          content: { ...config.content, categories },
        }),
      });
      if (!response.ok) {
        setError(await readApiError(response, "Unable to save this category."));
        return false;
      }
      setServices(nextServices);
      setSaved(true);
      router.refresh();
      return true;
    } catch {
      setError("Unable to save this category.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  function handleCategory(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      setError("Name this category.");
      return;
    }
    void persist(services);
  }

  function handleOffering(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    const label = draft.label.trim();
    if (!label) {
      setError("Name this offering.");
      return;
    }
    const min = Number(draft.priceMin);
    const max = Number(draft.priceMax || draft.priceMin);
    if (!Number.isFinite(min) || min < 0 || !Number.isFinite(max) || max < min) {
      setError("Enter a price. The high price cannot be lower than the low price.");
      return;
    }
    const used = new Set(services.filter((service) => service.id !== draft.id).map((service) => service.id));
    const base = draft.source ?? createEmptyService(label, used);
    let next: RequestService = {
      ...base,
      id: draft.source?.id ?? slugifyServiceId(label, used),
      label,
      blurb: draft.blurb.trim(),
      priceMin: min,
      priceMax: max,
      published: draft.published,
    };
    if (draft.image) next = withServicePoster(next, draft.image);
    const formats = next.deliveryFormats ?? createDefaultDeliveryFormats();
    next = {
      ...next,
      deliveryFormats: {
        text: { ...formats.text, enabled: draft.text },
        audio: { ...formats.audio, enabled: draft.audio },
        video: { ...formats.video, enabled: draft.video },
      },
    };
    if (!draft.text && !draft.audio && !draft.video) {
      setError("Choose at least one way fans can receive this.");
      return;
    }
    if (draft.published && !serviceHasRequiredImage(next)) {
      setError("A live offering needs a photo.");
      return;
    }
    const nextServices = draft.source
      ? services.map((service) => (service.id === draft.source?.id ? next : service))
      : [...services, next];
    void persist(nextServices).then((ok) => {
      if (ok) setDraft(null);
    });
  }

  function removeCategory() {
    if (!window.confirm(`Remove ${title || "this category"} and its offerings?`)) return;
    setSaving(true);
    setError("");
    void fetch("/api/seller/service-requests", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enabled: config.enabled,
        content: {
          ...config.content,
          categories: config.content.categories.filter((category) => category.id !== categoryId),
        },
      }),
    })
      .then(async (response) => {
        if (!response.ok) {
          setError(await readApiError(response, "Unable to remove this category."));
          return;
        }
        router.push("/seller-pro/service-requests");
        router.refresh();
      })
      .catch(() => setError("Unable to remove this category."))
      .finally(() => setSaving(false));
  }

  function removeOffering(service: RequestService) {
    if (!window.confirm(`Remove ${service.label}?`)) return;
    void persist(services.filter((item) => item.id !== service.id)).then((ok) => {
      if (ok && draft?.id === service.id) setDraft(null);
    });
  }

  return (
    <>
      <div className="admin-pagehead">
        <div>
          <p className="admin-kicker">Service requests</p>
          <h1>{title.trim() || "Category"}</h1>
          <p>Fans pick a category, then book one offering inside it.</p>
        </div>
        <a className="admin-btn admin-btn--subtle" href="/seller-pro/service-requests">
          All categories
        </a>
      </div>
      {error ? <p className="admin-banner admin-banner--err">{error}</p> : null}
      {saved ? <p className="admin-banner admin-banner--ok">Saved.</p> : null}
      <form className="studio-form" onSubmit={handleCategory}>
        <label className="admin-field">
          Name
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label className="admin-field">
          Line fans see
          <input value={intent} onChange={(event) => setIntent(event.target.value)} placeholder="A short personal video" />
        </label>
        <label className="admin-field">
          Longer description
          <textarea value={blurb} onChange={(event) => setBlurb(event.target.value)} placeholder="Optional. Shown when a fan opens the category." />
        </label>
        <ImageField label="Cover photo" hint="Required before this category can go on your profile." value={image} onChange={setImage} />
        <p className="admin-field">
          Who can see it?
          <span className="studio-choice" role="group" aria-label="Category visibility">
            <button type="button" className={active ? "is-active" : undefined} onClick={() => setActive(true)}>
              <strong>On your page</strong>
              <span>Once an offering is live</span>
            </button>
            <button type="button" className={!active ? "is-active" : undefined} onClick={() => setActive(false)}>
              <strong>Paused</strong>
              <span>Hidden from fans</span>
            </button>
          </span>
        </p>
        <div className="admin-actions">
          <button className="admin-btn" type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save category"}
          </button>
          <button className="admin-btn admin-btn--danger" type="button" disabled={saving} onClick={removeCategory}>
            Remove
          </button>
        </div>
      </form>

      <div className="admin-pagehead">
        <div>
          <p className="admin-kicker">Offerings</p>
          <h1>What fans can book</h1>
          <p>Each offering has its own price. Fans can ask for it as text, audio, or video.</p>
        </div>
        <button className="admin-btn" type="button" onClick={() => setDraft(blankDraft())}>
          Add offering
        </button>
      </div>
      {services.length === 0 ? (
        <div className="admin-panel">
          <p className="admin-empty">No offerings yet. Add the specific thing a fan pays for.</p>
        </div>
      ) : (
        <div className="studio-offerings">
          {services.map((service) => (
            <button
              key={service.id}
              type="button"
              className={draft?.id === service.id ? "studio-offering is-active" : "studio-offering"}
              onClick={() => setDraft(draftFrom(service))}
            >
              <span>
                <strong>{service.label}</strong>
                <small>{priceLabel(service)}</small>
              </span>
              <span className={getServiceReadiness(service).status === "ready" ? "admin-lozenge admin-lozenge--success" : "admin-lozenge"}>
                {offeringLabel(service)}
              </span>
            </button>
          ))}
        </div>
      )}
      {draft ? (
        <form className="studio-form" onSubmit={handleOffering}>
          <label className="admin-field">
            Offering name
            <input value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} placeholder="Birthday shout-out" />
          </label>
          <label className="admin-field">
            Description
            <textarea value={draft.blurb} onChange={(event) => setDraft({ ...draft, blurb: event.target.value })} />
          </label>
          <label className="admin-field">
            Price from
            <input inputMode="decimal" value={draft.priceMin} onChange={(event) => setDraft({ ...draft, priceMin: event.target.value })} />
          </label>
          <label className="admin-field">
            Price to
            <input inputMode="decimal" value={draft.priceMax} onChange={(event) => setDraft({ ...draft, priceMax: event.target.value })} />
            <small>Use the same number in both fields for a fixed price.</small>
          </label>
          <ImageField label="Photo" hint="Fans see this on the offering." value={draft.image} onChange={(url) => setDraft({ ...draft, image: url })} />
          <p className="admin-field">
            How can fans receive it?
            <span className="studio-choice" role="group" aria-label="Delivery formats">
              {(
                [
                  ["text", "Text"],
                  ["audio", "Audio"],
                  ["video", "Video"],
                ] as const
              ).map(([key, name]) => (
                <button
                  key={key}
                  type="button"
                  className={draft[key] ? "is-active" : undefined}
                  onClick={() => setDraft({ ...draft, [key]: !draft[key] })}
                >
                  <strong>{name}</strong>
                </button>
              ))}
            </span>
          </p>
          <p className="admin-field">
            Who can book it?
            <span className="studio-choice" role="group" aria-label="Offering visibility">
              <button type="button" className={!draft.published ? "is-active" : undefined} onClick={() => setDraft({ ...draft, published: false })}>
                <strong>Draft</strong>
                <span>Hidden from fans</span>
              </button>
              <button type="button" className={draft.published ? "is-active" : undefined} onClick={() => setDraft({ ...draft, published: true })}>
                <strong>Live</strong>
                <span>Fans can book it</span>
              </button>
            </span>
          </p>
          <div className="admin-actions">
            <button className="admin-btn" type="submit" disabled={saving}>
              {saving ? "Saving…" : draft.source ? "Save offering" : "Add offering"}
            </button>
            {draft.source ? (
              <button className="admin-btn admin-btn--danger" type="button" disabled={saving} onClick={() => removeOffering(draft.source as RequestService)}>
                Remove offering
              </button>
            ) : (
              <button className="admin-btn admin-btn--subtle" type="button" onClick={() => setDraft(null)}>
                Cancel
              </button>
            )}
          </div>
        </form>
      ) : null}
    </>
  );
}
