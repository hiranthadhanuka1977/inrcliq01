type SellerWalletViewProps = {
  displayName: string;
};

export function SellerWalletView({ displayName }: SellerWalletViewProps) {
  const firstName = displayName.split(" ")[0] || "you";

  return (
    <section className="seller-panel" aria-labelledby="seller-wallet-title">
      <header className="seller-panel__head">
        <h1 className="seller-panel__title" id="seller-wallet-title">
          My Money (Wallet)
        </h1>
        <p className="seller-panel__subtitle">
          Track incoming revenue, outgoing payments, and withdrawals for {firstName}.
        </p>
      </header>

      <div className="seller-placeholder seller-placeholder--empty">
        <p className="seller-placeholder__eyebrow">Feature not available</p>
        <p>
          This is where verified sellers will manage their wallet — incoming revenue from fans,
          outgoing funds, payout history, and withdrawals to their bank account.
        </p>
      </div>
    </section>
  );
}
