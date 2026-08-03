export function bookingStatusClass(status: string) {
  const key = status.trim().toLowerCase() || "received";
  return `booking-status booking-status--${key}`;
}
