import { BOOKING_FEE_PERCENT, bookingFeeDueNow } from "@/lib/feed/booking-fee";

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
  const bookingFee = bookingFeeDueNow(estimatedTotal);
  const amountLabel = `${estimatedTotal} ${currency}`;
  const feeLabel = `${bookingFee} ${currency}`;

  return (
    <div className={["booking-fee-notice", className].filter(Boolean).join(" ")}>
      <div className="booking-fee-notice__estimate">
        <span className="booking-fee-notice__label">Estimated total</span>
        <strong className="booking-fee-notice__amount">{amountLabel}</strong>
      </div>

      <div className="booking-fee-notice__fee">
        <div className="booking-fee-notice__fee-row">
          <span className="booking-fee-notice__fee-label">
            Booking fee ({BOOKING_FEE_PERCENT}%)
          </span>
          <strong className="booking-fee-notice__fee-amount">{feeLabel}</strong>
        </div>
        <p className="booking-fee-notice__fee-note">
          Required now to submit this booking request.
        </p>
      </div>

      <div className="booking-fee-notice__callout" role="note">
        <span className="booking-fee-notice__icon" aria-hidden="true">
          !
        </span>
        <div className="booking-fee-notice__copy">
          <p>
            A {feeLabel} booking fee ({BOOKING_FEE_PERCENT}% of the estimated total) will be
            charged now to confirm your request.
          </p>
          <p>This fee is refundable if the creator declines or does not respond.</p>
        </div>
      </div>
    </div>
  );
}
