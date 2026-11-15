"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { SellerCollectionConfig } from "@/lib/seller/collection-helpers";
import { readApiError } from "./api";

export function StorefrontEditor({ config }: { config: SellerCollectionConfig }) {
  const router = useRouter();
  const [title, setTitle] = useState(config.title);
  const [subtitle, setSubtitle] = useState(config.subtitle);
  const [enabled, setEnabled] = useState(config.enabled);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const response = await fetch("/api/seller/collection", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          title: title.trim(),
          subtitle: subtitle.trim(),
          products: config.products,
        }),
      });
      if (!response.ok) {
        setError(await readApiError(response, "Unable to save the storefront."));
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("Unable to save the storefront.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="admin-pagehead">
        <div>
          <p className="admin-kicker">Collection</p>
          <h1>Storefront</h1>
          <p>The title fans see above your products. Hide the whole collection until you are ready.</p>
        </div>
        <a className="admin-btn admin-btn--subtle" href="/seller-pro">
          All products
        </a>
      </div>
      {error ? <p className="admin-banner admin-banner--err">{error}</p> : null}
      {saved ? <p className="admin-banner admin-banner--ok">Saved.</p> : null}
      <form className="studio-form" onSubmit={handleSubmit}>
        <label className="admin-field">
          Title
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Shop" />
        </label>
        <label className="admin-field">
          Subtitle
          <input value={subtitle} onChange={(event) => setSubtitle(event.target.value)} placeholder="A short line under the title" />
        </label>
        <label className="admin-check">
          <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
          Show this collection on your profile
        </label>
        <p className="studio-note">You need at least one live product before the collection can appear.</p>
        <div className="admin-actions">
          <button className="admin-btn" type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save storefront"}
          </button>
        </div>
      </form>
    </>
  );
}
