import Link from "next/link";
import {
  VERIFIED_FOLLOWER_THRESHOLD,
  VERIFIED_MEMBERSHIP_PERIOD_LABEL,
  VERIFIED_MEMBERSHIP_PRICE_LABEL,
} from "@/lib/seller/constants";

const BENEFITS = [
  {
    title: "Sell merchandise",
    copy: "Run a Collection storefront for physical merch and digital downloads fans can buy from your profile.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  },
  {
    title: "Exclusive content",
    copy: "Share members-only posts and drops that stay behind your verified creator tools.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
  {
    title: "Fan subscriptions",
    copy: "Offer a paid membership so fans can support you monthly and unlock your exclusive work.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
  },
  {
    title: "Custom service requests",
    copy: "Let fans book personalized text, audio, or video — with pricing, formats, and delivery you control.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <path d="m9 16 2 2 4-4" />
      </svg>
    ),
  },
] as const;

function formatFollowers(value: number) {
  return value.toLocaleString();
}

export function SellerVerifyMarketingView({
  firstName,
  followerCount,
}: {
  firstName?: string | null;
  followerCount: number;
}) {
  const name = firstName?.trim() || "Creator";
  const goal = VERIFIED_FOLLOWER_THRESHOLD;
  const remaining = Math.max(0, goal - followerCount);
  const progress = Math.min(100, Math.round((followerCount / goal) * 100));
  const reachedFollowers = followerCount >= goal;

  return (
    <section className="seller-verify" aria-labelledby="seller-verify-title">
      <div className="seller-verify__hero">
        <p className="seller-verify__eyebrow">Verified creators</p>
        <h1 className="seller-verify__title" id="seller-verify-title">
          Unlock Seller Tools
          <svg
            className="seller-verify__star"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </h1>
        <p className="seller-verify__lead">
          Welcome, {name}. Seller Tools is for verified creators — the people who can sell, publish
          exclusives, and take custom bookings. Get verified by growing your audience, or skip the
          wait with membership.
        </p>
      </div>

      <div className="seller-verify__paths" aria-label="How to become verified">
        <article className="seller-verify__path">
          <p className="seller-verify__path-kicker">Path 1</p>
          <h2 className="seller-verify__path-title">Reach {formatFollowers(goal)} followers</h2>
          <p className="seller-verify__path-copy">
            Build your audience on INRCLIQ. Once you hit {formatFollowers(goal)} followers, you
            become eligible for the verified badge and Seller Tools.
          </p>
          <div
            className="seller-verify__progress"
            role="img"
            aria-label={`${formatFollowers(followerCount)} of ${formatFollowers(goal)} followers`}
          >
            <div className="seller-verify__progress-meta">
              <strong>
                {formatFollowers(followerCount)} / {formatFollowers(goal)}
              </strong>
              <span>
                {reachedFollowers
                  ? "You’ve hit the follower threshold"
                  : `${formatFollowers(remaining)} to go`}
              </span>
            </div>
            <div className="seller-verify__bar" aria-hidden="true">
              <span className="seller-verify__bar-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <Link href="/feed" className="btn btn--secondary">
            Grow on the feed
          </Link>
        </article>

        <article className="seller-verify__path seller-verify__path--featured" id="verified-membership">
          <p className="seller-verify__path-kicker">Path 2</p>
          <h2 className="seller-verify__path-title">Pay for Verified membership</h2>
          <p className="seller-verify__path-copy">
            Don’t want to wait for {formatFollowers(goal)} followers? Join Verified membership and
            unlock Seller Tools right away.
          </p>
          <p className="seller-verify__price">
            <strong>{VERIFIED_MEMBERSHIP_PRICE_LABEL}</strong>
            <span> / {VERIFIED_MEMBERSHIP_PERIOD_LABEL}</span>
          </p>
          <Link href="/seller/membership/checkout" className="btn btn--primary">
            Subscribe
          </Link>
        </article>
      </div>

      <div className="seller-verify__benefits">
        <h2 className="seller-verify__benefits-title">What verified creators can do</h2>
        <ul className="seller-verify__benefit-grid">
          {BENEFITS.map((benefit) => (
            <li key={benefit.title} className="seller-verify__benefit">
              <span className="seller-verify__benefit-icon">{benefit.icon}</span>
              <h3>{benefit.title}</h3>
              <p>{benefit.copy}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
