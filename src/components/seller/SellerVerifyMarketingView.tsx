import Link from "next/link";
import {
  ExclusiveArt,
  GrowthArt,
  MembershipArt,
  MerchArt,
  ServicesArt,
  UnlockArt,
} from "@/components/seller/SellerIllustrations";
import {
  VERIFIED_FOLLOWER_THRESHOLD,
  VERIFIED_MEMBERSHIP_PERIOD_LABEL,
  VERIFIED_MEMBERSHIP_PRICE_LABEL,
} from "@/lib/seller/constants";

const BENEFITS = [
  {
    title: "Sell merchandise",
    copy: "A verified storefront reaches fans beyond the people who already follow you. They can buy physical merch and downloads from your profile.",
    art: <MerchArt />,
  },
  {
    title: "Custom service requests",
    copy: "Fans book personalized text, audio, or video. You set the price, the format, and when it is delivered.",
    art: <ServicesArt />,
  },
  {
    title: "Fan subscriptions",
    copy: "A monthly membership gives fans a way to support you and stay close to the work you publish.",
    art: <MembershipArt />,
  },
  {
    title: "Exclusive content",
    copy: "Members-only posts and releases stay behind your verified creator tools, so the people who pay see them first.",
    art: <ExclusiveArt />,
  },
];

function formatFollowers(value: number) {
  return value.toLocaleString();
}

export function SellerVerifyMarketingView({
  firstName,
  followerCount,
  identityVerified = false,
}: {
  firstName?: string | null;
  followerCount: number;
  identityVerified?: boolean;
}) {
  const name = firstName?.trim() || "Creator";
  const goal = VERIFIED_FOLLOWER_THRESHOLD;
  const remaining = Math.max(0, goal - followerCount);
  const progress = Math.min(100, Math.round((followerCount / goal) * 100));
  const reachedFollowers = followerCount >= goal;

  return (
    <section className="seller-verify" aria-labelledby="seller-verify-title">
      <div className="seller-verify__hero">
        <UnlockArt />
        <div className="seller-verify__hero-copy">
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
            Welcome, {name}. Seller Tools is for verified creators — the people who can sell to a
            wider fan base, publish exclusives, and take custom bookings. Grow your audience, or
            skip the wait with membership.
          </p>
        </div>
      </div>

      <div className="seller-verify__paths" aria-label="How to become verified">
        <article className="seller-verify__path">
          <GrowthArt />
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
          <MembershipArt />
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
          <Link
            href={identityVerified ? "/seller/membership/plan" : "/seller/membership/verify"}
            className="btn btn--primary"
          >
            Subscribe
          </Link>
        </article>
      </div>

      <div className="seller-verify__benefits">
        <h2 className="seller-verify__benefits-title">What verified creators can do</h2>
        <ul className="seller-verify__benefit-grid">
          {BENEFITS.map((benefit) => (
            <li key={benefit.title} className="seller-verify__benefit">
              {benefit.art}
              <h3>{benefit.title}</h3>
              <p>{benefit.copy}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
