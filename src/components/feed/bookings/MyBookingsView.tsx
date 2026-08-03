"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useState, type CSSProperties } from "react";
import type { MyBookingItem } from "@/lib/feed/user-bookings";
import { bookingStatusClass } from "@/lib/feed/booking-status";
import BookingDeliveryCountdown from "@/components/feed/bookings/BookingDeliveryCountdown";
import LeftNav from "@/components/feed/LeftNav";
import MobileNav from "@/components/feed/MobileNav";

function showsCountdown(booking: MyBookingItem) {
  if (!booking.deliverBy) return false;
  return !["DELIVERED", "DECLINED", "CANCELLED"].includes(booking.status);
}

function CreatorBlock({
  booking,
  compact = false,
}: {
  booking: MyBookingItem;
  compact?: boolean;
}) {
  const profileHref = booking.creator.slug
    ? `/feed/profile/${booking.creator.slug}`
    : null;

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

  if (profileHref) {
    return (
      <Link
        href={profileHref}
        className="my-bookings__creator"
        aria-label={`Open ${booking.creator.name}'s profile`}
      >
        {avatar}
        {copy}
      </Link>
    );
  }

  return (
    <div className="my-bookings__creator">
      {avatar}
      {copy}
    </div>
  );
}

export default function MyBookingsView({ bookings }: { bookings: MyBookingItem[] }) {
  const panelTitleId = useId();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = bookings.find((booking) => booking.id === selectedId) ?? null;
  const open = Boolean(selected);

  useEffect(() => {
    const bookingParam = searchParams.get("booking")?.trim() || "";
    const refParam = searchParams.get("ref")?.trim() || "";
    if (!bookingParam && !refParam) return;

    const match =
      (bookingParam ? bookings.find((booking) => booking.id === bookingParam) : null) ||
      (refParam
        ? bookings.find(
            (booking) => booking.reference.toLowerCase() === refParam.toLowerCase(),
          )
        : null);

    if (match) {
      setSelectedId(match.id);
    }
  }, [bookings, searchParams]);

  const clearSelection = useCallback(() => {
    setSelectedId(null);
    if (searchParams.get("booking") || searchParams.get("ref")) {
      router.replace(pathname, { scroll: false });
    }
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") clearSelection();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, clearSelection]);

  return (
    <div className="app-shell page-bookings">
      <LeftNav />
      <main className="main-content bookings-page" id="main">
        <header className="my-bookings__head">
          <h1 className="my-bookings__title">Bookings</h1>
          <p className="my-bookings__subtitle">
            Special requests you&apos;ve placed with creators.
          </p>
        </header>

        {bookings.length === 0 ? (
          <p className="my-bookings__empty">
            No bookings yet. When you pay for a special request, it will show up here.
          </p>
        ) : (
          <ul className="my-bookings__list">
            {bookings.map((booking) => (
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

                    {booking.creator.slug ? (
                      <Link
                        href={`/feed/profile/${booking.creator.slug}`}
                        className="my-bookings__creator-line"
                      >
                        {booking.creator.name}
                        <span aria-hidden="true"> · </span>
                        {booking.creator.handle}
                      </Link>
                    ) : (
                      <p className="my-bookings__creator-line">
                        {booking.creator.name}
                        <span aria-hidden="true"> · </span>
                        {booking.creator.handle}
                      </p>
                    )}

                    <ul className="my-bookings__facts">
                      <li>{booking.totalLabel}</li>
                      <li>{booking.createdLabel}</li>
                      {booking.contentType ? <li>{booking.contentType}</li> : null}
                      <li>
                        Ref <code>{booking.reference}</code>
                      </li>
                    </ul>

                    {showsCountdown(booking) && booking.deliverBy ? (
                      <BookingDeliveryCountdown deliverBy={booking.deliverBy} compact />
                    ) : null}
                  </div>
                </div>

                <div className="my-bookings__actions">
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => setSelectedId(booking.id)}
                  >
                    Details
                  </button>
                  {booking.messagesHref ? (
                    <Link href={booking.messagesHref} className="btn btn--secondary btn--sm">
                      Messages
                    </Link>
                  ) : null}
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
        <button
          type="button"
          className="my-bookings-drawer__backdrop"
          aria-label="Close booking details"
          tabIndex={open ? 0 : -1}
          onClick={clearSelection}
        />
        <aside
          className="my-bookings-drawer__panel"
          role="dialog"
          aria-modal="true"
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

                {showsCountdown(selected) && selected.deliverBy ? (
                  <BookingDeliveryCountdown deliverBy={selected.deliverBy} />
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
    </div>
  );
}
