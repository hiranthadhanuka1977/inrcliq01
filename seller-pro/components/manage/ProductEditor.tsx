"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  createEmptyProduct,
  defaultProductDetail,
  productHasCoreFields,
  slugifyProductKey,
  type SellerCollectionConfig,
} from "@/lib/seller/collection-helpers";
import type { CollectionProduct, CollectionProductKind } from "@/types/feed/collection";
import { readApiError } from "./api";
import { ImageField } from "./ImageField";

type Visibility = "draft" | "live" | "paused";

function visibilityOf(product: CollectionProduct): Visibility {
  if (product.active === false) return "paused";
  if (product.published === true) return "live";
  return "draft";
}

export function ProductEditor({
  config,
  product,
}: {
  config: SellerCollectionConfig;
  product: CollectionProduct | null;
}) {
  const router = useRouter();
  const creating = product === null;
  const [name, setName] = useState(creating ? "" : product.name);
  const [kind, setKind] = useState<CollectionProductKind>(product?.kind ?? "physical");
  const [price, setPrice] = useState(product?.price ?? "");
  const [compareAt, setCompareAt] = useState(product?.compareAtPrice ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [image, setImage] = useState(product?.image ?? "");
  const [visibility, setVisibility] = useState<Visibility>(product ? visibilityOf(product) : "draft");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function saveConfig(products: CollectionProduct[], nextId?: string) {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const response = await fetch("/api/seller/collection", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: config.enabled,
          title: config.title,
          subtitle: config.subtitle,
          products,
        }),
      });
      if (!response.ok) {
        setError(await readApiError(response, "Unable to save this product."));
        return false;
      }
      if (creating && nextId) {
        router.push(`/seller-pro/collection/products/${nextId}`);
      } else if (!nextId && products.every((item) => item.id !== product?.id)) {
        router.push("/seller-pro");
      } else {
        setSaved(true);
      }
      router.refresh();
      return true;
    } catch {
      setError("Unable to save this product.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  function buildProduct(): CollectionProduct | null {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Add a product name.");
      return null;
    }
    const used = new Set(config.products.filter((item) => item.id !== product?.id).map((item) => item.id));
    const id = product?.id ?? slugifyProductKey(trimmed, used);
    const base = product ?? createEmptyProduct(trimmed, used);
    const next: CollectionProduct = {
      ...base,
      id,
      kind,
      name: trimmed,
      price: price.trim(),
      compareAtPrice: compareAt.trim() || undefined,
      description: description.trim(),
      image,
      image_alt: trimmed,
      active: visibility !== "paused",
      published: visibility === "live",
      detail: {
        ...(base.detail ?? defaultProductDetail(trimmed)),
        headline: base.detail?.headline || trimmed,
      },
    };
    if (visibility === "live" && !productHasCoreFields(next)) {
      setError("A live product needs a name, price, description, and photo.");
      return null;
    }
    return next;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const next = buildProduct();
    if (!next) return;
    const products = product
      ? config.products.map((item) => (item.id === product.id ? next : item))
      : [...config.products, next];
    void saveConfig(products, next.id);
  }

  function removeProduct() {
    if (!product) return;
    if (!window.confirm(`Remove ${product.name || "this product"}? Fans will no longer see it.`)) return;
    void saveConfig(config.products.filter((item) => item.id !== product.id));
  }

  return (
    <>
      <div className="admin-pagehead">
        <div>
          <p className="admin-kicker">Collection</p>
          <h1>{creating ? "New product" : name.trim() || "Product"}</h1>
          <p>Name, price, a short description, and a photo. Fans see it only when you set it to Live.</p>
        </div>
        <a className="admin-btn admin-btn--subtle" href="/seller-pro">
          All products
        </a>
      </div>
      {error ? <p className="admin-banner admin-banner--err">{error}</p> : null}
      {saved ? <p className="admin-banner admin-banner--ok">Saved.</p> : null}
      <form className="studio-form" onSubmit={handleSubmit}>
        <label className="admin-field">
          Name
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Midnight hoodie" />
        </label>
        <p className="admin-field">
          What kind of product is this?
          <span className="studio-choice" role="group" aria-label="Product kind">
            <button type="button" className={kind === "physical" ? "is-active" : undefined} onClick={() => setKind("physical")}>
              <strong>Physical</strong>
              <span>Ships to the fan</span>
            </button>
            <button type="button" className={kind === "digital" ? "is-active" : undefined} onClick={() => setKind("digital")}>
              <strong>Digital</strong>
              <span>Delivered online</span>
            </button>
          </span>
        </p>
        <label className="admin-field">
          Price
          <input value={price} onChange={(event) => setPrice(event.target.value)} placeholder="$24" />
          <small>Shown exactly as you type it.</small>
        </label>
        <label className="admin-field">
          Compare-at price
          <input value={compareAt} onChange={(event) => setCompareAt(event.target.value)} placeholder="Optional" />
          <small>Leave blank unless you want a crossed-out price beside it.</small>
        </label>
        <label className="admin-field">
          Description
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What the fan is buying." />
        </label>
        <ImageField label="Photo" hint="JPG, PNG, WebP, or GIF." value={image} onChange={setImage} />
        <p className="admin-field">
          Who can see it?
          <span className="studio-choice" role="group" aria-label="Visibility">
            <button type="button" className={visibility === "draft" ? "is-active" : undefined} onClick={() => setVisibility("draft")}>
              <strong>Draft</strong>
              <span>Saved, hidden from fans</span>
            </button>
            <button type="button" className={visibility === "live" ? "is-active" : undefined} onClick={() => setVisibility("live")}>
              <strong>Live</strong>
              <span>Fans can buy it</span>
            </button>
            <button type="button" className={visibility === "paused" ? "is-active" : undefined} onClick={() => setVisibility("paused")}>
              <strong>Paused</strong>
              <span>Hidden until you bring it back</span>
            </button>
          </span>
        </p>
        <div className="admin-actions">
          <button className="admin-btn" type="submit" disabled={saving}>
            {saving ? "Saving…" : creating ? "Create product" : "Save product"}
          </button>
          {product ? (
            <button className="admin-btn admin-btn--danger" type="button" disabled={saving} onClick={removeProduct}>
              Remove
            </button>
          ) : null}
        </div>
      </form>
    </>
  );
}
