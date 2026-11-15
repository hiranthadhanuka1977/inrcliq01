"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  createEmptyCategory,
  slugifyServiceId,
  type SellerServiceRequestsConfig,
} from "@/lib/seller/service-requests-helpers";
import { readApiError } from "./api";
import { ImageField } from "./ImageField";

export function NewCategoryForm({ config }: { config: SellerServiceRequestsConfig }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [intent, setIntent] = useState("");
  const [image, setImage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const name = title.trim();
    if (!name) {
      setError("Name this category.");
      return;
    }
    const used = new Set(config.content.categories.map((category) => category.id));
    const category = createEmptyCategory(name, used);
    category.title = name;
    category.intent = intent.trim();
    category.image = image;
    category.imageAlt = name;
    category.id = slugifyServiceId(name, used);
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/seller/service-requests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: config.enabled,
          content: { ...config.content, categories: [...config.content.categories, category] },
        }),
      });
      if (!response.ok) {
        setError(await readApiError(response, "Unable to create this category."));
        return;
      }
      router.push(`/seller-pro/service-requests/categories/${category.id}`);
      router.refresh();
    } catch {
      setError("Unable to create this category.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="admin-pagehead">
        <div>
          <p className="admin-kicker">Service requests</p>
          <h1>New category</h1>
          <p>A category is a group fans browse, like birthday messages or coaching. You add the bookable offerings next.</p>
        </div>
        <a className="admin-btn admin-btn--subtle" href="/seller-pro/service-requests">
          All categories
        </a>
      </div>
      {error ? <p className="admin-banner admin-banner--err">{error}</p> : null}
      <form className="studio-form" onSubmit={handleSubmit}>
        <label className="admin-field">
          Name
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Birthday messages" />
        </label>
        <label className="admin-field">
          Line fans see
          <input value={intent} onChange={(event) => setIntent(event.target.value)} placeholder="A short personal video" />
        </label>
        <ImageField label="Cover photo" hint="Fans see this on the category tile." value={image} onChange={setImage} />
        <div className="admin-actions">
          <button className="admin-btn" type="submit" disabled={saving}>
            {saving ? "Saving…" : "Create category"}
          </button>
        </div>
      </form>
    </>
  );
}
