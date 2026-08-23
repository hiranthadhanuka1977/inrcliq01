"use client";

import Link from "next/link";
import {
  formatDeliverByLabel,
  type BookingNotePayload,
} from "@/lib/feed/booking-confirmation";
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
  const delivered = note.kind === "delivered";
  const statusLabel = declined ? "Declined" : delivered ? "Delivered" : "Accepted";
  const creator = note.creatorName?.trim() || "the creator";
  const firstName = creator.split(" ")[0];
  const title =
    note.title?.trim() ||
    (declined
      ? `Declined by ${firstName}`
      : delivered
        ? `Delivered by ${firstName}`
        : `Accepted by ${firstName}`);
  const body =
    note.body?.trim() ||
    (declined
      ? note.reason?.trim()
        ? `Booking ${note.reference} was declined. Reason: ${note.reason.trim()}`
        : `Booking ${note.reference} was declined.`
      : delivered
        ? `Booking ${note.reference} has been delivered.`
        : `Booking ${note.reference} has been accepted. Delivery will follow the agreed schedule.`);
  const deliverByIso = note.deliverBy?.trim() || "";
  const deliverByLabel = formatDeliverByLabel(deliverByIso);
  const showCountdown = !declined && !delivered && Boolean(deliverByIso);
  const offerPrice =
    typeof note.offerPrice === "number" && Number.isFinite(note.offerPrice)
      ? note.offerPrice
      : null;
  const currency = note.currency?.trim() || "USD";
  const acceptNote = note.note?.trim() || "";
  const attachmentUrl = note.attachmentUrl?.trim() || "";
  const attachmentName = note.attachmentName?.trim() || "Attachment";
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
      className={`booking-status-note${declined ? " booking-status-note--declined" : ""}${
        delivered ? " booking-status-note--delivered" : ""
      }`}
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
        {deliverByLabel ? (
          <p className="booking-status-note__deadline">Deliver by {deliverByLabel}</p>
        ) : null}
        {!declined && (offerPrice != null || acceptNote || attachmentUrl) ? (
          <ul className="booking-status-note__offer">
            {offerPrice != null ? (
              <li>
                <span>Offer</span>
                <strong>
                  {offerPrice} {currency}
                </strong>
              </li>
            ) : null}
            {acceptNote ? (
              <li>
                <span>Note</span>
                <strong>{acceptNote}</strong>
              </li>
            ) : null}
            {attachmentUrl ? (
              <li>
                <span>File</span>
                <strong>{attachmentName}</strong>
              </li>
            ) : null}
          </ul>
        ) : null}
        {showCountdown ? (
          <BookingDeliveryCountdown
            deliverBy={deliverByIso}
            perspective={creatorInboxView ? "provider" : "requester"}
          />
        ) : null}
      </Link>
      {attachmentUrl ? (
        <a
          href={attachmentUrl}
          className="booking-status-note__attachment"
          target="_blank"
          rel="noreferrer"
        >
          Open {attachmentName}
        </a>
      ) : null}
      <time className="booking-status-note__time">{time}</time>
    </article>
  );
}
