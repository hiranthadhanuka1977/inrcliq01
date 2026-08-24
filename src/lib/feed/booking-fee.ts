export const BOOKING_FEE_PERCENT = 5;

export function bookingFeeDueNow(estimatedTotal: number): number {
  if (!Number.isFinite(estimatedTotal) || estimatedTotal <= 0) return 0;
  return Math.max(1, Math.round(estimatedTotal * (BOOKING_FEE_PERCENT / 100)));
}

export function paidAmountOnBooking(input: {
  totalFee: number;
  instantBooking?: boolean | null;
  status?: string | null;
  detailsJson?: unknown;
}): number {
  const total = Number.isFinite(input.totalFee) ? Math.round(input.totalFee) : 0;
  if (total <= 0) return 0;

  const details =
    input.detailsJson && typeof input.detailsJson === "object" && !Array.isArray(input.detailsJson)
      ? (input.detailsJson as Record<string, unknown>)
      : {};
  const deposit =
    typeof details.bookingFee === "number" && Number.isFinite(details.bookingFee)
      ? Math.round(details.bookingFee)
      : input.instantBooking
        ? total
        : bookingFeeDueNow(total);
  const balanceRecord =
    details.balancePayment &&
    typeof details.balancePayment === "object" &&
    !Array.isArray(details.balancePayment)
      ? (details.balancePayment as Record<string, unknown>)
      : null;
  const balancePaid =
    typeof balanceRecord?.amount === "number" && Number.isFinite(balanceRecord.amount)
      ? Math.round(balanceRecord.amount)
      : input.status === "OFFER_ACCEPTED" || input.status === "ACCEPTED"
        ? bookingBalanceDue(total, deposit)
        : 0;

  return Math.max(0, deposit + balancePaid);
}

/** Remaining balance after the initial booking deposit (non-instant requests). */
export function bookingBalanceDue(totalFee: number, depositPaid?: number | null): number {
  if (!Number.isFinite(totalFee) || totalFee <= 0) return 0;
  const deposit =
    typeof depositPaid === "number" && Number.isFinite(depositPaid) && depositPaid > 0
      ? Math.round(depositPaid)
      : bookingFeeDueNow(totalFee);
  return Math.max(0, Math.round(totalFee) - deposit);
}
