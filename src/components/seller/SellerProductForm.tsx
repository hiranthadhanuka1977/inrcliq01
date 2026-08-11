"use client";

import { SellerImageUploadField } from "@/components/seller/SellerImageUploadField";
import {
  defaultProductDetail,
  productHasCoreFields,
} from "@/lib/seller/collection-helpers";
import type {
  CollectionProduct,
  CollectionProductColor,
  CollectionProductGalleryImage,
  CollectionProductSize,
} from "@/types/feed/collection";

type SellerProductFormProps = {
  product: CollectionProduct;
  onChange: (product: CollectionProduct) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
};

function updateDetail(
  product: CollectionProduct,
  patch: Partial<NonNullable<CollectionProduct["detail"]>>,
): CollectionProduct {
  const detail = {
    ...defaultProductDetail(product.name),
    ...(product.detail ?? {}),
    ...patch,
  };
  return { ...product, detail };
}

export function SellerProductForm({
  product,
  onChange,
  onError,
  disabled = false,
}: SellerProductFormProps) {
  const detail = product.detail ?? defaultProductDetail(product.name);
  const gallery = detail.gallery ?? [];
  const colors = detail.colors ?? [];
  const sizes = detail.sizes ?? [];
  const delivery = detail.delivery;

  return (
    <div className="seller-requests-form">
      <div className="seller-form-grid">
        <label className="field">
          <span className="field-label">Product name</span>
          <input
            className="input"
            value={product.name}
            disabled={disabled}
            onChange={(event) =>
              onChange({
                ...product,
                name: event.target.value,
                image_alt: product.image_alt || event.target.value,
              })
            }
            placeholder="Mumbai Marathon Tee"
          />
        </label>
        <label className="field">
          <span className="field-label">Kind</span>
          <select
            className="input"
            value={product.kind}
            disabled={disabled}
            onChange={(event) =>
              onChange({
                ...product,
                kind: event.target.value === "digital" ? "digital" : "physical",
              })
            }
          >
            <option value="physical">Physical</option>
            <option value="digital">Digital</option>
          </select>
        </label>
        <label className="field">
          <span className="field-label">Price</span>
          <input
            className="input"
            value={product.price}
            disabled={disabled}
            onChange={(event) => onChange({ ...product, price: event.target.value })}
            placeholder="$32"
          />
        </label>
        <label className="field">
          <span className="field-label">Compare-at price</span>
          <input
            className="input"
            value={product.compareAtPrice ?? ""}
            disabled={disabled}
            onChange={(event) =>
              onChange({
                ...product,
                compareAtPrice: event.target.value || undefined,
              })
            }
            placeholder="$38"
          />
        </label>
        <label className="field">
          <span className="field-label">CTA label</span>
          <input
            className="input"
            value={product.ctaLabel ?? ""}
            disabled={disabled}
            onChange={(event) =>
              onChange({
                ...product,
                ctaLabel: event.target.value || undefined,
              })
            }
            placeholder="Add to bag"
          />
        </label>
        <label className="field">
          <span className="field-label">Image alt text</span>
          <input
            className="input"
            value={product.image_alt}
            disabled={disabled}
            onChange={(event) => onChange({ ...product, image_alt: event.target.value })}
          />
        </label>
      </div>

      <label className="field">
        <span className="field-label">Short description</span>
        <textarea
          className="input seller-textarea"
          rows={3}
          value={product.description}
          disabled={disabled}
          onChange={(event) => onChange({ ...product, description: event.target.value })}
        />
      </label>

      <SellerImageUploadField
        label="Main product image"
        hint="Shown on the collection grid and product page."
        value={product.image}
        required
        aspect="square"
        disabled={disabled}
        onChange={(url) => onChange({ ...product, image: url })}
        onError={onError}
      />

      <div className="seller-toggle">
        <span>
          <strong>Publish product</strong>
          <span className="seller-toggle__hint">
            Drafts stay hidden until published
            {productHasCoreFields(product) ? "" : " (needs name, price, description, and image)"}.
          </span>
        </span>
        <label className={`toggle-switch${disabled ? " is-disabled" : ""}`}>
          <input
            type="checkbox"
            checked={product.published === true}
            disabled={disabled}
            onChange={(event) => onChange({ ...product, published: event.target.checked })}
          />
          <span className="toggle-switch__track" aria-hidden="true">
            <span className="toggle-switch__thumb" />
          </span>
        </label>
      </div>

      <div className="seller-form-grid">
        <label className="field">
          <span className="field-label">Offer badge</span>
          <input
            className="input"
            value={product.offer?.badge ?? ""}
            disabled={disabled}
            onChange={(event) =>
              onChange({
                ...product,
                offer: {
                  badge: event.target.value,
                  detail: product.offer?.detail ?? "",
                  discountLabel: product.offer?.discountLabel,
                },
              })
            }
            placeholder="Limited Edition"
          />
        </label>
        <label className="field">
          <span className="field-label">Offer detail</span>
          <input
            className="input"
            value={product.offer?.detail ?? ""}
            disabled={disabled}
            onChange={(event) =>
              onChange({
                ...product,
                offer: {
                  badge: product.offer?.badge ?? "",
                  detail: event.target.value,
                  discountLabel: product.offer?.discountLabel,
                },
              })
            }
            placeholder="Pre-order open"
          />
        </label>
        <label className="field">
          <span className="field-label">Discount label</span>
          <input
            className="input"
            value={product.offer?.discountLabel ?? ""}
            disabled={disabled}
            onChange={(event) =>
              onChange({
                ...product,
                offer: {
                  badge: product.offer?.badge ?? "",
                  detail: product.offer?.detail ?? "",
                  discountLabel: event.target.value || undefined,
                },
              })
            }
            placeholder="-17%"
          />
        </label>
      </div>

      <label className="field">
        <span className="field-label">Product page headline</span>
        <input
          className="input"
          value={detail.headline}
          disabled={disabled}
          onChange={(event) => onChange(updateDetail(product, { headline: event.target.value }))}
        />
      </label>

      <label className="field">
        <span className="field-label">Long description</span>
        <textarea
          className="input seller-textarea"
          rows={4}
          value={detail.longDescription}
          disabled={disabled}
          onChange={(event) =>
            onChange(updateDetail(product, { longDescription: event.target.value }))
          }
        />
      </label>

      <div className="seller-gallery-setup">
        <div className="seller-offerings__toolbar">
          <div>
            <h2 className="seller-gallery-setup__title">Gallery images</h2>
            <p className="seller-offerings__hint">Optional extra photos for the product page.</p>
          </div>
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            disabled={disabled}
            onClick={() => {
              const next: CollectionProductGalleryImage = {
                src: "",
                alt: `${product.name || "Product"} gallery`,
              };
              onChange(updateDetail(product, { gallery: [...gallery, next] }));
            }}
          >
            Add image
          </button>
        </div>
        <div className="seller-gallery-setup__list">
          {gallery.map((item, index) => (
            <article key={`gallery-${index}`} className="seller-gallery-setup__item">
              <SellerImageUploadField
                label={`Gallery image ${index + 1}`}
                value={item.src}
                aspect="square"
                disabled={disabled}
                onChange={(url) => {
                  const next = gallery.map((entry, entryIndex) =>
                    entryIndex === index ? { ...entry, src: url } : entry,
                  );
                  onChange(updateDetail(product, { gallery: next }));
                }}
                onError={onError}
              />
              <label className="field">
                <span className="field-label">Alt text</span>
                <input
                  className="input"
                  value={item.alt}
                  disabled={disabled}
                  onChange={(event) => {
                    const next = gallery.map((entry, entryIndex) =>
                      entryIndex === index ? { ...entry, alt: event.target.value } : entry,
                    );
                    onChange(updateDetail(product, { gallery: next }));
                  }}
                />
              </label>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={disabled}
                onClick={() => {
                  onChange(
                    updateDetail(product, {
                      gallery: gallery.filter((_, entryIndex) => entryIndex !== index),
                    }),
                  );
                }}
              >
                Remove image
              </button>
            </article>
          ))}
        </div>
      </div>

      {product.kind === "physical" ? (
        <>
          <div className="seller-gallery-setup">
            <div className="seller-offerings__toolbar">
              <div>
                <h2 className="seller-gallery-setup__title">Sizes</h2>
                <p className="seller-offerings__hint">Optional size options for physical products.</p>
              </div>
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                disabled={disabled}
                onClick={() => {
                  const id = `size-${sizes.length + 1}`;
                  const next: CollectionProductSize = { id, label: "", hint: "" };
                  onChange(
                    updateDetail(product, {
                      sizes: [...sizes, next],
                      defaultSizeId: detail.defaultSizeId || id,
                    }),
                  );
                }}
              >
                Add size
              </button>
            </div>
            {sizes.map((size, index) => (
              <div key={size.id} className="seller-form-grid">
                <label className="field">
                  <span className="field-label">Size label</span>
                  <input
                    className="input"
                    value={size.label}
                    disabled={disabled}
                    onChange={(event) => {
                      const next = sizes.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, label: event.target.value } : entry,
                      );
                      onChange(updateDetail(product, { sizes: next }));
                    }}
                    placeholder="M"
                  />
                </label>
                <label className="field">
                  <span className="field-label">Hint</span>
                  <input
                    className="input"
                    value={size.hint}
                    disabled={disabled}
                    onChange={(event) => {
                      const next = sizes.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, hint: event.target.value } : entry,
                      );
                      onChange(updateDetail(product, { sizes: next }));
                    }}
                    placeholder="54-63kg"
                  />
                </label>
                <div className="field">
                  <span className="field-label">&nbsp;</span>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    disabled={disabled}
                    onClick={() => {
                      const next = sizes.filter((_, entryIndex) => entryIndex !== index);
                      onChange(
                        updateDetail(product, {
                          sizes: next,
                          defaultSizeId:
                            detail.defaultSizeId === size.id
                              ? next[0]?.id || ""
                              : detail.defaultSizeId,
                        }),
                      );
                    }}
                  >
                    Remove size
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="seller-gallery-setup">
            <div className="seller-offerings__toolbar">
              <div>
                <h2 className="seller-gallery-setup__title">Colors</h2>
                <p className="seller-offerings__hint">Optional color variants with swatches.</p>
              </div>
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                disabled={disabled}
                onClick={() => {
                  const id = `color-${colors.length + 1}`;
                  const next: CollectionProductColor = {
                    id,
                    label: "",
                    swatch: "#cccccc",
                    image: product.image || "",
                  };
                  onChange(
                    updateDetail(product, {
                      colors: [...colors, next],
                      defaultColorId: detail.defaultColorId || id,
                    }),
                  );
                }}
              >
                Add color
              </button>
            </div>
            {colors.map((color, index) => (
              <div key={color.id} className="seller-form-grid">
                <label className="field">
                  <span className="field-label">Color label</span>
                  <input
                    className="input"
                    value={color.label}
                    disabled={disabled}
                    onChange={(event) => {
                      const next = colors.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, label: event.target.value } : entry,
                      );
                      onChange(updateDetail(product, { colors: next }));
                    }}
                    placeholder="Olive"
                  />
                </label>
                <label className="field">
                  <span className="field-label">Swatch</span>
                  <input
                    className="input"
                    value={color.swatch}
                    disabled={disabled}
                    onChange={(event) => {
                      const next = colors.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, swatch: event.target.value } : entry,
                      );
                      onChange(updateDetail(product, { colors: next }));
                    }}
                    placeholder="#5f6b4e"
                  />
                </label>
                <div className="field">
                  <span className="field-label">&nbsp;</span>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    disabled={disabled}
                    onClick={() => {
                      const next = colors.filter((_, entryIndex) => entryIndex !== index);
                      onChange(
                        updateDetail(product, {
                          colors: next,
                          defaultColorId:
                            detail.defaultColorId === color.id
                              ? next[0]?.id || ""
                              : detail.defaultColorId,
                        }),
                      );
                    }}
                  >
                    Remove color
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="seller-form-grid">
            <label className="field">
              <span className="field-label">Ship from</span>
              <input
                className="input"
                value={delivery.location}
                disabled={disabled}
                onChange={(event) =>
                  onChange(
                    updateDetail(product, {
                      delivery: { ...delivery, location: event.target.value },
                    }),
                  )
                }
              />
            </label>
            <label className="field">
              <span className="field-label">Standard fee</span>
              <input
                className="input"
                value={delivery.standardFee}
                disabled={disabled}
                onChange={(event) =>
                  onChange(
                    updateDetail(product, {
                      delivery: { ...delivery, standardFee: event.target.value },
                    }),
                  )
                }
              />
            </label>
            <label className="field">
              <span className="field-label">Returns</span>
              <input
                className="input"
                value={delivery.returns}
                disabled={disabled}
                onChange={(event) =>
                  onChange(
                    updateDetail(product, {
                      delivery: { ...delivery, returns: event.target.value },
                    }),
                  )
                }
              />
            </label>
            <label className="field">
              <span className="field-label">Warranty</span>
              <input
                className="input"
                value={delivery.warranty}
                disabled={disabled}
                onChange={(event) =>
                  onChange(
                    updateDetail(product, {
                      delivery: { ...delivery, warranty: event.target.value },
                    }),
                  )
                }
              />
            </label>
          </div>
          <div className="seller-toggle">
            <span>
              <strong>Cash on delivery</strong>
            </span>
            <label className={`toggle-switch${disabled ? " is-disabled" : ""}`}>
              <input
                type="checkbox"
                checked={delivery.cod}
                disabled={disabled}
                onChange={(event) =>
                  onChange(
                    updateDetail(product, {
                      delivery: { ...delivery, cod: event.target.checked },
                    }),
                  )
                }
              />
              <span className="toggle-switch__track" aria-hidden="true">
                <span className="toggle-switch__thumb" />
              </span>
            </label>
          </div>
        </>
      ) : null}
    </div>
  );
}
