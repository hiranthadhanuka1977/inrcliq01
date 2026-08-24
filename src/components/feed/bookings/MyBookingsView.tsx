"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import type { MyBookingItem } from "@/lib/feed/user-bookings";
import { bookingStatusClass } from "@/lib/feed/booking-status";
import BookingDeliveryCountdown from "@/components/feed/bookings/BookingDeliveryCountdown";
import MyBookingsCalendar from "@/components/feed/bookings/MyBookingsCalendar";
import LeftNav from "@/components/feed/LeftNav";
import MobileNav from "@/components/feed/MobileNav";

type BookingsTab = "calendar" | "inbound" | "outbound";

function parseBookingsTab(value: string | null): BookingsTab {
  if (value === "inbound" || value === "outbound" || value === "calendar") return value;
  return "calendar";
}

/** Delivery countdown only after the provider has accepted (or work is in progress). */
function showsCountdown(booking: MyBookingItem) {
  if (!booking.deliverBy) return false;
  return booking.status === "ACCEPTED" || booking.status === "IN_PROGRESS";
}

function canRespondToBooking(booking: MyBookingItem) {
  return (
    booking.direction === "inbound" &&
    booking.status === "RECEIVED" &&
    Boolean(booking.instantBooking)
  );
}

function canSendOffer(booking: MyBookingItem) {
  return (
    booking.direction === "inbound" &&
    booking.status === "RECEIVED" &&
    !booking.instantBooking
  );
}

function canFinalAcceptBooking(booking: MyBookingItem) {
  return booking.direction === "inbound" && booking.status === "OFFER_ACCEPTED";
}

function canRespondToOffer(booking: MyBookingItem) {
  return (
    booking.direction === "outbound" &&
    booking.status === "NEW_OFFER" &&
    !booking.counterOfferPendingForProvider
  );
}

function canWaitOnCounterOffer(booking: MyBookingItem) {
  return booking.direction === "outbound" && Boolean(booking.counterOfferPendingForProvider);
}

function canRespondToCounterOffer(booking: MyBookingItem) {
  return booking.direction === "inbound" && Boolean(booking.counterOfferPendingForProvider);
}

function canDeliverBooking(booking: MyBookingItem) {
  return (
    booking.direction === "inbound" &&
    (booking.status === "ACCEPTED" || booking.status === "IN_PROGRESS")
  );
}

function canGiveFeedback(booking: MyBookingItem) {
  return booking.status === "DELIVERED";
}

/** Instant bookings keep "Deliver"; non-instant use "Mark as completed". */
function deliverActionLabel(booking: Pick<MyBookingItem, "instantBooking">) {
  return booking.instantBooking ? "Deliver" : "Mark as completed";
}

const FEEDBACK_QUICK_PICKS = {
  requester: [
    "Great communication",
    "On time",
    "High quality",
    "Would book again",
    "Followed my brief",
  ],
  provider: [
    "Clear brief",
    "Easy to work with",
    "Fair expectations",
    "Responsive",
    "Would work again",
  ],
} as const;

function DeliverConfirmModal({
  open,
  booking,
  onClose,
  onConfirm,
}: {
  open: boolean;
  booking: MyBookingItem | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open || !booking) return null;

  const actionLabel = deliverActionLabel(booking);
  const isInstant = Boolean(booking.instantBooking);

  return (
    <div className="my-bookings-decline" role="presentation">
      <button
        type="button"
        className="my-bookings-decline__backdrop"
        aria-label="Close deliver confirmation"
        onClick={onClose}
      />
      <div
        className="my-bookings-decline__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="my-bookings-deliver-title"
      >
        <h2 id="my-bookings-deliver-title">
          {isInstant ? "Ready to complete this request?" : "Ready to mark this as completed?"}
        </h2>
        <p>
          {isInstant ? (
            <>
              Continue to upload your delivery for <code>{booking.reference}</code> and mark it as
              delivered.
            </>
          ) : (
            <>
              Continue for <code>{booking.reference}</code> to mark this request as completed. A
              delivery file is optional.
            </>
          )}
        </p>
        <div className="my-bookings-decline__actions">
          <button
            type="button"
            className="btn btn--secondary btn--xs my-bookings__respond-btn"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--secondary btn--xs my-bookings__respond-btn my-bookings__respond-btn--deliver"
            onClick={onConfirm}
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function FeedbackModal({
  open,
  booking,
  submitting,
  submitError,
  onClose,
  onSubmit,
}: {
  open: boolean;
  booking: MyBookingItem | null;
  submitting: boolean;
  submitError: string;
  onClose: () => void;
  onSubmit: (payload: { rating: number; note: string; picks: string[] }) => void;
}) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [note, setNote] = useState("");
  const [picks, setPicks] = useState<string[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setRating(0);
    setHoverRating(0);
    setNote("");
    setPicks([]);
    setError("");
  }, [open, booking?.id]);

  if (!open || !booking) return null;

  const perspective = booking.direction === "inbound" ? "provider" : "requester";
  const quickPicks = FEEDBACK_QUICK_PICKS[perspective];
  const counterpart =
    booking.direction === "inbound"
      ? "the requester"
      : booking.creator.name || "the creator";

  function togglePick(label: string) {
    setPicks((current) =>
      current.includes(label) ? current.filter((item) => item !== label) : [...current, label],
    );
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    if (rating < 1) {
      setError("Please choose a star rating.");
      return;
    }
    setError("");
    onSubmit({ rating, note: note.trim(), picks });
  }

  return (
    <div className="my-bookings-decline" role="presentation">
      <button
        type="button"
        className="my-bookings-decline__backdrop"
        aria-label="Close feedback"
        onClick={() => {
          if (submitting) return;
          onClose();
        }}
      />
      <form
        className="my-bookings-decline__panel my-bookings-feedback__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="my-bookings-feedback-title"
        onSubmit={handleSubmit}
      >
        <h2 id="my-bookings-feedback-title">How was this experience?</h2>
        <p>
          Share quick feedback for {counterpart} on <code>{booking.reference}</code>.
        </p>

        <fieldset className="my-bookings-feedback__stars">
          <legend>Star rating</legend>
          <div
            className="my-bookings-feedback__star-row"
            onMouseLeave={() => setHoverRating(0)}
          >
            {[1, 2, 3, 4, 5].map((value) => {
              const active = value <= (hoverRating || rating);
              return (
                <button
                  key={value}
                  type="button"
                  className={`my-bookings-feedback__star${active ? " is-active" : ""}`}
                  aria-label={`${value} star${value === 1 ? "" : "s"}`}
                  aria-pressed={rating === value}
                  disabled={submitting}
                  onMouseEnter={() => setHoverRating(value)}
                  onFocus={() => setHoverRating(value)}
                  onBlur={() => setHoverRating(0)}
                  onClick={() => {
                    setRating(value);
                    setError("");
                  }}
                >
                  <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
                    <path
                      d="M12 3.6l2.4 4.86 5.36.78-3.88 3.78.92 5.34L12 15.9l-4.8 2.52.92-5.34-3.88-3.78 5.36-.78L12 3.6z"
                      fill={active ? "currentColor" : "none"}
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="my-bookings-feedback__picks" role="group" aria-label="Quick selections">
          <p className="my-bookings-feedback__picks-label">Quick selections (optional)</p>
          <ul className="my-bookings-feedback__chips">
            {quickPicks.map((label) => {
              const selected = picks.includes(label);
              return (
                <li key={label}>
                  <button
                    type="button"
                    className={`my-bookings-feedback__chip${selected ? " is-selected" : ""}`}
                    aria-pressed={selected}
                    disabled={submitting}
                    onClick={() => togglePick(label)}
                  >
                    {label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <label className="my-bookings-decline__field">
          Feedback (optional)
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Anything else about this experience?"
            rows={3}
            maxLength={500}
            disabled={submitting}
          />
        </label>

        {error || submitError ? (
          <p className="my-bookings-decline__error" role="alert">
            {error || submitError}
          </p>
        ) : null}

        <div className="my-bookings-decline__actions">
          <button
            type="button"
            className="btn btn--secondary btn--xs my-bookings__respond-btn"
            disabled={submitting}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn--primary btn--xs my-bookings__respond-btn"
            disabled={submitting}
          >
            {submitting ? "Saving…" : "Submit feedback"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ActionIcon({ name }: { name: "details" | "deliver" | "feedback" | "messages" }) {
  if (name === "details") {
    return (
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
        <path
          d="M8 6.5h11M8 12h11M8 17.5h7"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle cx="4.5" cy="6.5" r="1.1" fill="currentColor" />
        <circle cx="4.5" cy="12" r="1.1" fill="currentColor" />
        <circle cx="4.5" cy="17.5" r="1.1" fill="currentColor" />
      </svg>
    );
  }
  if (name === "deliver") {
    return (
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
        <path
          d="M4 12.5h11.5M12 7.5l5 5-5 5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M4 7.5v10"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (name === "feedback") {
    return (
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
        <path
          d="M12 4.2l2.1 4.25 4.7.68-3.4 3.32.8 4.68L12 15.9l-4.2 2.23.8-4.68-3.4-3.32 4.7-.68L12 4.2z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
      <path
        d="M5.5 7.5h13a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 0 1-1.5 1.5H10l-3.5 2.5V16.5H5.5A1.5 1.5 0 0 1 4 15V9a1.5 1.5 0 0 1 1.5-1.5z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FeedbackStars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span className="my-bookings-feedback__stars-display" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((value) => {
        const filled = value <= rating;
        return (
          <svg
            key={value}
            viewBox="0 0 24 24"
            width={size}
            height={size}
            className={filled ? "is-filled" : undefined}
          >
            <path
              d="M12 3.6l2.4 4.86 5.36.78-3.88 3.78.92 5.34L12 15.9l-4.8 2.52.92-5.34-3.88-3.78 5.36-.78L12 3.6z"
              fill={filled ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
        );
      })}
    </span>
  );
}

function FeedbackRatingTrigger({
  booking,
  onOpen,
}: {
  booking: MyBookingItem;
  onOpen: () => void;
}) {
  const rating = booking.feedbackRating ?? 0;
  return (
    <button
      type="button"
      className="btn btn--secondary btn--xs my-bookings__action-btn my-bookings__feedback-rating"
      onClick={onOpen}
      aria-label={`View your ${rating}-star feedback`}
    >
      <FeedbackStars rating={rating} />
      <span>{rating}/5</span>
    </button>
  );
}

function FeedbackDetailsModal({
  open,
  booking,
  onClose,
}: {
  open: boolean;
  booking: MyBookingItem | null;
  onClose: () => void;
}) {
  if (!open || !booking || !booking.feedbackSubmitted) return null;

  const rating = booking.feedbackRating ?? 0;
  const submittedLabel = booking.feedbackSubmittedAt
    ? new Date(booking.feedbackSubmittedAt).toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="my-bookings-decline" role="presentation">
      <button
        type="button"
        className="my-bookings-decline__backdrop"
        aria-label="Close feedback details"
        onClick={onClose}
      />
      <div
        className="my-bookings-decline__panel my-bookings-feedback__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="my-bookings-feedback-details-title"
      >
        <h2 id="my-bookings-feedback-details-title">Your feedback</h2>
        <p>
          Feedback for <code>{booking.reference}</code>
          {submittedLabel ? ` · ${submittedLabel}` : ""}
        </p>

        <div className="my-bookings-feedback__details-rating">
          <FeedbackStars rating={rating} size={22} />
          <strong>
            {rating} out of 5 star{rating === 1 ? "" : "s"}
          </strong>
        </div>

        {booking.feedbackPicks.length > 0 ? (
          <div className="my-bookings-feedback__picks">
            <p className="my-bookings-feedback__picks-label">Selections</p>
            <ul className="my-bookings-feedback__chips">
              {booking.feedbackPicks.map((label) => (
                <li key={label}>
                  <span className="my-bookings-feedback__chip is-selected">{label}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {booking.feedbackNote ? (
          <div className="my-bookings-feedback__details-note">
            <p className="my-bookings-feedback__picks-label">Note</p>
            <p>{booking.feedbackNote}</p>
          </div>
        ) : (
          <p className="my-bookings-feedback__details-empty">No written note was added.</p>
        )}

        <div className="my-bookings-decline__actions">
          <button
            type="button"
            className="btn btn--secondary btn--xs my-bookings__respond-btn"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function CreatorBlock({
  booking,
  compact = false,
}: {
  booking: MyBookingItem;
  compact?: boolean;
}) {
  const avatar = (
    <span
      className={`my-bookings__avatar${compact ? " my-bookings__avatar--sm" : ""}`}
      style={{ "--avatar-accent": booking.creator.avatarColor } as CSSProperties}
      aria-hidden="true"
    >
      {booking.creator.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={booking.creator.avatarUrl} alt="" width={compact ? 36 : 44} height={compact ? 36 : 44} />
      ) : (
        booking.creator.avatarInitials
      )}
    </span>
  );

  const copy = (
    <span className="my-bookings__creator-copy">
      <strong>{booking.creator.name}</strong>
      <span>{booking.creator.handle}</span>
    </span>
  );

  return (
    <div className="my-bookings__creator">
      {avatar}
      {copy}
    </div>
  );
}

function findBookingFromParams(
  bookings: MyBookingItem[],
  bookingParam: string,
  refParam: string,
) {
  if (bookingParam) {
    const match = bookings.find((booking) => booking.id === bookingParam);
    if (match) return match;
  }
  if (refParam) {
    const normalized = refParam.toLowerCase();
    return bookings.find((booking) => booking.reference.toLowerCase() === normalized) ?? null;
  }
  return null;
}

function DeclineReasonModal({
  open,
  reference,
  reason,
  error,
  submitting,
  onReasonChange,
  onClose,
  onSubmit,
}: {
  open: boolean;
  reference: string;
  reason: string;
  error: string;
  submitting: boolean;
  onReasonChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  if (!open) return null;

  return (
    <div className="my-bookings-decline" role="presentation">
      <button
        type="button"
        className="my-bookings-decline__backdrop"
        aria-label="Close decline dialog"
        onClick={onClose}
        disabled={submitting}
      />
      <div
        className="my-bookings-decline__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="my-bookings-decline-title"
      >
        <h2 id="my-bookings-decline-title">Decline booking?</h2>
        <p>
          Tell the requester why you are declining <code>{reference}</code>.
        </p>
        <form onSubmit={onSubmit}>
          <label className="my-bookings-decline__field">
            <span>Reason</span>
            <textarea
              value={reason}
              onChange={(event) => onReasonChange(event.target.value)}
              rows={4}
              required
              disabled={submitting}
              placeholder="Share a short reason…"
            />
          </label>
          {error ? (
            <p className="my-bookings-decline__error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="my-bookings-decline__actions">
            <button
              type="button"
              className="btn btn--secondary btn--xs my-bookings__respond-btn"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn--secondary btn--xs my-bookings__respond-btn my-bookings__respond-btn--decline"
              disabled={submitting}
            >
              {submitting ? "Declining…" : "Decline"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type AcceptOfferDraft = {
  id: string;
  note: string;
};

function AcceptOfferModal({
  open,
  booking,
  draft,
  error,
  submitting,
  onDraftChange,
  onClose,
  onSubmit,
}: {
  open: boolean;
  booking: MyBookingItem | null;
  draft: AcceptOfferDraft | null;
  error: string;
  submitting: boolean;
  onDraftChange: (patch: Partial<AcceptOfferDraft>) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  if (!open || !booking || !draft) return null;

  const isInstant = Boolean(booking.instantBooking);
  const isFinalAccept = booking.status === "OFFER_ACCEPTED";

  return (
    <div className="my-bookings-decline" role="presentation">
      <button
        type="button"
        className="my-bookings-decline__backdrop"
        aria-label="Close accept dialog"
        onClick={onClose}
        disabled={submitting}
      />
      <div
        className="my-bookings-decline__panel my-bookings-accept__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="my-bookings-accept-title"
      >
        <h2 id="my-bookings-accept-title">Accept booking</h2>
        <p>
          {isFinalAccept ? (
            <>
              The requester paid the balance ({booking.totalLabel}) for{" "}
              <code>{booking.reference}</code>. Accept to confirm the booking and start the delivery
              countdown. You can add an optional note.
            </>
          ) : isInstant ? (
            <>
              Accept <code>{booking.reference}</code> for {booking.totalLabel}. You can add an
              optional note for the requester.
            </>
          ) : (
            <>
              Accept <code>{booking.reference}</code> for {booking.totalLabel}. You can add an
              optional note for the requester.
            </>
          )}
        </p>
        <form onSubmit={onSubmit}>
          <label className="my-bookings-decline__field">
            <span>Note to requester (optional)</span>
            <textarea
              value={draft.note}
              onChange={(event) => onDraftChange({ note: event.target.value })}
              rows={3}
              disabled={submitting}
              placeholder="Share schedule details, expectations, or terms…"
            />
          </label>
          {error ? (
            <p className="my-bookings-decline__error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="my-bookings-decline__actions">
            <button
              type="button"
              className="btn btn--secondary btn--xs my-bookings__respond-btn"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn--secondary btn--xs my-bookings__respond-btn my-bookings__respond-btn--accept"
              disabled={submitting}
            >
              {submitting ? "Accepting…" : "Accept"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type SendOfferDraft = {
  id: string;
  offerPrice: string;
  note: string;
};

function SendNewOfferModal({
  open,
  booking,
  draft,
  error,
  submitting,
  onDraftChange,
  onClose,
  onSubmit,
}: {
  open: boolean;
  booking: MyBookingItem | null;
  draft: SendOfferDraft | null;
  error: string;
  submitting: boolean;
  onDraftChange: (patch: Partial<SendOfferDraft>) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  if (!open || !booking || !draft) return null;

  return (
    <div className="my-bookings-decline" role="presentation">
      <button
        type="button"
        className="my-bookings-decline__backdrop"
        aria-label="Close send offer dialog"
        onClick={onClose}
        disabled={submitting}
      />
      <div
        className="my-bookings-decline__panel my-bookings-accept__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="my-bookings-send-offer-title"
      >
        <h2 id="my-bookings-send-offer-title">Send new offer</h2>
        <p>
          Send a new offer for <code>{booking.reference}</code>. Keep the current total (
          {booking.totalLabel}) or propose a new price with an optional note.
        </p>
        <form onSubmit={onSubmit}>
          <label className="my-bookings-decline__field">
            <span>New offer price (optional)</span>
            <input
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={draft.offerPrice}
              onChange={(event) => onDraftChange({ offerPrice: event.target.value })}
              disabled={submitting}
              placeholder={booking.totalLabel.replace(/[^\d.]/g, "") || "e.g. 150"}
            />
          </label>
          <label className="my-bookings-decline__field">
            <span>Note to requester (optional)</span>
            <textarea
              value={draft.note}
              onChange={(event) => onDraftChange({ note: event.target.value })}
              rows={3}
              disabled={submitting}
              placeholder="Explain your offer, timeline, or terms…"
            />
          </label>
          <div className="my-bookings-decline__actions">
            <button
              type="button"
              className="btn btn--secondary btn--xs my-bookings__respond-btn"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn--secondary btn--xs my-bookings__respond-btn my-bookings__respond-btn--accept"
              disabled={submitting}
            >
              {submitting ? "Sending…" : "Send new offer"}
            </button>
          </div>
          {error ? (
            <p className="my-bookings-decline__error" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      </div>
    </div>
  );
}

function CounterOfferModal({
  open,
  booking,
  draft,
  error,
  submitting,
  onDraftChange,
  onClose,
  onSubmit,
}: {
  open: boolean;
  booking: MyBookingItem | null;
  draft: SendOfferDraft | null;
  error: string;
  submitting: boolean;
  onDraftChange: (patch: Partial<SendOfferDraft>) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  if (!open || !booking || !draft) return null;

  return (
    <div className="my-bookings-decline" role="presentation">
      <button
        type="button"
        className="my-bookings-decline__backdrop"
        aria-label="Close counter offer dialog"
        onClick={onClose}
        disabled={submitting}
      />
      <div
        className="my-bookings-decline__panel my-bookings-accept__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="my-bookings-counter-offer-title"
      >
        <h2 id="my-bookings-counter-offer-title">Counter offer</h2>
        <p>
          Send a counter offer for <code>{booking.reference}</code>. Propose a new price and optional
          note for the provider.
        </p>
        <form onSubmit={onSubmit}>
          <label className="my-bookings-decline__field">
            <span>Counter offer price</span>
            <input
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              required
              value={draft.offerPrice}
              onChange={(event) => onDraftChange({ offerPrice: event.target.value })}
              disabled={submitting}
              placeholder={booking.totalLabel.replace(/[^\d.]/g, "") || "e.g. 150"}
            />
          </label>
          <label className="my-bookings-decline__field">
            <span>Note to provider (optional)</span>
            <textarea
              value={draft.note}
              onChange={(event) => onDraftChange({ note: event.target.value })}
              rows={3}
              disabled={submitting}
              placeholder="Explain your counter offer…"
            />
          </label>
          <div className="my-bookings-decline__actions">
            <button
              type="button"
              className="btn btn--secondary btn--xs my-bookings__respond-btn"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn--secondary btn--xs my-bookings__respond-btn my-bookings__respond-btn--accept"
              disabled={submitting}
            >
              {submitting ? "Sending…" : "Send counter offer"}
            </button>
          </div>
          {error ? (
            <p className="my-bookings-decline__error" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      </div>
    </div>
  );
}

function AcceptOfferPaymentModal({
  open,
  booking,
  submitting,
  onClose,
  onConfirm,
}: {
  open: boolean;
  booking: MyBookingItem | null;
  submitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open || !booking) return null;

  return (
    <div className="my-bookings-decline" role="presentation">
      <button
        type="button"
        className="my-bookings-decline__backdrop"
        aria-label="Close accept offer dialog"
        onClick={onClose}
        disabled={submitting}
      />
      <div
        className="my-bookings-decline__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="my-bookings-accept-offer-title"
      >
        <h2 id="my-bookings-accept-offer-title">Accept new offer</h2>
        <p>
          To accept the new offer for <code>{booking.reference}</code>, a balance payment is
          required to complete the booking. You&apos;ll be taken through the payment flow, then the
          provider will confirm for final delivery.
        </p>
        <div className="my-bookings-decline__actions">
          <button
            type="button"
            className="btn btn--secondary btn--xs my-bookings__respond-btn"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--secondary btn--xs my-bookings__respond-btn my-bookings__respond-btn--accept"
            onClick={onConfirm}
            disabled={submitting}
          >
            Continue to payment
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MyBookingsView({
  bookings: initialBookings,
  inboundEnabled = false,
}: {
  bookings: MyBookingItem[];
  /** Verified creators can receive inbound service requests. */
  inboundEnabled?: boolean;
}) {
  const panelTitleId = useId();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [bookings, setBookings] = useState(initialBookings);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<
    "accept" | "decline" | "send_offer" | "decline_offer" | "counter_offer" | "accept_counter" | "decline_counter" | null
  >(null);
  const [actionError, setActionError] = useState("");
  const [declineDraft, setDeclineDraft] = useState<{ id: string; reason: string } | null>(null);
  const [declineModalError, setDeclineModalError] = useState("");
  const [acceptDraft, setAcceptDraft] = useState<AcceptOfferDraft | null>(null);
  const [acceptModalError, setAcceptModalError] = useState("");
  const [sendOfferDraft, setSendOfferDraft] = useState<SendOfferDraft | null>(null);
  const [sendOfferModalError, setSendOfferModalError] = useState("");
  const [offerPaymentTarget, setOfferPaymentTarget] = useState<MyBookingItem | null>(null);
  const [declineOfferDraft, setDeclineOfferDraft] = useState<{ id: string; reason: string } | null>(
    null,
  );
  const [declineOfferModalError, setDeclineOfferModalError] = useState("");
  const [counterOfferDraft, setCounterOfferDraft] = useState<SendOfferDraft | null>(null);
  const [counterOfferModalError, setCounterOfferModalError] = useState("");
  const [declineCounterDraft, setDeclineCounterDraft] = useState<{ id: string; reason: string } | null>(
    null,
  );
  const [declineCounterModalError, setDeclineCounterModalError] = useState("");
  const [toast, setToast] = useState<{ tone: "success" | "neutral"; message: string } | null>(
    null,
  );
  const [deliverConfirm, setDeliverConfirm] = useState<MyBookingItem | null>(null);
  const [feedbackTarget, setFeedbackTarget] = useState<MyBookingItem | null>(null);
  const [feedbackView, setFeedbackView] = useState<MyBookingItem | null>(null);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackModalError, setFeedbackModalError] = useState("");

  useEffect(() => {
    setBookings(initialBookings);
  }, [initialBookings]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const toastParam = searchParams.get("toast")?.trim();
    if (toastParam !== "delivered" && toastParam !== "completed" && toastParam !== "balance_paid")
      return;
    const ref = searchParams.get("ref")?.trim();
    setToast({
      tone: "success",
      message:
        toastParam === "balance_paid"
          ? ref
            ? `Balance paid for ${ref}. Waiting for provider to accept before countdown starts.`
            : "Balance paid. Waiting for provider to accept before countdown starts."
          : toastParam === "completed"
            ? ref
              ? `Request ${ref} marked as completed.`
              : "Request marked as completed."
            : ref
              ? `Request ${ref} marked as delivered.`
              : "Request marked as delivered.",
    });
    const next = new URLSearchParams(searchParams.toString());
    next.delete("toast");
    next.delete("ref");
    if (!next.get("tab")) next.set("tab", "calendar");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const bookingParam = searchParams.get("booking")?.trim() || "";
  const refParam = searchParams.get("ref")?.trim() || "";
  const paramMatch = findBookingFromParams(bookings, bookingParam, refParam);
  const requestedTab = parseBookingsTab(searchParams.get("tab"));
  const activeTab =
    !inboundEnabled && requestedTab === "inbound" ? "calendar" : requestedTab;

  useEffect(() => {
    if (inboundEnabled || searchParams.get("tab") !== "inbound") return;
    const next = new URLSearchParams(searchParams.toString());
    next.set("tab", "calendar");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [inboundEnabled, pathname, router, searchParams]);

  const visibleBookings =
    activeTab === "calendar"
      ? bookings
      : bookings.filter((booking) => booking.direction === activeTab);
  const manualSelected = selectedId
    ? bookings.find((booking) => booking.id === selectedId) ?? null
    : null;
  const selected =
    manualSelected ?? (bookingParam || refParam ? paramMatch : null) ?? null;
  const open = Boolean(selected);

  const openBookingDetails = useCallback(
    (booking: MyBookingItem) => {
      setSelectedId(booking.id);
      setActionError("");
      const next = new URLSearchParams(searchParams.toString());
      const detailTab =
        booking.direction === "inbound" && !inboundEnabled
          ? activeTab === "calendar"
            ? "calendar"
            : "outbound"
          : activeTab === "calendar"
            ? "calendar"
            : booking.direction;
      next.set("tab", detailTab);
      next.set("booking", booking.id);
      next.delete("ref");
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [activeTab, inboundEnabled, pathname, router, searchParams],
  );

  const clearSelection = useCallback(() => {
    setSelectedId(null);
    setActionError("");
    if (searchParams.get("booking") || searchParams.get("ref")) {
      const next = new URLSearchParams(searchParams.toString());
      next.delete("booking");
      next.delete("ref");
      next.set("tab", activeTab);
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }
  }, [activeTab, pathname, router, searchParams]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (feedbackTarget || feedbackView || deliverConfirm || declineDraft || acceptDraft || sendOfferDraft || offerPaymentTarget || declineOfferDraft || counterOfferDraft || declineCounterDraft) return;
      clearSelection();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, clearSelection, feedbackTarget, feedbackView, deliverConfirm, declineDraft, acceptDraft, sendOfferDraft, offerPaymentTarget, declineOfferDraft, counterOfferDraft, declineCounterDraft]);

  function patchBooking(id: string, patch: Partial<MyBookingItem>) {
    setBookings((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  async function handleAccept(booking: MyBookingItem) {
    setAcceptDraft({
      id: booking.id,
      note: "",
    });
    setAcceptModalError("");
    setActionError("");
  }

  function handleSendOffer(booking: MyBookingItem) {
    setSendOfferDraft({
      id: booking.id,
      offerPrice: "",
      note: "",
    });
    setSendOfferModalError("");
    setActionError("");
  }

  async function handleSendOfferSubmit(event: FormEvent) {
    event.preventDefault();
    if (!sendOfferDraft) return;

    const offerRaw = sendOfferDraft.offerPrice.trim();
    const offerPrice = offerRaw ? Number(offerRaw) : null;
    if (offerRaw && (!Number.isFinite(offerPrice) || (offerPrice ?? 0) <= 0)) {
      setSendOfferModalError("Enter a valid offer price, or leave it blank.");
      return;
    }

    setPendingAction("send_offer");
    setSendOfferModalError("");

    try {
      const response = await fetch(`/api/feed/bookings/${sendOfferDraft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_offer",
          offerPrice,
          note: sendOfferDraft.note.trim() || null,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setSendOfferModalError(data?.error ?? "Unable to send offer.");
        setPendingAction(null);
        return;
      }

      const booking = bookings.find((item) => item.id === sendOfferDraft.id);
      patchBooking(sendOfferDraft.id, {
        status: data?.status ?? "NEW_OFFER",
        statusLabel: data?.statusLabel ?? "New offer",
        totalLabel: data?.totalLabel ?? booking?.totalLabel,
      });
      setSendOfferDraft(null);
      setPendingAction(null);
      setToast({
        tone: "success",
        message: booking?.reference
          ? `New offer sent for ${booking.reference}.`
          : "New offer sent.",
      });
      router.refresh();
    } catch {
      setSendOfferModalError("Unable to send offer.");
      setPendingAction(null);
    }
  }

  async function handleDeclineOfferSubmit(event: FormEvent) {
    event.preventDefault();
    if (!declineOfferDraft) return;

    setPendingAction("decline_offer");
    setDeclineOfferModalError("");

    try {
      const response = await fetch(`/api/feed/bookings/${declineOfferDraft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "decline_offer",
          reason: declineOfferDraft.reason.trim() || null,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setDeclineOfferModalError(data?.error ?? "Unable to decline offer.");
        setPendingAction(null);
        return;
      }

      patchBooking(declineOfferDraft.id, {
        status: data?.status ?? "DECLINED",
        statusLabel: data?.statusLabel ?? "Declined",
        declinedAtLabel: data?.declinedAtLabel ?? null,
        declineReason: data?.declineReason ?? declineOfferDraft.reason,
      });
      const declined = bookings.find((item) => item.id === declineOfferDraft.id);
      setDeclineOfferDraft(null);
      setPendingAction(null);
      setToast({
        tone: "neutral",
        message: declined?.reference
          ? `Offer declined for ${declined.reference}.`
          : "Offer declined.",
      });
      router.refresh();
    } catch {
      setDeclineOfferModalError("Unable to decline offer.");
      setPendingAction(null);
    }
  }

  async function handleCounterOfferSubmit(event: FormEvent) {
    event.preventDefault();
    if (!counterOfferDraft) return;

    const offerRaw = counterOfferDraft.offerPrice.trim();
    const offerPrice = offerRaw ? Number(offerRaw) : NaN;
    if (!offerRaw || !Number.isFinite(offerPrice) || offerPrice <= 0) {
      setCounterOfferModalError("Enter a valid counter offer price.");
      return;
    }

    setPendingAction("counter_offer");
    setCounterOfferModalError("");

    try {
      const response = await fetch(`/api/feed/bookings/${counterOfferDraft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "counter_offer",
          offerPrice,
          note: counterOfferDraft.note.trim() || null,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setCounterOfferModalError(data?.error ?? "Unable to send counter offer.");
        setPendingAction(null);
        return;
      }

      const booking = bookings.find((item) => item.id === counterOfferDraft.id);
      patchBooking(counterOfferDraft.id, {
        status: data?.status ?? "NEW_OFFER",
        statusLabel: data?.statusLabel ?? "New offer",
        totalLabel: data?.totalLabel ?? booking?.totalLabel,
        counterAcceptedByProvider: false,
        counterOfferPendingForProvider: true,
      });
      setCounterOfferDraft(null);
      setPendingAction(null);
      setToast({
        tone: "success",
        message: booking?.reference
          ? `Counter offer sent for ${booking.reference}.`
          : "Counter offer sent.",
      });
      router.refresh();
    } catch {
      setCounterOfferModalError("Unable to send counter offer.");
      setPendingAction(null);
    }
  }

  async function handleAcceptCounter(booking: MyBookingItem) {
    setPendingAction("accept_counter");
    setActionError("");

    try {
      const response = await fetch(`/api/feed/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept_counter" }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setActionError(data?.error ?? "Unable to accept counter offer.");
        setPendingAction(null);
        return;
      }

      patchBooking(booking.id, {
        status: data?.status ?? "NEW_OFFER",
        statusLabel: data?.statusLabel ?? "New offer",
        totalLabel: data?.totalLabel ?? booking.totalLabel,
        counterAcceptedByProvider: true,
        counterOfferPendingForProvider: false,
      });
      setPendingAction(null);
      setToast({
        tone: "success",
        message: booking.reference
          ? `Counter offer accepted for ${booking.reference}.`
          : "Counter offer accepted.",
      });
      router.refresh();
    } catch {
      setActionError("Unable to accept counter offer.");
      setPendingAction(null);
    }
  }

  async function handleDeclineCounterSubmit(event: FormEvent) {
    event.preventDefault();
    if (!declineCounterDraft) return;

    setPendingAction("decline_counter");
    setDeclineCounterModalError("");

    try {
      const response = await fetch(`/api/feed/bookings/${declineCounterDraft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "decline_counter",
          reason: declineCounterDraft.reason.trim() || null,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setDeclineCounterModalError(data?.error ?? "Unable to decline counter offer.");
        setPendingAction(null);
        return;
      }

      const booking = bookings.find((item) => item.id === declineCounterDraft.id);
      patchBooking(declineCounterDraft.id, {
        status: data?.status ?? "NEW_OFFER",
        statusLabel: data?.statusLabel ?? "New offer",
        totalLabel: data?.totalLabel ?? booking?.totalLabel,
        counterAcceptedByProvider: false,
        counterOfferPendingForProvider: false,
      });
      setDeclineCounterDraft(null);
      setPendingAction(null);
      setToast({
        tone: "neutral",
        message: booking?.reference
          ? `Counter offer declined for ${booking.reference}.`
          : "Counter offer declined.",
      });
      router.refresh();
    } catch {
      setDeclineCounterModalError("Unable to decline counter offer.");
      setPendingAction(null);
    }
  }

  async function handleAcceptSubmit(event: FormEvent) {
    event.preventDefault();
    if (!acceptDraft) return;

    const booking = bookings.find((item) => item.id === acceptDraft.id);

    setPendingAction("accept");
    setAcceptModalError("");

    try {
      const response = await fetch(`/api/feed/bookings/${acceptDraft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "accept",
          note: acceptDraft.note.trim() || null,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setAcceptModalError(data?.error ?? "Unable to accept booking.");
        setPendingAction(null);
        return;
      }

      patchBooking(acceptDraft.id, {
        status: data?.status ?? "ACCEPTED",
        statusLabel: data?.statusLabel ?? "Accepted",
        acceptedAtLabel: data?.acceptedAtLabel ?? booking?.acceptedAtLabel ?? null,
        deliverBy: data?.deliverBy ?? booking?.deliverBy ?? null,
        totalLabel: data?.totalLabel ?? booking?.totalLabel,
      });
      setAcceptDraft(null);
      setPendingAction(null);
      setToast({
        tone: "success",
        message:
          booking?.status === "OFFER_ACCEPTED"
            ? booking?.reference
              ? `Request ${booking.reference} accepted. Delivery countdown started.`
              : "Request accepted. Delivery countdown started."
            : booking?.reference
              ? `Request ${booking.reference} approved.`
              : "Request approved.",
      });
      router.refresh();
    } catch {
      setAcceptModalError("Unable to accept booking.");
      setPendingAction(null);
    }
  }

  function openDeclineModal(booking: MyBookingItem) {
    setDeclineDraft({ id: booking.id, reason: "" });
    setDeclineModalError("");
    setActionError("");
  }

  async function handleDeclineSubmit(event: FormEvent) {
    event.preventDefault();
    if (!declineDraft) return;
    const reason = declineDraft.reason.trim();
    if (!reason) {
      setDeclineModalError("Please enter a reason for declining.");
      return;
    }

    setPendingAction("decline");
    setDeclineModalError("");

    try {
      const response = await fetch(`/api/feed/bookings/${declineDraft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "decline", reason }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setDeclineModalError(data?.error ?? "Unable to decline booking.");
        setPendingAction(null);
        return;
      }

      patchBooking(declineDraft.id, {
        status: data?.status ?? "DECLINED",
        statusLabel: data?.statusLabel ?? "Declined",
        declinedAtLabel: data?.declinedAtLabel ?? null,
        declineReason: data?.declineReason ?? reason,
      });
      const declined = bookings.find((item) => item.id === declineDraft.id);
      setDeclineDraft(null);
      setPendingAction(null);
      setToast({
        tone: "neutral",
        message: declined?.reference
          ? `Request ${declined.reference} declined.`
          : "Request declined.",
      });
      router.refresh();
    } catch {
      setDeclineModalError("Unable to decline booking.");
      setPendingAction(null);
    }
  }

  const busy = pendingAction !== null;
  const declineTarget = declineDraft
    ? bookings.find((item) => item.id === declineDraft.id) ?? null
    : null;
  const declineOfferTarget = declineOfferDraft
    ? bookings.find((item) => item.id === declineOfferDraft.id) ?? null
    : null;
  const acceptTarget = acceptDraft
    ? bookings.find((item) => item.id === acceptDraft.id) ?? null
    : null;
  const sendOfferTarget = sendOfferDraft
    ? bookings.find((item) => item.id === sendOfferDraft.id) ?? null
    : null;
  const counterOfferTarget = counterOfferDraft
    ? bookings.find((item) => item.id === counterOfferDraft.id) ?? null
    : null;
  const declineCounterTarget = declineCounterDraft
    ? bookings.find((item) => item.id === declineCounterDraft.id) ?? null
    : null;

  function renderRespondActions(booking: MyBookingItem, variant: "inline" | "panel" = "inline") {
    const respondClass =
      variant === "inline"
        ? "my-bookings__respond my-bookings__respond--inline"
        : "my-bookings__respond";

    if (canRespondToBooking(booking)) {
      return (
        <div className={respondClass}>
          <p className="my-bookings__respond-copy">
            Accept or decline this instant request to continue.
          </p>
          <div className="my-bookings__respond-actions">
            <button
              type="button"
              className="btn btn--secondary btn--xs my-bookings__respond-btn my-bookings__respond-btn--accept"
              disabled={busy}
              onClick={() => handleAccept(booking)}
            >
              {pendingAction === "accept" ? "Accepting…" : "Accept"}
            </button>
            <button
              type="button"
              className="btn btn--secondary btn--xs my-bookings__respond-btn my-bookings__respond-btn--decline"
              disabled={busy}
              onClick={() => openDeclineModal(booking)}
            >
              Decline
            </button>
          </div>
        </div>
      );
    }

    if (canSendOffer(booking)) {
      return (
        <div className={respondClass}>
          <p className="my-bookings__respond-copy">
            Send a new offer or decline this request.
          </p>
          <div className="my-bookings__respond-actions">
            <button
              type="button"
              className="btn btn--secondary btn--xs my-bookings__respond-btn my-bookings__respond-btn--accept"
              disabled={busy}
              onClick={() => handleSendOffer(booking)}
            >
              {pendingAction === "send_offer" ? "Sending…" : "Send new offer"}
            </button>
            <button
              type="button"
              className="btn btn--secondary btn--xs my-bookings__respond-btn my-bookings__respond-btn--decline"
              disabled={busy}
              onClick={() => openDeclineModal(booking)}
            >
              Decline
            </button>
          </div>
        </div>
      );
    }

    if (canFinalAcceptBooking(booking)) {
      return (
        <div className={respondClass}>
          <p className="my-bookings__respond-copy">
            The requester paid the balance. Accept to confirm the booking and start the countdown, or
            decline.
          </p>
          <div className="my-bookings__respond-actions">
            <button
              type="button"
              className="btn btn--secondary btn--xs my-bookings__respond-btn my-bookings__respond-btn--accept"
              disabled={busy}
              onClick={() => handleAccept(booking)}
            >
              {pendingAction === "accept" ? "Accepting…" : "Accept"}
            </button>
            <button
              type="button"
              className="btn btn--secondary btn--xs my-bookings__respond-btn my-bookings__respond-btn--decline"
              disabled={busy}
              onClick={() => openDeclineModal(booking)}
            >
              Decline
            </button>
          </div>
        </div>
      );
    }

    if (canRespondToCounterOffer(booking)) {
      return (
        <div className={respondClass}>
          <p className="my-bookings__respond-copy">
            The requester sent a counter offer. Accept to agree to their price, or decline to keep
            your original offer.
          </p>
          <div className="my-bookings__respond-actions">
            <button
              type="button"
              className="btn btn--secondary btn--xs my-bookings__respond-btn my-bookings__respond-btn--accept"
              disabled={busy}
              onClick={() => handleAcceptCounter(booking)}
            >
              {pendingAction === "accept_counter" ? "Accepting…" : "Accept counter"}
            </button>
            <button
              type="button"
              className="btn btn--secondary btn--xs my-bookings__respond-btn my-bookings__respond-btn--decline"
              disabled={busy}
              onClick={() => {
                setDeclineCounterDraft({ id: booking.id, reason: "" });
                setDeclineCounterModalError("");
              }}
            >
              Decline counter
            </button>
          </div>
        </div>
      );
    }

    if (canRespondToOffer(booking)) {
      const counterAccepted = Boolean(booking.counterAcceptedByProvider);
      return (
        <div className={respondClass}>
          <p className="my-bookings__respond-copy">
            {counterAccepted
              ? "Your counter was accepted. Pay the balance to continue, or decline."
              : "You received a new offer. Accept and pay the balance, counter offer, or decline."}
          </p>
          <div className="my-bookings__respond-actions">
            <button
              type="button"
              className="btn btn--secondary btn--xs my-bookings__respond-btn my-bookings__respond-btn--accept"
              disabled={busy}
              onClick={() => setOfferPaymentTarget(booking)}
            >
              Accept offer
            </button>
            {!counterAccepted ? (
              <button
                type="button"
                className="btn btn--secondary btn--xs my-bookings__respond-btn"
                disabled={busy}
                onClick={() => {
                  setCounterOfferDraft({
                    id: booking.id,
                    offerPrice: "",
                    note: "",
                  });
                  setCounterOfferModalError("");
                }}
              >
                Counter offer
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn--secondary btn--xs my-bookings__respond-btn my-bookings__respond-btn--decline"
              disabled={busy}
              onClick={() => {
                setDeclineOfferDraft({ id: booking.id, reason: "" });
                setDeclineOfferModalError("");
              }}
            >
              Decline
            </button>
          </div>
        </div>
      );
    }

    if (canWaitOnCounterOffer(booking)) {
      return (
        <div className={respondClass}>
          <p className="my-bookings__respond-copy">
            Your counter offer was sent. Waiting for the provider to accept or decline.
          </p>
        </div>
      );
    }

    if (booking.direction === "outbound" && booking.status === "OFFER_ACCEPTED") {
      return (
        <div className={respondClass}>
          <p className="my-bookings__respond-copy">
            Balance paid. Waiting for the provider to accept before the delivery countdown starts.
          </p>
        </div>
      );
    }

    return null;
  }

  return (
    <div className="app-shell page-bookings">
      <LeftNav />
      <main className="main-content bookings-page" id="main">
        <header className="my-bookings__head">
          <h1 className="my-bookings__title">Calendar</h1>
          <p className="my-bookings__subtitle">
            See your alerts, events, bookings, and requests in one place.
          </p>
          <div className="my-bookings__tabs" role="tablist" aria-label="Calendar views">
            <Link
              href="/feed/bookings?tab=calendar"
              className={`my-bookings__tab${activeTab === "calendar" ? " is-active" : ""}`}
              role="tab"
              aria-selected={activeTab === "calendar"}
            >
              Billboard
            </Link>
            <Link
              href="/feed/bookings?tab=outbound"
              className={`my-bookings__tab${activeTab === "outbound" ? " is-active" : ""}`}
              role="tab"
              aria-selected={activeTab === "outbound"}
            >
              My Requests
            </Link>
            {inboundEnabled ? (
              <Link
                href="/feed/bookings?tab=inbound"
                className={`my-bookings__tab${activeTab === "inbound" ? " is-active" : ""}`}
                role="tab"
                aria-selected={activeTab === "inbound"}
              >
                Commitments
              </Link>
            ) : (
              <span
                className="my-bookings__tab is-disabled"
                role="tab"
                aria-selected={false}
                aria-disabled="true"
                title="Commitments are available after you get verified"
              >
                Commitments
              </span>
            )}
          </div>
        </header>

        {activeTab === "calendar" ? (
          <MyBookingsCalendar bookings={bookings} onSelectBooking={openBookingDetails} />
        ) : visibleBookings.length === 0 ? (
          <div className="my-bookings__empty" role="status">
            <span className="my-bookings__empty-icon" aria-hidden="true">
              {activeTab === "inbound" ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
                  <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2 11 13" />
                  <path d="M22 2 15 22 11 13 2 9z" />
                </svg>
              )}
            </span>
            {activeTab === "inbound" ? (
              <>
                <strong>No inbound bookings yet</strong>
                <p>Incoming service requests will appear here.</p>
              </>
            ) : (
              <>
                <strong>No outbound bookings yet</strong>
                <p>When you pay for a special request, it will show up here.</p>
              </>
            )}
          </div>
        ) : (
          <ul className="my-bookings__list">
            {visibleBookings.map((booking) => (
              <li key={booking.id} className="my-bookings__card">
                <div className="my-bookings__card-main">
                  <span
                    className="my-bookings__avatar"
                    style={{ "--avatar-accent": booking.creator.avatarColor } as CSSProperties}
                    aria-hidden="true"
                  >
                    {booking.creator.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={booking.creator.avatarUrl} alt="" width={44} height={44} />
                    ) : (
                      booking.creator.avatarInitials
                    )}
                  </span>

                  <div className="my-bookings__card-body">
                    <div className="my-bookings__card-title-row">
                      <h2>{booking.requestLabel}</h2>
                      <span className={bookingStatusClass(booking.status)}>
                        {booking.statusLabel}
                      </span>
                    </div>

                    <p className="my-bookings__reference">
                      Ref <code>{booking.reference}</code>
                    </p>

                    <p className="my-bookings__creator-line">
                      {booking.creator.name}
                      <span aria-hidden="true"> · </span>
                      {booking.creator.handle}
                    </p>

                    <ul className="my-bookings__facts">
                      <li>{booking.totalLabel}</li>
                      <li>{booking.createdLabel}</li>
                      {booking.deliverByLabel ? (
                        <li>Deliver by {booking.deliverByLabel}</li>
                      ) : null}
                      {booking.contentType ? <li>{booking.contentType}</li> : null}
                    </ul>

                    {renderRespondActions(booking)}

                    {showsCountdown(booking) && booking.deliverBy ? (
                      <BookingDeliveryCountdown
                        deliverBy={booking.deliverBy}
                        compact
                        perspective={booking.direction === "inbound" ? "provider" : "requester"}
                      />
                    ) : null}
                  </div>
                </div>

                <div className="my-bookings__actions">
                  <div className="my-bookings__actions-start">
                    {canGiveFeedback(booking) ? (
                      booking.feedbackSubmitted ? (
                        <FeedbackRatingTrigger
                          booking={booking}
                          onOpen={() => setFeedbackView(booking)}
                        />
                      ) : (
                        <button
                          type="button"
                          className="btn btn--secondary btn--xs my-bookings__action-btn"
                          onClick={() => {
                            setFeedbackModalError("");
                            setFeedbackTarget(booking);
                          }}
                        >
                          <ActionIcon name="feedback" />
                          Feedback
                        </button>
                      )
                    ) : null}
                  </div>
                  <div className="my-bookings__actions-end">
                    {canDeliverBooking(booking) ? (
                      <button
                        type="button"
                        className="btn btn--secondary btn--xs my-bookings__action-btn"
                        onClick={() => setDeliverConfirm(booking)}
                      >
                        <ActionIcon name="deliver" />
                        {deliverActionLabel(booking)}
                      </button>
                    ) : null}
                    {booking.messagesHref ? (
                      <Link
                        href={booking.messagesHref}
                        className="btn btn--secondary btn--xs my-bookings__action-btn"
                      >
                        <ActionIcon name="messages" />
                        Messages
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      className="btn btn--secondary btn--xs my-bookings__action-btn"
                      onClick={() => openBookingDetails(booking)}
                    >
                      <ActionIcon name="details" />
                      Details
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
      <MobileNav />

      <div
        className={`my-bookings-drawer${open ? " is-open" : ""}`}
        aria-hidden={!open}
      >
        <div className="my-bookings-drawer__backdrop" aria-hidden="true" />
        <aside
          className="my-bookings-drawer__panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby={panelTitleId}
        >
          {selected ? (
            <>
              <header className="my-bookings-drawer__head">
                <div>
                  <p className="my-bookings-drawer__eyebrow">Booking details</p>
                  <h2 id={panelTitleId}>{selected.requestLabel}</h2>
                  <p className="my-bookings-drawer__ref">
                    Ref <code>{selected.reference}</code>
                  </p>
                </div>
                <button
                  type="button"
                  className="my-bookings-drawer__close"
                  aria-label="Close"
                  onClick={clearSelection}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
                    <path
                      d="M6 6l12 12M18 6 6 18"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </header>

              <div className="my-bookings-drawer__body">
                <div className="my-bookings-drawer__creator-row">
                  <CreatorBlock booking={selected} compact />
                  <span className={bookingStatusClass(selected.status)}>
                    {selected.statusLabel}
                  </span>
                </div>

                {renderRespondActions(selected, "panel")}

                {actionError ? (
                  <p className="my-bookings__respond-error" role="alert">
                    {actionError}
                  </p>
                ) : null}

                {showsCountdown(selected) && selected.deliverBy ? (
                  <BookingDeliveryCountdown
                    deliverBy={selected.deliverBy}
                    perspective={selected.direction === "inbound" ? "provider" : "requester"}
                  />
                ) : null}

                {canDeliverBooking(selected) ? (
                  <div className="my-bookings__respond">
                    <p className="my-bookings__respond-copy">
                      {selected.instantBooking
                        ? "Ready to fulfill this commitment? Upload your delivery and mark it complete."
                        : "Ready to fulfill this commitment? Upload your work and mark it as completed."}
                    </p>
                    <div className="my-bookings__respond-actions">
                      <button
                        type="button"
                        className="btn btn--secondary btn--xs my-bookings__respond-btn my-bookings__respond-btn--deliver"
                        onClick={() => setDeliverConfirm(selected)}
                      >
                        {deliverActionLabel(selected)}
                      </button>
                    </div>
                  </div>
                ) : null}

                {canGiveFeedback(selected) ? (
                  <div className="my-bookings__respond">
                    {selected.feedbackSubmitted ? (
                      <>
                        <p className="my-bookings__respond-copy">
                          You already left feedback for this request. Tap the rating to review it.
                        </p>
                        <div className="my-bookings__respond-actions">
                          <FeedbackRatingTrigger
                            booking={selected}
                            onOpen={() => setFeedbackView(selected)}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="my-bookings__respond-copy">
                          This request is complete. Rate the experience and leave optional feedback.
                        </p>
                        <div className="my-bookings__respond-actions">
                          <button
                            type="button"
                            className="btn btn--secondary btn--xs my-bookings__respond-btn"
                            onClick={() => {
                              setFeedbackModalError("");
                              setFeedbackTarget(selected);
                            }}
                          >
                            Give feedback
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ) : null}

                {selected.summary.length > 0 ? (
                  <section className="my-bookings__summary" aria-label="Service summary">
                    <h3>Service summary</h3>
                    <dl className="my-bookings__summary-list">
                      {selected.summary.map((row) => {
                        const isTotal = row.label === "Total charge";
                        const chips =
                          !isTotal && row.value.includes(" · ")
                            ? row.value.split(" · ").map((part) => part.trim()).filter(Boolean)
                            : null;
                        const isLong =
                          !isTotal &&
                          !chips &&
                          (row.value.length > 48 ||
                            row.label === "Message" ||
                            row.label === "Format details" ||
                            row.label === "Special instructions" ||
                            row.label === "Expectation");

                        return (
                          <div
                            key={`${selected.id}-${row.label}`}
                            className={[
                              "my-bookings__summary-row",
                              isTotal ? "my-bookings__summary-row--total" : "",
                              isLong ? "my-bookings__summary-row--block" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                          >
                            <dt>{row.label}</dt>
                            <dd>
                              {chips ? (
                                <ul className="my-bookings__summary-chips">
                                  {chips.map((chip) => (
                                    <li key={`${row.label}-${chip}`}>{chip}</li>
                                  ))}
                                </ul>
                              ) : (
                                row.value
                              )}
                            </dd>
                          </div>
                        );
                      })}
                    </dl>
                  </section>
                ) : null}

                <dl className="my-bookings__meta">
                  <div>
                    <dt>Created</dt>
                    <dd>{selected.createdLabel}</dd>
                  </div>
                  {selected.deliverByLabel ? (
                    <div>
                      <dt>Deliver by</dt>
                      <dd>{selected.deliverByLabel}</dd>
                    </div>
                  ) : null}
                  {selected.acceptedAtLabel ? (
                    <div>
                      <dt>Accepted</dt>
                      <dd>{selected.acceptedAtLabel}</dd>
                    </div>
                  ) : null}
                  {selected.declinedAtLabel ? (
                    <div>
                      <dt>Declined</dt>
                      <dd>{selected.declinedAtLabel}</dd>
                    </div>
                  ) : null}
                  {selected.declineReason ? (
                    <div>
                      <dt>Decline reason</dt>
                      <dd>{selected.declineReason}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>

              {selected.messagesHref ? (
                <footer className="my-bookings-drawer__foot">
                  <Link
                    href={selected.messagesHref}
                    className="btn btn--primary btn--sm"
                    onClick={clearSelection}
                  >
                    Open messages
                  </Link>
                </footer>
              ) : null}
            </>
          ) : null}
        </aside>
      </div>

      <DeclineReasonModal
        open={Boolean(declineDraft)}
        reference={declineTarget?.reference ?? ""}
        reason={declineDraft?.reason ?? ""}
        error={declineModalError}
        submitting={pendingAction === "decline"}
        onReasonChange={(value) =>
          setDeclineDraft((current) => (current ? { ...current, reason: value } : current))
        }
        onClose={() => {
          if (pendingAction === "decline") return;
          setDeclineDraft(null);
          setDeclineModalError("");
        }}
        onSubmit={handleDeclineSubmit}
      />

      <AcceptOfferModal
        open={Boolean(acceptDraft)}
        booking={acceptTarget}
        draft={acceptDraft}
        error={acceptModalError}
        submitting={pendingAction === "accept"}
        onDraftChange={(patch) =>
          setAcceptDraft((current) => (current ? { ...current, ...patch } : current))
        }
        onClose={() => {
          if (pendingAction === "accept") return;
          setAcceptDraft(null);
          setAcceptModalError("");
        }}
        onSubmit={handleAcceptSubmit}
      />

      <SendNewOfferModal
        open={Boolean(sendOfferDraft)}
        booking={sendOfferTarget}
        draft={sendOfferDraft}
        error={sendOfferModalError}
        submitting={pendingAction === "send_offer"}
        onDraftChange={(patch) =>
          setSendOfferDraft((current) => (current ? { ...current, ...patch } : current))
        }
        onClose={() => {
          if (pendingAction === "send_offer") return;
          setSendOfferDraft(null);
          setSendOfferModalError("");
        }}
        onSubmit={handleSendOfferSubmit}
      />

      <CounterOfferModal
        open={Boolean(counterOfferDraft)}
        booking={counterOfferTarget}
        draft={counterOfferDraft}
        error={counterOfferModalError}
        submitting={pendingAction === "counter_offer"}
        onDraftChange={(patch) =>
          setCounterOfferDraft((current) => (current ? { ...current, ...patch } : current))
        }
        onClose={() => {
          if (pendingAction === "counter_offer") return;
          setCounterOfferDraft(null);
          setCounterOfferModalError("");
        }}
        onSubmit={handleCounterOfferSubmit}
      />

      <AcceptOfferPaymentModal
        open={Boolean(offerPaymentTarget)}
        booking={offerPaymentTarget}
        submitting={false}
        onClose={() => setOfferPaymentTarget(null)}
        onConfirm={() => {
          if (!offerPaymentTarget) return;
          const href = `/feed/bookings/${encodeURIComponent(offerPaymentTarget.id)}/balance`;
          setOfferPaymentTarget(null);
          router.push(href);
        }}
      />

      <DeclineReasonModal
        open={Boolean(declineOfferDraft)}
        reference={declineOfferTarget?.reference ?? ""}
        reason={declineOfferDraft?.reason ?? ""}
        error={declineOfferModalError}
        submitting={pendingAction === "decline_offer"}
        onReasonChange={(value) =>
          setDeclineOfferDraft((current) => (current ? { ...current, reason: value } : current))
        }
        onClose={() => {
          if (pendingAction === "decline_offer") return;
          setDeclineOfferDraft(null);
          setDeclineOfferModalError("");
        }}
        onSubmit={handleDeclineOfferSubmit}
      />

      <DeclineReasonModal
        open={Boolean(declineCounterDraft)}
        reference={declineCounterTarget?.reference ?? ""}
        reason={declineCounterDraft?.reason ?? ""}
        error={declineCounterModalError}
        submitting={pendingAction === "decline_counter"}
        onReasonChange={(value) =>
          setDeclineCounterDraft((current) => (current ? { ...current, reason: value } : current))
        }
        onClose={() => {
          if (pendingAction === "decline_counter") return;
          setDeclineCounterDraft(null);
          setDeclineCounterModalError("");
        }}
        onSubmit={handleDeclineCounterSubmit}
      />

      <DeliverConfirmModal
        open={Boolean(deliverConfirm)}
        booking={deliverConfirm}
        onClose={() => setDeliverConfirm(null)}
        onConfirm={() => {
          if (!deliverConfirm) return;
          const href = `/feed/bookings/${encodeURIComponent(deliverConfirm.id)}/deliver`;
          setDeliverConfirm(null);
          router.push(href);
        }}
      />

      <FeedbackModal
        open={Boolean(feedbackTarget)}
        booking={feedbackTarget}
        submitting={feedbackSubmitting}
        submitError={feedbackModalError}
        onClose={() => {
          if (feedbackSubmitting) return;
          setFeedbackTarget(null);
          setFeedbackModalError("");
        }}
        onSubmit={async ({ rating, note, picks }) => {
          if (!feedbackTarget) return;
          const id = feedbackTarget.id;
          const ref = feedbackTarget.reference;
          setFeedbackSubmitting(true);
          setFeedbackModalError("");
          try {
            const response = await fetch(`/api/feed/bookings/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "feedback",
                rating,
                note: note || null,
                picks,
              }),
            });
            const data = await response.json().catch(() => null);
            if (!response.ok) {
              setFeedbackModalError(data?.error ?? "Unable to save feedback.");
              return;
            }
            patchBooking(id, {
              feedbackSubmitted: true,
              feedbackRating:
                typeof data?.feedbackRating === "number" ? data.feedbackRating : rating,
              feedbackNote:
                typeof data?.feedbackNote === "string"
                  ? data.feedbackNote
                  : note || null,
              feedbackPicks: Array.isArray(data?.feedbackPicks)
                ? data.feedbackPicks.filter(
                    (item: unknown): item is string => typeof item === "string",
                  )
                : picks,
              feedbackSubmittedAt:
                typeof data?.feedbackSubmittedAt === "string"
                  ? data.feedbackSubmittedAt
                  : new Date().toISOString(),
              status: typeof data?.status === "string" ? data.status : feedbackTarget.status,
              statusLabel:
                typeof data?.statusLabel === "string"
                  ? data.statusLabel
                  : feedbackTarget.statusLabel,
            });
            setFeedbackTarget(null);
            setToast({
              tone: "success",
              message: data?.alreadySubmitted
                ? `Feedback for ${ref} was already saved.`
                : `Thanks for your ${rating}-star feedback on ${ref}.`,
            });
          } catch {
            setFeedbackModalError("Unable to save feedback.");
          } finally {
            setFeedbackSubmitting(false);
          }
        }}
      />

      <FeedbackDetailsModal
        open={Boolean(feedbackView)}
        booking={feedbackView}
        onClose={() => setFeedbackView(null)}
      />

      {toast ? (
        <div
          className={`my-bookings-toast my-bookings-toast--${toast.tone}`}
          role="status"
          aria-live="polite"
        >
          <span className="my-bookings-toast__icon" aria-hidden="true">
            {toast.tone === "success" ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="12" cy="12" r="9" />
                <path d="M8 12h8" />
              </svg>
            )}
          </span>
          <p>{toast.message}</p>
          <button
            type="button"
            className="my-bookings-toast__dismiss"
            aria-label="Dismiss notification"
            onClick={() => setToast(null)}
          >
            ×
          </button>
        </div>
      ) : null}
    </div>
  );
}
