"use client";

import Link from "next/link";
import { resolveCreatorName, type BookingConfirmationPayload } from "@/lib/feed/booking-confirmation";

function statusTone(status: string) {
  const key = status.trim().toLowerCase();
  if (key === "declined" || key === "cancelled") return "declined";
  if (key === "delivered") return "delivered";
  if (key === "accepted" || key === "in_progress") return "active";
  return "received";
}

export default function BookingConfirmationCard({
  booking,
  time,
  creatorName,
}: {
  booking: BookingConfirmationPayload;
  time: string;
  creatorName?: string;
}) {
  const creator = resolveCreatorName(booking, creatorName);
  const firstName = creator.split(" ")[0] || creator;
  const tone = statusTone(booking.status);
  const rows = [
    { label: "Type", value: booking.bookingType },
    { label: "Occasion", value: booking.occasion },
    { label: "Format", value: booking.contentType },
    { label: "Duration", value: booking.duration },
    { label: "Delivery", value: booking.publishingMethod },
    { label: "Total", value: booking.totalCharge },
  ].filter((row) => Boolean(row.value?.trim()));

  const bookingId = booking.specialRequestId?.trim();
  const detailsHref = bookingId
    ? `/feed/bookings?booking=${encodeURIComponent(bookingId)}`
    : `/feed/bookings?ref=${encodeURIComponent(booking.reference)}`;

  return (
    <article
      className="booking-confirm-msg"
      data-booking-id={bookingId || booking.reference || undefined}
    >
      <Link
        href={detailsHref}
        className={`booking-confirm-card booking-confirm-card--${tone}`}
        aria-label={`Open booking ${booking.reference} details`}
      >
        <p className="booking-confirm-card__status">
          <span className="booking-confirm-card__status-dot" aria-hidden="true" />
          {booking.status}
        </p>
        <h3>{`Received by ${creator}`}</h3>
        <p className="booking-confirm-card__ref">{booking.reference}</p>

        {rows.length > 0 ? (
          <dl className="booking-confirm-card__details">
            {rows.map((row) => (
              <div
                key={row.label}
                className={
                  row.label === "Total"
                    ? "booking-confirm-card__detail booking-confirm-card__detail--total"
                    : "booking-confirm-card__detail"
                }
              >
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        <p className="booking-confirm-card__note">
          Waiting for {firstName} to accept. Delivery timing appears after acceptance.
        </p>
      </Link>
      <time className="booking-confirm-msg__time">{time}</time>
    </article>
  );
}
