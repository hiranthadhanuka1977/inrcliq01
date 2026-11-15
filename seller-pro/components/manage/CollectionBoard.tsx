import {
  getProductReadiness,
  isProductActive,
  isProductLive,
  type SellerCollectionConfig,
} from "@/lib/seller/collection-helpers";
import type { CollectionProduct } from "@/types/feed/collection";
import { StorefrontEditor } from "./StorefrontEditor";

type FilterId = "all" | "live" | "draft" | "paused";
type ViewId = "tiles" | "list";

function tone(product: CollectionProduct) {
  const status = getProductReadiness(product).status;
  if (status === "ready") return "admin-lozenge admin-lozenge--success";
  if (status === "needs_setup") return "admin-lozenge admin-lozenge--warning";
  if (status === "draft") return "admin-lozenge admin-lozenge--info";
  return "admin-lozenge";
}

function label(product: CollectionProduct) {
  const status = getProductReadiness(product).status;
  if (status === "ready") return "Live";
  if (status === "needs_setup") return "Finish setup";
  if (status === "draft") return "Draft";
  return "Paused";
}

function matches(product: CollectionProduct, filter: FilterId) {
  if (filter === "live") return isProductLive(product);
  if (filter === "paused") return !isProductActive(product);
  if (filter === "draft") return isProductActive(product) && !isProductLive(product);
  return true;
}

function libraryHref(filter: FilterId, view: ViewId) {
  const params = new URLSearchParams();
  if (filter !== "all") params.set("filter", filter);
  if (view !== "tiles") params.set("view", view);
  const query = params.toString();
  return query ? `/seller-pro?${query}` : "/seller-pro";
}

export function CollectionBoard({
  config,
  previewHref,
  filter,
  view,
  section,
}: {
  config: SellerCollectionConfig;
  previewHref: string;
  filter: FilterId;
  view: ViewId;
  section: "products" | "storefront";
}) {
  if (section === "storefront") return <StorefrontEditor config={config} />;

  const counts = {
    all: config.products.length,
    live: config.products.filter((product) => matches(product, "live")).length,
    draft: config.products.filter((product) => matches(product, "draft")).length,
    paused: config.products.filter((product) => matches(product, "paused")).length,
  };
  const products = config.products.filter((product) => matches(product, filter));
  const filters: Array<{ id: FilterId; label: string }> = [
    { id: "all", label: "All" },
    { id: "live", label: "Live" },
    { id: "draft", label: "In progress" },
    { id: "paused", label: "Paused" },
  ];

  return (
    <>
      <div className="admin-pagehead">
        <div>
          <p className="admin-kicker">Collection</p>
          <h1>Your products</h1>
          <p>
            {config.enabled
              ? "This collection is showing on your profile."
              : "This collection is hidden from your profile."}{" "}
            Open a product to edit it, or add one.
          </p>
        </div>
        <div className="studio-page-actions">
          {previewHref ? (
            <a className="admin-btn admin-btn--subtle" href={previewHref} target="_blank" rel="noreferrer">
              Preview
            </a>
          ) : null}
          <a className="admin-btn admin-btn--subtle" href="/seller-pro?section=storefront">
            Storefront
          </a>
          <a className="admin-btn" href="/seller-pro/collection/products/new">
            New product
          </a>
        </div>
      </div>
      <div className="studio-library-bar">
        <div className="admin-stats">
          {filters.map((item) => (
            <a
              key={item.id}
              className={filter === item.id ? "admin-stat is-active" : "admin-stat"}
              href={libraryHref(item.id, view)}
            >
              <strong>{counts[item.id]}</strong> {item.label}
            </a>
          ))}
        </div>
        <div className="studio-view" role="group" aria-label="Product layout">
          <a className={view === "tiles" ? "is-active" : undefined} href={libraryHref(filter, "tiles")}>
            Tiles
          </a>
          <a className={view === "list" ? "is-active" : undefined} href={libraryHref(filter, "list")}>
            List
          </a>
        </div>
      </div>
      {products.length === 0 ? (
        <div className="admin-panel">
          <p className="admin-empty">
            {config.products.length === 0
              ? "No products yet. Add one with a name, price, description, and photo, then set it to Live."
              : "Nothing in this view."}
          </p>
        </div>
      ) : view === "tiles" ? (
        <div className="studio-library">
          {products.map((product) => (
            <a key={product.id} className="studio-card" href={`/seller-pro/collection/products/${product.id}`}>
              <span className="studio-card__media">
                {product.image ? <img src={product.image} alt="" /> : product.name.slice(0, 1) || "P"}
              </span>
              <span className="studio-card__body">
                <strong>{product.name || "Untitled"}</strong>
                <span className="admin-meta">
                  {product.kind === "digital" ? "Digital" : "Physical"}
                  {product.price ? ` · ${product.price}` : ""}
                </span>
                <span className={tone(product)}>{label(product)}</span>
              </span>
            </a>
          ))}
        </div>
      ) : (
        <div className="admin-panel">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Price</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>
                    <a href={`/seller-pro/collection/products/${product.id}`}>
                      {product.image ? <img className="studio-row-thumb" src={product.image} alt="" /> : null}
                      {product.name || "Untitled"}
                      <small className="admin-meta">{product.kind === "digital" ? "Digital" : "Physical"}</small>
                    </a>
                  </td>
                  <td>{product.price || "—"}</td>
                  <td>
                    <span className={tone(product)}>{label(product)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
