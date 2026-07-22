import Link from "next/link";
import type { ProfileCollectionItem } from "@/types/feed/profile";

export default function ProfileCollection({
  slug,
  items,
}: {
  slug: string;
  items: ProfileCollectionItem[];
}) {
  return (
    <section className="profile-collection" aria-labelledby="collection-heading">
      <div className="profile-collection__head">
        <h2 id="collection-heading">Collection</h2>
        <div className="profile-collection__actions">
          <Link
            href={`/feed/profile/${slug}/collection`}
            className="btn btn--secondary btn--sm profile-collection__shop"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            View Collection
          </Link>
        </div>
      </div>
      <ul className="profile-collection__list" id="collection-track">
        {items.map((item) => (
          <li key={item.id ?? item.name}>
            <Link
              href={
                item.id
                  ? `/feed/profile/${slug}/collection/${item.id}`
                  : `/feed/profile/${slug}/collection`
              }
              className="profile-collection__item"
            >
              <span className="profile-collection__thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.image} alt={item.image_alt} width={168} height={168} />
              </span>
              <span className="profile-collection__info">
                <span className="profile-collection__name">{item.name}</span>
                <span className="profile-collection__price">{item.price}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
