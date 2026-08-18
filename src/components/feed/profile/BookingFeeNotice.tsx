import { BOOKING_FEE_PERCENT } from "@/lib/feed/booking-fee";

type BookingFeeNoticeProps = {
  estimatedTotal: number;
  currency?: string;
  className?: string;
};

export function BookingFeeNotice({
  estimatedTotal,
  currency = "USD",
  className,
}: BookingFeeNoticeProps) {
  const amountLabel = `${estimatedTotal} ${currency}`;

  return (
    <div className={["booking-fee-notice", className].filter(Boolean).join(" ")}>
      <div className="booking-fee-notice__estimate">
        <span className="booking-fee-notice__label">Estimated total</span>
        <strong className="booking-fee-notice__amount">{amountLabel}</strong>
      </div>
      <div className="booking-fee-notice__callout" role="note">
        <span className="booking-fee-notice__icon" aria-hidden="true">
          !
        </span>
        <div className="booking-fee-notice__copy">
          <p>A {BOOKING_FEE_PERCENT}% booking fee will be charged now to confirm your request.</p>
          <p>This fee is refundable if the creator declines or does not respond.</p>
        </div>
      </div>
    </div>
  );
}
