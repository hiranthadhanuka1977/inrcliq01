"use client";

import Link from "next/link";
import type { BookingNotePayload } from "@/lib/feed/booking-confirmation";
import BookingDeliveryCountdown from "@/components/feed/bookings/BookingDeliveryCountdown";

export default function BookingStatusNote({
  note,
  time,
  bookingId,
}: {
  note: BookingNotePayload;
  time: string;
  bookingId?: string;
}) {
  const declined = note.kind === "declined";
  const creator = note.creatorName?.trim() || "the creator";
  const firstName = creator.split(" ")[0];
  const title =
    note.title?.trim() ||
    (declined ? `Declined by ${firstName}` : `Accepted by ${firstName}`);
  const body =
    note.body?.trim() ||
    (declined
      ? note.reason?.trim()
        ? `Booking ${note.reference} was declined. Reason: ${note.reason.trim()}`
        : `Booking ${note.reference} was declined.`
      : `Booking ${note.reference} has been accepted. Delivery will follow the agreed schedule.`);
  const deliverBy = !declined ? note.deliverBy?.trim() || "" : "";
  const requestId = note.specialRequestId?.trim() || bookingId?.trim() || "";
  const detailsHref = requestId
    ? `/feed/bookings?booking=${encodeURIComponent(requestId)}`
    : `/feed/bookings?ref=${encodeURIComponent(note.reference)}`;

  return (
    <article
      className={`booking-status-note${declined ? " booking-status-note--declined" : ""}`}
      data-booking-id={requestId || note.reference || undefined}
    >
      <Link
        href={detailsHref}
        className="booking-status-note__card"
        aria-label={`Open booking ${note.reference} details`}
      >
        <header className="booking-status-note__head">
          <span className="booking-status-note__icon" aria-hidden="true">
            {declined ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                <path
                  d="M9 9l6 6M15 9l-6 6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 12.5 9.5 17 19 7.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
          <div className="booking-status-note__copy">
            <h3>{title}</h3>
            <p>{body}</p>
            <p className="booking-status-note__ref">Ref {note.reference}</p>
          </div>
        </header>

        {deliverBy ? <BookingDeliveryCountdown deliverBy={deliverBy} /> : null}
      </Link>
      <time className="booking-status-note__time">{time}</time>
    </article>
  );
}
