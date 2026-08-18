export const BOOKING_FEE_PERCENT = 5;

export function bookingFeeDueNow(estimatedTotal: number): number {
  if (!Number.isFinite(estimatedTotal) || estimatedTotal <= 0) return 0;
  return Math.max(1, Math.round(estimatedTotal * (BOOKING_FEE_PERCENT / 100)));
}
