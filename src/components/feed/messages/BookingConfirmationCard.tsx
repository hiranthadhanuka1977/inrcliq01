"use client";

import Link from "next/link";
import { resolveCreatorName, type BookingConfirmationPayload } from "@/lib/feed/booking-confirmation";

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
  const summary = [
    { label: "Booking Type", value: booking.bookingType },
    { label: "Occasion", value: booking.occasion },
    { label: "Content type", value: booking.contentType },
    { label: "Duration", value: booking.duration },
    { label: "Publishing method", value: booking.publishingMethod },
    { label: "Total Charge", value: booking.totalCharge },
  ];
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
        className="booking-confirm-card"
        aria-label={`Open booking ${booking.reference} details`}
      >
        <header className="booking-confirm-card__head">
          <p className="booking-confirm-card__eyebrow">Special request</p>
          <h3>{`Received by ${creator}`}</h3>
          <dl className="booking-confirm-card__meta">
            <div>
              <dt>Booking Reference Number</dt>
              <dd>{booking.reference}</dd>
            </div>
            <div>
              <dt>Booking Status</dt>
              <dd>
                <span className="booking-confirm-card__status">
                  {booking.status}
                  <span className="booking-confirm-card__status-icon" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                      <path
                        d="M12 7v5l3 2"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </span>
              </dd>
            </div>
          </dl>
        </header>

        <section className="booking-confirm-card__summary" aria-label="Service Summary">
          <h4>Service Summary</h4>
          <dl>
            {summary.map((row) => (
              <div key={row.label}>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="booking-confirm-card__pending" aria-label="Acceptance status">
          <span className="booking-confirm-card__pending-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
              <path
                d="M12 7v5l3 2"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div>
            <strong>Waiting for {creator.split(" ")[0]} to accept</strong>
            <p>
              Your request was received. Delivery timing will appear once the creator accepts this
              booking.
            </p>
          </div>
        </section>
      </Link>
      <time className="booking-confirm-msg__time">{time}</time>
    </article>
  );
}
