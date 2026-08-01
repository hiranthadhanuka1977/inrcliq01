"use client";

import type { BookingNotePayload } from "@/lib/feed/booking-confirmation";
import BookingDeliveryCountdown from "@/components/feed/bookings/BookingDeliveryCountdown";

export default function BookingStatusNote({
  note,
  time,
}: {
  note: BookingNotePayload;
  time: string;
}) {
  const creator = note.creatorName?.trim() || "the creator";
  const firstName = creator.split(" ")[0];
  const title = note.title?.trim() || `Accepted by ${firstName}`;
  const body =
    note.body?.trim() ||
    `Booking ${note.reference} has been accepted. Delivery will follow the agreed schedule.`;
  const deliverBy = note.deliverBy?.trim() || "";

  return (
    <article className="booking-status-note">
      <div className="booking-status-note__card">
        <div className="booking-status-note__head">
          <span className="booking-status-note__icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12.5 9.5 17 19 7.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div className="booking-status-note__copy">
            <strong>{title}</strong>
            <p>{body}</p>
            <p className="booking-status-note__ref">Ref {note.reference}</p>
          </div>
        </div>

        {deliverBy ? <BookingDeliveryCountdown deliverBy={deliverBy} /> : null}
      </div>
      <time className="booking-status-note__time">{time}</time>
    </article>
  );
}
