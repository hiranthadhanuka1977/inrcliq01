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
  const declined = note.kind === "declined" || note.kind === "offer_declined" || note.kind === "counter_declined";
  const delivered = note.kind === "delivered";
  const newOffer = note.kind === "new_offer";
  const counterOffer = note.kind === "counter_offer";
  const counterAccepted = note.kind === "counter_accepted";
  const offerAccepted = note.kind === "offer_accepted";
  const refund = note.kind === "refund";
  const statusLabel = declined
    ? "Declined"
    : delivered
      ? "Delivered"
      : newOffer
        ? "New offer"
        : counterOffer
          ? "Counter offer"
          : counterAccepted
            ? "Counter accepted"
            : offerAccepted
          ? "Awaiting acceptance"
          : refund
            ? "Refund"
            : "Accepted";
  const creator = note.creatorName?.trim() || "the creator";
  const firstName = creator.split(" ")[0];
  const title =
    note.title?.trim() ||
    (note.kind === "counter_declined"
      ? `Counter declined by ${firstName}`
      : declined
      ? `Declined by ${firstName}`
      : delivered
        ? `Delivered by ${firstName}`
        : newOffer
          ? `New offer from ${firstName}`
          : counterOffer
            ? `Counter offer sent`
            : counterAccepted
              ? `Counter accepted by ${firstName}`
              : offerAccepted
                ? `Awaiting acceptance`
                : refund
                  ? "Refund issued"
                  : `Accepted by ${firstName}`);
  const body =
    note.body?.trim() ||
    (declined
      ? note.reason?.trim()
        ? `Booking ${note.reference} was declined. Reason: ${note.reason.trim()}`
        : `Booking ${note.reference} was declined.`
      : delivered
        ? `Booking ${note.reference} has been delivered.`
        : newOffer
          ? `A new offer was sent for booking ${note.reference}.`
          : counterOffer
            ? `A counter offer was sent for booking ${note.reference}.`
            : counterAccepted
              ? `The counter offer for booking ${note.reference} was accepted.`
              : offerAccepted
            ? `Balance is paid for booking ${note.reference}. Waiting for provider acceptance before countdown starts.`
            : refund
              ? `A refund has been issued for booking ${note.reference}.`
              : note.kind === "counter_declined"
                ? note.reason?.trim()
                  ? `The counter offer for booking ${note.reference} was declined. Reason: ${note.reason.trim()}`
                  : `The counter offer for booking ${note.reference} was declined.`
                : `Booking ${note.reference} has been accepted. Delivery will follow the agreed schedule.`);
  const deliverByIso = note.deliverBy?.trim() || "";
  const deliverByLabel = formatDeliverByLabel(deliverByIso);
  const showCountdown =
    !declined &&
    !delivered &&
    !newOffer &&
    !counterOffer &&
    !counterAccepted &&
    !offerAccepted &&
    !refund &&
    Boolean(deliverByIso);
  const offerPrice =
    typeof note.offerPrice === "number" && Number.isFinite(note.offerPrice)
      ? note.offerPrice
      : null;
  const refundAmount =
    typeof note.refundAmount === "number" && Number.isFinite(note.refundAmount)
      ? note.refundAmount
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
      }${refund ? " booking-status-note--refund" : ""}`}
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
        {refund && refundAmount != null ? (
          <ul className="booking-status-note__offer">
            <li>
              <span>Refund amount</span>
              <strong>
                {refundAmount} {currency}
              </strong>
            </li>
          </ul>
        ) : null}
        {!declined && !refund && (offerPrice != null || acceptNote || attachmentUrl || newOffer || counterOffer || counterAccepted) ? (
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
