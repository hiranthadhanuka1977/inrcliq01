"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useState, type CSSProperties } from "react";
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

export default function MyBookingsView({ bookings }: { bookings: MyBookingItem[] }) {
  const panelTitleId = useId();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const bookingParam = searchParams.get("booking")?.trim() || "";
  const refParam = searchParams.get("ref")?.trim() || "";
  const paramMatch = findBookingFromParams(bookings, bookingParam, refParam);
  const activeTab = parseBookingsTab(searchParams.get("tab"));
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
      const next = new URLSearchParams(searchParams.toString());
      next.set("tab", activeTab === "calendar" ? "calendar" : booking.direction);
      next.set("booking", booking.id);
      next.delete("ref");
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [activeTab, pathname, router, searchParams],
  );

  const clearSelection = useCallback(() => {
    setSelectedId(null);
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
      if (event.key === "Escape") clearSelection();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
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
            Track requests you initiated and requests assigned to you.
          </p>
          <div className="my-bookings__tabs" role="tablist" aria-label="Booking views">
            <Link
              href="/feed/bookings?tab=calendar"
              className={`my-bookings__tab${activeTab === "calendar" ? " is-active" : ""}`}
              role="tab"
              aria-selected={activeTab === "calendar"}
            >
              Calendar
            </Link>
            <Link
              href="/feed/bookings?tab=outbound"
              className={`my-bookings__tab${activeTab === "outbound" ? " is-active" : ""}`}
              role="tab"
              aria-selected={activeTab === "outbound"}
            >
              Outbound
            </Link>
            <Link
              href="/feed/bookings?tab=inbound"
              className={`my-bookings__tab${activeTab === "inbound" ? " is-active" : ""}`}
              role="tab"
              aria-selected={activeTab === "inbound"}
            >
              Inbound
            </Link>
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
                    onClick={() => openBookingDetails(booking)}
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
