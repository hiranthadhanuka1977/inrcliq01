"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type CSSProperties } from "react";
import type { SettingsBookingDetail } from "@/lib/settings/bookings";

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value?.trim() || value.trim() === "—") return null;
  return (
    <div className="settings-booking-detail__row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function BookingDetailPanel({ booking }: { booking: SettingsBookingDetail }) {
  const router = useRouter();
  const [status, setStatus] = useState(booking.status);
  const [statusLabel, setStatusLabel] = useState(booking.statusLabel);
  const [acceptedAtLabel, setAcceptedAtLabel] = useState(booking.acceptedAtLabel);
  const [pendingAction, setPendingAction] = useState<"accept" | "delete" | null>(null);
  const [error, setError] = useState("");

  const canAccept = status === "RECEIVED";
  const busy = pendingAction !== null;

  async function handleAccept() {
    const confirmed = window.confirm(
      `Accept booking ${booking.reference} (${booking.requestLabel})?`,
    );
    if (!confirmed) return;

    setPendingAction("accept");
    setError("");

    try {
      const response = await fetch(`/api/settings/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(data?.error ?? "Unable to accept booking.");
        setPendingAction(null);
        return;
      }

      setStatus(data?.status ?? "ACCEPTED");
      setStatusLabel(data?.statusLabel ?? "Accepted");
      if (data?.acceptedAtLabel) {
        setAcceptedAtLabel(data.acceptedAtLabel);
      }
      setPendingAction(null);
      router.refresh();
    } catch {
      setError("Unable to accept booking.");
      setPendingAction(null);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete booking ${booking.reference} (${booking.requestLabel})? This cannot be undone.`,
    );
    if (!confirmed) return;

    setPendingAction("delete");
    setError("");

    try {
      const response = await fetch(`/api/settings/bookings/${booking.id}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(data?.error ?? "Unable to delete booking.");
        setPendingAction(null);
        return;
      }

      router.push("/settings/bookings");
      router.refresh();
    } catch {
      setError("Unable to delete booking.");
      setPendingAction(null);
    }
  }

  return (
    <div className="settings-panel">
      <div className="settings-panel__head settings-booking-detail__head">
        <div>
          <Link href="/settings/bookings" className="settings-booking-detail__back">
            ← Back to bookings
          </Link>
          <h1 className="settings-panel__title">{booking.requestLabel}</h1>
          <p className="settings-panel__subtitle">
            Reference <code className="settings-bookings__ref">{booking.reference}</code>
          </p>
        </div>
        <div className="settings-booking-detail__head-actions">
          <span
            className={`settings-bookings__status settings-bookings__status--${status.toLowerCase()}`}
          >
            {statusLabel}
          </span>
          {canAccept ? (
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={handleAccept}
              disabled={busy}
            >
              {pendingAction === "accept" ? "Accepting…" : "Accept"}
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={handleDelete}
            disabled={busy}
          >
            {pendingAction === "delete" ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>

      {error ? (
        <p className="field-error settings-panel__error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="settings-booking-detail__grid">
        <section className="settings-booking-detail__card">
          <h2>Creator</h2>
          <div className="settings-bookings__creator">
            <span
              className="settings-bookings__avatar"
              style={{ "--settings-avatar-color": booking.creator.avatarColor } as CSSProperties}
              aria-hidden="true"
            >
              {booking.creator.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={booking.creator.avatarUrl} alt="" width={40} height={40} />
              ) : (
                booking.creator.avatarInitials
              )}
            </span>
            <div className="settings-bookings__creator-copy">
              <h2>{booking.creator.name}</h2>
              <p>{booking.creator.handle}</p>
            </div>
          </div>
          {booking.creator.slug ? (
            <p className="settings-booking-detail__link-wrap">
              <Link
                href={`/feed/profile/${booking.creator.slug}`}
                className="btn btn--secondary btn--sm"
              >
                Open profile
              </Link>
            </p>
          ) : null}
        </section>

        <section className="settings-booking-detail__card">
          <h2>Requester</h2>
          <dl className="settings-booking-detail__list">
            <DetailRow label="Name" value={booking.requester.name} />
            <DetailRow label="Email" value={booking.requester.email} />
            <DetailRow label="Handle" value={booking.requester.handle} />
          </dl>
        </section>

        <section className="settings-booking-detail__card settings-booking-detail__card--wide">
          <h2>Request details</h2>
          <dl className="settings-booking-detail__list">
            <DetailRow label="Category" value={booking.category} />
            <DetailRow label="Occasion" value={booking.occasion} />
            {booking.isAppearance ? (
              <>
                <DetailRow label="Content type" value={booking.contentType} />
                <DetailRow label="Duration" value={booking.duration} />
                <DetailRow label="Delivery" value={booking.publishingMethod} />
                <DetailRow label="Recipient" value={booking.recipientLabel} />
                <DetailRow label="Location" value={booking.appearanceLocation} />
                <DetailRow label="Expectation" value={booking.appearanceExpectation} />
                <DetailRow label="Reference file" value={booking.appearanceReference} />
              </>
            ) : (
              <>
                <DetailRow label="Formats" value={booking.contentType} />
                <DetailRow label="Tone" value={booking.tone} />
                <DetailRow
                  label="Format details"
                  value={booking.contentSummary || booking.duration}
                />
                <DetailRow label="Delivery" value={booking.publishingMethod} />
                <DetailRow label="Recipient" value={booking.recipientLabel} />
                <DetailRow label="Recipient username" value={booking.recipientUsername} />
                <DetailRow label="Message" value={booking.shoutoutMessage} />
                <DetailRow label="Special instructions" value={booking.specialInstructions} />
              </>
            )}
          </dl>
        </section>

        <section className="settings-booking-detail__card">
          <h2>Pricing</h2>
          <dl className="settings-booking-detail__list">
            <DetailRow label="Request fee" value={booking.dayRateLabel} />
            {booking.feedFee > 0 ? (
              <DetailRow label="Feed post fee" value={booking.feedFeeLabel} />
            ) : null}
            <DetailRow label="Total" value={booking.totalLabel} />
          </dl>
        </section>

        <section className="settings-booking-detail__card">
          <h2>Timeline</h2>
          <dl className="settings-booking-detail__list">
            <DetailRow label="Created" value={booking.createdLabel} />
            <DetailRow label="Requested for" value={booking.requestedForLabel} />
            <DetailRow label="Deliver by" value={booking.deliverByLabel} />
            <DetailRow label="Accepted" value={acceptedAtLabel} />
            <DetailRow label="Delivered" value={booking.deliveredAtLabel} />
            <DetailRow label="Updated" value={booking.updatedLabel} />
          </dl>
        </section>
      </div>
    </div>
  );
}
