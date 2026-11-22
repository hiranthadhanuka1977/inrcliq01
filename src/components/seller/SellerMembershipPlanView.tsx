import Link from "next/link";
import { MembershipArt } from "@/components/seller/SellerIllustrations";
import {
  VERIFIED_MEMBERSHIP_PERIOD_LABEL,
  VERIFIED_MEMBERSHIP_PRICE_LABEL,
} from "@/lib/seller/constants";

const UNLOCKS = [
  "Seller Tools for your collection, service requests, and fan subscriptions",
  "Exclusive drops and a verified creator badge after payment",
  "Bookings and payouts on this adult account",
];

const RULES = [
  `${VERIFIED_MEMBERSHIP_PRICE_LABEL} is due today, then every ${VERIFIED_MEMBERSHIP_PERIOD_LABEL} until you cancel.`,
  "Cancel any time from Seller Tools. Access stays until the end of the period you already paid.",
  "The membership belongs to this account only. It is not transferable.",
  "Merchandise, services, and payouts still follow InrCliq creator rules.",
  "This checkout is a demo. No real card is charged.",
];

export function SellerMembershipPlanView({
  firstName,
}: {
  firstName?: string | null;
}) {
  const name = firstName?.trim() || "Creator";

  return (
    <section className="seller-age-verify seller-plan" aria-labelledby="seller-plan-title">
      <header className="seller-age-verify__intro">
        <p className="seller-verify__eyebrow">Verified membership</p>
        <h1 className="seller-verify__title" id="seller-plan-title">
          Review before you pay
        </h1>
        <p className="seller-verify__lead">
          Your age is already confirmed, {name}. This step is only the subscription.
        </p>
      </header>

      <div className="seller-plan__summary">
        <MembershipArt />
        <div>
          <p className="seller-plan__price">
            <strong>{VERIFIED_MEMBERSHIP_PRICE_LABEL}</strong>
            <span> / {VERIFIED_MEMBERSHIP_PERIOD_LABEL}</span>
          </p>
          <p className="seller-plan__due">Due today. Renews monthly until you cancel.</p>
        </div>
      </div>

      <section className="seller-plan__block" aria-labelledby="seller-plan-unlocks">
        <h2 id="seller-plan-unlocks">What this payment unlocks</h2>
        <ul>
          {UNLOCKS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="seller-plan__block" aria-labelledby="seller-plan-rules">
        <h2 id="seller-plan-rules">Subscription rules</h2>
        <ul>
          {RULES.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <div className="seller-age-verify__actions">
        <Link href="/seller#verified-membership" className="btn btn--secondary">
          Back
        </Link>
        <Link href="/seller/membership/checkout" className="btn btn--primary">
          Continue and pay
        </Link>
      </div>
    </section>
  );
}
