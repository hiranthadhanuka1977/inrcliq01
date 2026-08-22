type SellerSubscriptionsViewProps = {
  displayName: string;
};

export function SellerSubscriptionsView({ displayName }: SellerSubscriptionsViewProps) {
  const firstName = displayName.split(" ")[0] || "you";

  return (
    <section className="seller-panel" aria-labelledby="seller-subscriptions-title">
      <header className="seller-panel__head">
        <h1 className="seller-panel__title" id="seller-subscriptions-title">
          Subscriptions
        </h1>
        <p className="seller-panel__subtitle">
          Set up and manage paid subscription plans for {firstName}&apos;s fans.
        </p>
      </header>

      <div className="seller-placeholder seller-placeholder--empty">
        <p className="seller-placeholder__eyebrow">Feature not available</p>
        <p>
          This is where verified sellers will manage subscription plans for their fans — pricing,
          benefits, and who gets access to exclusive content.
        </p>
      </div>
    </section>
  );
}
