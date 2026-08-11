"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { SellerProductForm } from "@/components/seller/SellerProductForm";
import {
  createEmptyProduct,
  productHasCoreFields,
  slugifyProductKey,
  type SellerCollectionConfig,
} from "@/lib/seller/collection-helpers";
import type { CollectionProduct } from "@/types/feed/collection";

const BACK_HREF = "/seller/collection?tab=products";

type SellerProductCreateViewProps = {
  initialConfig: SellerCollectionConfig;
};

export function SellerProductCreateView({ initialConfig }: SellerProductCreateViewProps) {
  const router = useRouter();
  const [config] = useState(initialConfig);
  const [product, setProduct] = useState<CollectionProduct>(() =>
    createEmptyProduct("New product", new Set(initialConfig.products.map((item) => item.id))),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (!product.name.trim()) {
      setError("Add a product name.");
      return;
    }

    if (product.published && !productHasCoreFields(product)) {
      setError("Published products need a name, price, description, and image.");
      return;
    }

    const used = new Set(config.products.map((item) => item.id));
    const payloadProduct: CollectionProduct = {
      ...product,
      id: slugifyProductKey(product.name, used),
      name: product.name.trim(),
    };

    setSaving(true);
    try {
      const response = await fetch("/api/seller/collection", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: config.enabled,
          title: config.title,
          subtitle: config.subtitle,
          products: [...config.products, payloadProduct],
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "Unable to create product.");
        return;
      }
      router.push(`/seller/collection/products/${payloadProduct.id}`);
      router.refresh();
    } catch {
      setError("Unable to create product.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="seller-panel" aria-labelledby="seller-product-create-title">
      <div className="seller-panel__head">
        <div>
          <p className="seller-panel__eyebrow">
            <Link href={BACK_HREF}>← Back to products</Link>
          </p>
          <h1 className="seller-panel__title" id="seller-product-create-title">
            Add product
          </h1>
          <p className="seller-panel__subtitle">
            Create a physical or digital product for your collection storefront.
          </p>
        </div>
      </div>

      {error ? (
        <p className="seller-banner seller-banner--error" role="alert">
          {error}
        </p>
      ) : null}

      <form onSubmit={handleSubmit}>
        <SellerProductForm
          product={product}
          onChange={setProduct}
          onError={setError}
          disabled={saving}
        />
        <div className="seller-form-actions">
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? "Creating…" : "Create product"}
          </button>
          <Link href={BACK_HREF} className="btn btn--secondary">
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}
