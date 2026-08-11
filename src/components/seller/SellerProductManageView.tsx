"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { SellerProductForm } from "@/components/seller/SellerProductForm";
import {
  getProductReadiness,
  productHasCoreFields,
  type SellerCollectionConfig,
} from "@/lib/seller/collection-helpers";
import type { CollectionProduct } from "@/types/feed/collection";

const BACK_HREF = "/seller/collection?tab=products";

type SellerProductManageViewProps = {
  productKey: string;
  initialConfig: SellerCollectionConfig;
};

export function SellerProductManageView({
  productKey,
  initialConfig,
}: SellerProductManageViewProps) {
  const router = useRouter();
  const [enabled] = useState(initialConfig.enabled);
  const [title] = useState(initialConfig.title);
  const [subtitle] = useState(initialConfig.subtitle);
  const [products, setProducts] = useState(initialConfig.products);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");

  const product = useMemo(
    () => products.find((item) => item.id === productKey) ?? null,
    [products, productKey],
  );

  const readiness = product ? getProductReadiness(product) : null;
  const displayName = product?.name.trim() || "Untitled product";
  const deleteNameMatches = deleteConfirmName.trim() === displayName;

  async function saveProducts(
    nextProducts: CollectionProduct[],
    options?: { successMessage?: string; redirectOnDelete?: boolean },
  ) {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/seller/collection", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          title,
          subtitle,
          products: nextProducts,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "Unable to save product.");
        return false;
      }

      setProducts(data.products);
      if (options?.redirectOnDelete) {
        router.push(BACK_HREF);
        router.refresh();
        return true;
      }
      setMessage(options?.successMessage ?? "Product saved.");
      return true;
    } catch {
      setError("Unable to save product.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!product) return;

    if (product.published && !productHasCoreFields(product)) {
      setError("Published products need a name, price, description, and image.");
      return;
    }

    await saveProducts(products);
  }

  function updateProduct(next: CollectionProduct) {
    setProducts((current) =>
      current.map((item) => (item.id === productKey ? next : item)),
    );
  }

  async function handleDelete() {
    if (!product || !deleteNameMatches) return;
    await saveProducts(
      products.filter((item) => item.id !== productKey),
      { redirectOnDelete: true },
    );
  }

  if (!product) {
    return (
      <section className="seller-panel">
        <div className="seller-empty">
          <strong>Product not found</strong>
          <p>This product may have been deleted.</p>
          <Link href={BACK_HREF} className="btn btn--primary btn--sm">
            Back to products
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="seller-panel" aria-labelledby="seller-product-manage-title">
      <div className="seller-panel__head">
        <div>
          <p className="seller-panel__eyebrow">
            <Link href={BACK_HREF}>← Back to products</Link>
          </p>
          <h1 className="seller-panel__title" id="seller-product-manage-title">
            {displayName}
          </h1>
          <p className="seller-panel__subtitle">
            Edit listing details, gallery, and publish state for this product.
          </p>
        </div>
        {readiness ? (
          <span className={`seller-status seller-status--${readiness.status}`}>
            {readiness.label}
          </span>
        ) : null}
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

      <form onSubmit={handleSubmit}>
        <SellerProductForm
          product={product}
          onChange={updateProduct}
          onError={setError}
          disabled={saving}
        />
        <div className="seller-form-actions">
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? "Saving…" : "Save product"}
          </button>
          <button
            type="button"
            className="btn btn--danger"
            disabled={saving}
            onClick={() => {
              setDeleteConfirmName("");
              setDeleteOpen(true);
            }}
          >
            Delete product
          </button>
        </div>
      </form>

      {deleteOpen ? (
        <div className="modal-backdrop is-open" role="dialog" aria-modal="true">
          <div className="modal text-center">
            <h2>Delete product?</h2>
            <p className="subtitle mt-4">
              This removes “{displayName}” from your collection. Type the product name to confirm.
            </p>
            <label className="field mt-6 text-left">
              <span className="field-label">Product name</span>
              <input
                className="input"
                value={deleteConfirmName}
                onChange={(event) => setDeleteConfirmName(event.target.value)}
                placeholder={displayName}
              />
            </label>
            <button
              type="button"
              className="btn btn--danger mt-8"
              disabled={saving || !deleteNameMatches}
              onClick={() => void handleDelete()}
            >
              {saving ? "Deleting…" : "Delete permanently"}
            </button>
            <button
              type="button"
              className="btn btn--outline-info mt-3"
              disabled={saving}
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
