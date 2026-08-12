"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  getProductReadiness,
  isProductActive,
  type SellerCollectionConfig,
} from "@/lib/seller/collection-helpers";
import type { CollectionProduct } from "@/types/feed/collection";

type TabId = "products" | "setup";

type SellerCollectionViewProps = {
  slug: string;
  previewHref: string;
  initialConfig: SellerCollectionConfig;
  initialTab?: TabId;
};

function parseInitialTab(value: TabId | undefined): TabId {
  return value === "setup" ? "setup" : "products";
}

export function SellerCollectionView({
  slug,
  previewHref,
  initialConfig,
  initialTab,
}: SellerCollectionViewProps) {
  const [tab, setTab] = useState<TabId>(parseInitialTab(initialTab));
  const [enabled, setEnabled] = useState(() => initialConfig.enabled !== false);
  const [title, setTitle] = useState(() => initialConfig.title ?? "");
  const [subtitle, setSubtitle] = useState(() => initialConfig.subtitle ?? "");
  const [products, setProducts] = useState<CollectionProduct[]>(() => initialConfig.products ?? []);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [menuProductId, setMenuProductId] = useState<string | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<CollectionProduct | null>(null);
  const [activateTarget, setActivateTarget] = useState<CollectionProduct | null>(null);
  const [introDismissed, setIntroDismissed] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const readyCount = useMemo(
    () => products.filter((product) => getProductReadiness(product).status === "ready").length,
    [products],
  );
  const needsSetupIntro = products.length === 0 && !introDismissed;

  useEffect(() => {
    if (!menuProductId) return;

    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuProductId(null);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuProductId(null);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuProductId]);

  async function saveConfig(
    next: SellerCollectionConfig,
    options?: { successMessage?: string },
  ) {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/seller/collection", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "Unable to save changes.");
        return false;
      }

      setEnabled(data.enabled !== false);
      setTitle(typeof data.title === "string" ? data.title : "");
      setSubtitle(typeof data.subtitle === "string" ? data.subtitle : "");
      setProducts(Array.isArray(data.products) ? data.products : []);
      setMessage(options?.successMessage ?? "Saved. Your public storefront will use this catalog.");
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

    const ok = await saveConfig(
      { enabled: nextEnabled, title, subtitle, products },
      {
        successMessage: nextEnabled
          ? "Collection is now live on your profile."
          : "Collection is hidden from your profile.",
      },
    );

    if (!ok) {
      setEnabled(previous);
    }
  }

  async function handleSaveSetup(event: FormEvent) {
    event.preventDefault();
    await saveConfig({ enabled, title, subtitle, products });
  }

  async function setProductActive(product: CollectionProduct, active: boolean) {
    const nextProducts = products.map((item) =>
      item.id === product.id ? { ...item, active } : item,
    );
    setDeactivateTarget(null);
    setActivateTarget(null);
    setMenuProductId(null);

    const ok = await saveConfig(
      { enabled, title, subtitle, products: nextProducts },
      {
        successMessage: active
          ? `"${product.name || "Product"}" is active again.`
          : `"${product.name || "Product"}" is deactivated.`,
      },
    );

    if (!ok) {
      setProducts(products);
    }
  }

  return (
    <section className="seller-panel" aria-labelledby="seller-collection-title">
      <div className="seller-panel__head seller-requests-head">
        <div>
          <h1 className="seller-panel__title" id="seller-collection-title">
            Collection
          </h1>
          <p className="seller-panel__subtitle">
            {needsSetupIntro
              ? "Sell merch and digital downloads from your profile with a storefront you control."
              : `Configure the same products fans see on your profile storefront for @${slug}.`}
          </p>
        </div>
        {!needsSetupIntro ? (
          <div className="seller-requests-head__actions">
            <Link href={previewHref} className="btn btn--secondary btn--sm" target="_blank">
              Preview storefront
            </Link>
          </div>
        ) : null}
      </div>

      {needsSetupIntro ? (
        <div className="seller-sr-intro">
          <div className="seller-sr-intro__copy">
            <p className="seller-sr-intro__eyebrow">Getting started</p>
            <h2 className="seller-sr-intro__title">Introduce your Collection to fans</h2>
            <p className="seller-sr-intro__lead">
              Build a storefront for physical merch and digital downloads. Add products, set pricing,
              and go live on your profile when you&apos;re ready.
            </p>
            <ul className="seller-sr-intro__points">
              <li>Add physical products or digital downloads fans can buy</li>
              <li>Upload images, pricing, and product details</li>
              <li>Keep the storefront hidden until your first product is ready</li>
            </ul>
            <div className="seller-sr-intro__actions">
              <Link href="/seller/collection/products/new" className="btn btn--primary">
                Add your first product
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

          <div className="seller-sr-intro__media" aria-label="Collection overview video">
            <div className="seller-sr-intro__video" role="img" aria-label="Video placeholder">
              <span className="seller-sr-intro__play" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                  <path d="M8 5.14v13.72L19 12 8 5.14z" />
                </svg>
              </span>
              <div className="seller-sr-intro__video-copy">
                <strong>Watch how Collection works</strong>
                <span>Video coming soon</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
      <div className="seller-requests-summary" aria-label="Collection summary">
        <div className="seller-requests-summary__item">
          <span className="seller-requests-summary__label">Storefront</span>
          <strong>{enabled ? "Live" : "Hidden"}</strong>
        </div>
        <div className="seller-requests-summary__item">
          <span className="seller-requests-summary__label">Products</span>
          <strong>{products.length}</strong>
        </div>
        <div className="seller-requests-summary__item">
          <span className="seller-requests-summary__label">Ready</span>
          <strong>{readyCount}</strong>
        </div>
      </div>

      <div className="seller-tabs" role="tablist" aria-label="Collection sections">
        {(
          [
            { id: "products", label: "Products" },
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

      {tab === "setup" ? (
        <form className="seller-requests-form" onSubmit={handleSaveSetup}>
          <div className="seller-toggle seller-toggle--switch">
            <span>
              <strong id="collection-profile-label">Show Collection on profile</strong>
              <span className="seller-toggle__hint">
                Controls the collection strip and `/collection` storefront fans browse.
              </span>
            </span>
            <label className={`toggle-switch${saving ? " is-disabled" : ""}`}>
              <input
                type="checkbox"
                checked={Boolean(enabled)}
                disabled={saving}
                onChange={(event) => void handleEnabledToggle(event.target.checked)}
                aria-labelledby="collection-profile-label"
              />
              <span className="toggle-switch__track" aria-hidden="true">
                <span className="toggle-switch__thumb" />
              </span>
            </label>
          </div>

          <div className="seller-form-grid">
            <label className="field">
              <span className="field-label">Storefront title</span>
              <input
                className="input"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={`${slug} Collection`}
              />
            </label>
            <label className="field">
              <span className="field-label">Subtitle</span>
              <input
                className="input"
                value={subtitle}
                onChange={(event) => setSubtitle(event.target.value)}
                placeholder="Race-day gear and digital packs"
              />
            </label>
          </div>

          <div className="seller-form-actions">
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? "Saving…" : "Save setup"}
            </button>
          </div>
        </form>
      ) : null}

      {tab === "products" ? (
        <div className="seller-offerings">
          <div className="seller-offerings__toolbar">
            <div>
              <h2 className="seller-offerings__title">Products</h2>
              <p className="seller-offerings__hint">
                Open Manage to edit a product. Only products marked Ready appear publicly when
                Collection is live.
              </p>
            </div>
            <Link href="/seller/collection/products/new" className="btn btn--secondary btn--sm">
              Add product
            </Link>
          </div>

          {products.length === 0 ? (
            <div className="seller-empty">
              <strong>No products yet</strong>
              <p>Add physical merch or digital downloads fans can buy from your profile.</p>
              <Link href="/seller/collection/products/new" className="btn btn--primary btn--sm">
                Add your first product
              </Link>
            </div>
          ) : (
            <div className="seller-category-list">
              {products.map((product) => {
                const readiness = getProductReadiness(product);
                return (
                  <article key={product.id} className="seller-category">
                    <div className="seller-category__summary">
                      <div className="seller-category__thumb" aria-hidden="true">
                        {product.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={product.image} alt="" />
                        ) : (
                          <span className="seller-category__thumb-empty">No image</span>
                        )}
                      </div>

                      <div className="seller-category__summary-copy">
                        <div className="seller-category__summary-top">
                          <h3 className="seller-category__name">
                            {product.name.trim() || "Untitled product"}
                          </h3>
                          <span className={`seller-status seller-status--${readiness.status}`}>
                            {readiness.label}
                          </span>
                        </div>
                        <p className="seller-category__intent">
                          {product.description.trim() || "Add a short description fans will see"}
                        </p>
                        <p className="seller-category__meta">
                          {product.kind === "digital" ? "Digital" : "Physical"}
                          {product.price.trim() ? ` · ${product.price.trim()}` : ""}
                          {product.offer?.badge ? ` · ${product.offer.badge}` : ""}
                        </p>
                      </div>

                      <div className="seller-category__summary-actions">
                        <Link
                          href={`/seller/collection/products/${product.id}`}
                          className="btn btn--secondary btn--sm"
                        >
                          Manage
                        </Link>
                        <div
                          className="seller-context-menu"
                          ref={menuProductId === product.id ? menuRef : undefined}
                        >
                          <button
                            type="button"
                            className="btn btn--ghost btn--sm btn--icon seller-context-menu__trigger"
                            aria-label={`Settings for ${product.name.trim() || "product"}`}
                            aria-haspopup="menu"
                            aria-expanded={menuProductId === product.id}
                            disabled={saving}
                            onClick={() =>
                              setMenuProductId((current) =>
                                current === product.id ? null : product.id,
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
                          {menuProductId === product.id ? (
                            <div
                              className="seller-context-menu__dropdown"
                              role="menu"
                              aria-label="Product options"
                            >
                              <Link
                                href={`/seller/collection/products/${product.id}`}
                                className="seller-context-menu__item"
                                role="menuitem"
                                onClick={() => setMenuProductId(null)}
                              >
                                Manage
                              </Link>
                              {isProductActive(product) ? (
                                <button
                                  type="button"
                                  className="seller-context-menu__item seller-context-menu__item--danger"
                                  role="menuitem"
                                  disabled={saving}
                                  onClick={() => {
                                    setMenuProductId(null);
                                    setActivateTarget(null);
                                    setDeactivateTarget(product);
                                  }}
                                >
                                  Deactivate
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="seller-context-menu__item"
                                  role="menuitem"
                                  disabled={saving}
                                  onClick={() => {
                                    setMenuProductId(null);
                                    setDeactivateTarget(null);
                                    setActivateTarget(product);
                                  }}
                                >
                                  Activate
                                </button>
                              )}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {deactivateTarget ? (
        <div className="modal-backdrop is-open" role="dialog" aria-modal="true">
          <div className="modal text-center">
            <h2>Deactivate product?</h2>
            <p className="subtitle mt-4">
              “{deactivateTarget.name || "Untitled product"}” will be hidden from your public
              storefront. You can activate it again later.
            </p>
            <button
              type="button"
              className="btn btn--danger mt-8"
              disabled={saving}
              onClick={() => void setProductActive(deactivateTarget, false)}
            >
              {saving ? "Saving…" : "Deactivate"}
            </button>
            <button
              type="button"
              className="btn btn--outline-info mt-3"
              disabled={saving}
              onClick={() => setDeactivateTarget(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {activateTarget ? (
        <div className="modal-backdrop is-open" role="dialog" aria-modal="true">
          <div className="modal text-center">
            <h2>Activate product?</h2>
            <p className="subtitle mt-4">
              “{activateTarget.name || "Untitled product"}” will be available again when it is also
              marked Ready (published with required fields).
            </p>
            <button
              type="button"
              className="btn btn--primary mt-8"
              disabled={saving}
              onClick={() => void setProductActive(activateTarget, true)}
            >
              {saving ? "Saving…" : "Activate"}
            </button>
            <button
              type="button"
              className="btn btn--outline-info mt-3"
              disabled={saving}
              onClick={() => setActivateTarget(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
        </>
      )}
    </section>
  );
}
