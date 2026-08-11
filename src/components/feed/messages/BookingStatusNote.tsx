"use client";

import Link from "next/link";
import type { BookingNotePayload } from "@/lib/feed/booking-confirmation";
import BookingDeliveryCountdown from "@/components/feed/bookings/BookingDeliveryCountdown";

export default function BookingStatusNote({
  note,
  time,
  bookingId,
  participantName,
  detailsTab,
}: {
  note: BookingNotePayload;
  time: string;
  bookingId?: string;
  participantName?: string;
  detailsTab?: "inbound" | "outbound";
}) {
  const declined = note.kind === "declined";
  const statusLabel = declined ? "Declined" : "Accepted";
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
  const viewerName = participantName?.trim() || "";
  const creatorInboxView =
    detailsTab === "inbound" ||
    (detailsTab !== "outbound" &&
      Boolean(viewerName) &&
      viewerName.toLowerCase() !== creator.toLowerCase());
  const detailTab = creatorInboxView ? "inbound" : "outbound";
  const requestId = note.specialRequestId?.trim() || bookingId?.trim() || "";
  const detailsHref = requestId
    ? `/feed/bookings?tab=${detailTab}&booking=${encodeURIComponent(requestId)}`
    : `/feed/bookings?tab=${detailTab}&ref=${encodeURIComponent(note.reference)}`;

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
        <p className="booking-status-note__status">
          <span className="booking-status-note__status-dot" aria-hidden="true" />
          {statusLabel}
        </p>
        <h3>{title}</h3>
        <p className="booking-status-note__ref">{note.reference}</p>
        <p className="booking-status-note__body">{body}</p>
        {deliverBy ? <BookingDeliveryCountdown deliverBy={deliverBy} /> : null}
      </Link>
      <time className="booking-status-note__time">{time}</time>
    </article>
  );
}
