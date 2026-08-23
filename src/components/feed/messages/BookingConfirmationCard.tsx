"use client";

import Link from "next/link";
import {
  formatDeliverByLabel,
  resolveCreatorName,
  type BookingConfirmationPayload,
} from "@/lib/feed/booking-confirmation";

function statusTone(status: string) {
  const key = status.trim().toLowerCase();
  if (key === "declined" || key === "cancelled") return "declined";
  if (key === "delivered") return "delivered";
  if (key === "accepted" || key === "in_progress") return "active";
  return "received";
}

function displayStatus(status: string, requesterView: boolean) {
  const key = status.trim().toLowerCase();
  if (requesterView && (key === "received" || key === "")) return "Requested";
  return status;
}

export default function BookingConfirmationCard({
  booking,
  time,
  creatorName,
  detailsTab,
  fromMe,
}: {
  booking: BookingConfirmationPayload;
  time: string;
  creatorName?: string;
  detailsTab?: "inbound" | "outbound";
  /** True when this message sits in the requester's conversation (they submitted the request). */
  fromMe?: boolean;
}) {
  const tone = statusTone(booking.status);
  const providerView = detailsTab === "inbound" || (detailsTab !== "outbound" && fromMe === false);
  const requesterView = !providerView;
  // Requester thread peer is the provider; provider thread peer is the requester.
  const provider = requesterView
    ? creatorName?.trim() || resolveCreatorName(booking)
    : resolveCreatorName(booking);
  const requesterName = providerView
    ? creatorName?.trim() || "a fan"
    : "";
  const firstName = provider.split(" ")[0] || provider;
  const deliverByLabel = formatDeliverByLabel(booking.deliverBy);
  const rows = [
    { label: "Type", value: booking.bookingType },
    { label: "Occasion", value: booking.occasion },
    { label: "Format", value: booking.contentType },
    { label: "Duration", value: booking.duration },
    { label: "Delivery", value: booking.publishingMethod },
    { label: "Deliver by", value: deliverByLabel || "" },
    { label: "Total", value: booking.totalCharge },
  ].filter((row) => Boolean(row.value?.trim()));

  const bookingId = booking.specialRequestId?.trim();
  const detailTab = providerView ? "inbound" : "outbound";
  const detailsHref = bookingId
    ? `/feed/bookings?tab=${detailTab}&booking=${encodeURIComponent(bookingId)}`
    : `/feed/bookings?tab=${detailTab}&ref=${encodeURIComponent(booking.reference)}`;
  const statusLabel = displayStatus(booking.status, requesterView);
  const title = providerView
    ? `Requested by ${requesterName}`
    : `Requested from ${provider}`;
  const note = providerView
    ? deliverByLabel
      ? `Review this request and accept or decline it from your inbound bookings. Deliver by ${deliverByLabel}.`
      : "Review this request and accept or decline it from your inbound bookings."
    : deliverByLabel
      ? `Waiting for ${firstName} to accept. Deliver by ${deliverByLabel}.`
      : `Waiting for ${firstName} to accept.`;

  return (
    <article
      className="booking-confirm-msg"
      data-booking-id={bookingId || booking.reference || undefined}
    >
      <div className={`booking-confirm-card booking-confirm-card--${tone}`}>
        <p className="booking-confirm-card__status">
          <span className="booking-confirm-card__status-dot" aria-hidden="true" />
          {statusLabel}
        </p>
        <h3>{title}</h3>
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

        <p className="booking-confirm-card__note">{note}</p>
        <Link
          href={detailsHref}
          className="booking-confirm-card__details-link btn btn--secondary btn--sm"
          aria-label={`Open booking ${booking.reference} details`}
        >
          Details
        </Link>
      </div>
      <time className="booking-confirm-msg__time">{time}</time>
    </article>
  );
}
