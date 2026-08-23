"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { bookingStatusClass } from "@/lib/feed/booking-status";
import {
  dateKeysBetween,
  formatDateKeyLabel,
  todayDateKey,
  toDateKey,
} from "@/lib/calendar-date";
import type { SettingsBookingRow } from "@/lib/settings/bookings";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const OCCUPYING_STATUSES = new Set(["RECEIVED", "ACCEPTED", "IN_PROGRESS", "DELIVERED"]);

type CalendarCursor = {
  year: number;
  month: number;
};

function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleString("en-US", {
    month: "long",
  });
}

/** Prefer delivery date, then scheduled date, then created date. */
export function bookingCalendarDate(booking: SettingsBookingRow): Date {
  const preferred = booking.deliverBy || booking.requestedForAt || booking.createdAt;
  return new Date(preferred);
}

function bookingCalendarKey(booking: SettingsBookingRow): string {
  return toDateKey(bookingCalendarDate(booking));
}

function occupiesDay(booking: SettingsBookingRow) {
  return OCCUPYING_STATUSES.has(booking.status);
}

function bookingDetailsHref(booking: SettingsBookingRow) {
  const params = new URLSearchParams({
    tab: "inbound",
    booking: booking.id,
  });
  return `/feed/bookings?${params.toString()}`;
}

type SellerBookingsCalendarProps = {
  bookings: SettingsBookingRow[];
  initialUnavailableDates?: string[];
};

export function SellerBookingsCalendar({
  bookings,
  initialUnavailableDates = [],
}: SellerBookingsCalendarProps) {
  const now = new Date();
  const todayKey = todayDateKey(now);
  const [cursor, setCursor] = useState<CalendarCursor>({
    year: now.getFullYear(),
    month: now.getMonth(),
  });
  const [selectedKey, setSelectedKey] = useState<string | null>(todayKey);
  const [blocking, setBlocking] = useState(false);
  const [pickedKeys, setPickedKeys] = useState<Set<string>>(() => new Set());
  const [anchorKey, setAnchorKey] = useState<string | null>(null);
  const [unavailableKeys, setUnavailableKeys] = useState<Set<string>>(
    () => new Set(initialUnavailableDates),
  );
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuCloseTimer = useRef<number | null>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  function openMenu() {
    if (menuCloseTimer.current) {
      window.clearTimeout(menuCloseTimer.current);
      menuCloseTimer.current = null;
    }
    setMenuOpen(true);
  }

  function closeMenu(delay = 0) {
    if (menuCloseTimer.current) window.clearTimeout(menuCloseTimer.current);
    if (delay <= 0) {
      setMenuOpen(false);
      return;
    }
    menuCloseTimer.current = window.setTimeout(() => {
      setMenuOpen(false);
      menuCloseTimer.current = null;
    }, delay);
  }

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: globalThis.MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    return () => {
      if (menuCloseTimer.current) window.clearTimeout(menuCloseTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!blocking) return;
    const node = actionsRef.current;
    if (!node) return;
    node.scrollIntoView({ behavior: "smooth", block: "end", inline: "nearest" });
    const frame = window.requestAnimationFrame(() => {
      node.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [blocking]);

  const bookingsByDay = useMemo(() => {
    const map = new Map<string, SettingsBookingRow[]>();
    for (const booking of bookings) {
      const key = bookingCalendarKey(booking);
      const list = map.get(key);
      if (list) list.push(booking);
      else map.set(key, [booking]);
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) => bookingCalendarDate(a).getTime() - bookingCalendarDate(b).getTime(),
      );
    }
    return map;
  }, [bookings]);

  const occupiedKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const [key, list] of bookingsByDay) {
      if (list.some(occupiesDay)) keys.add(key);
    }
    return keys;
  }, [bookingsByDay]);

  const calendarDays = useMemo(() => {
    const { year, month } = cursor;
    const first = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (
      | { key: string; inMonth: false }
      | { key: string; inMonth: true; date: Date; dateKey: string }
    )[] = [];

    for (let index = 0; index < first.getDay(); index += 1) {
      cells.push({ key: `pad-start-${index}`, inMonth: false });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day);
      cells.push({
        key: toDateKey(date),
        inMonth: true,
        date,
        dateKey: toDateKey(date),
      });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ key: `pad-end-${cells.length}`, inMonth: false });
    }
    return cells;
  }, [cursor]);

  const selectedBookings = selectedKey ? bookingsByDay.get(selectedKey) ?? [] : [];
  const monthBookingCount = useMemo(() => {
    let count = 0;
    for (const [key, list] of bookingsByDay) {
      if (key.startsWith(`${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}`)) {
        count += list.length;
      }
    }
    return count;
  }, [bookingsByDay, cursor.month, cursor.year]);

  const pickedList = useMemo(() => [...pickedKeys].sort(), [pickedKeys]);
  const pickedToBlock = useMemo(
    () => pickedList.filter((key) => !unavailableKeys.has(key) && !occupiedKeys.has(key) && key >= todayKey),
    [occupiedKeys, pickedList, todayKey, unavailableKeys],
  );
  const pickedToUnblock = useMemo(
    () => pickedList.filter((key) => unavailableKeys.has(key)),
    [pickedList, unavailableKeys],
  );

  function shiftMonth(delta: number) {
    setCursor((current) => {
      const next = new Date(current.year, current.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  function canPickKey(key: string) {
    return key >= todayKey && !occupiedKeys.has(key);
  }

  function startBlocking() {
    setBlocking(true);
    setMenuOpen(false);
    setError("");
    setNotice("");
  }

  function stopBlocking() {
    setBlocking(false);
    setPickedKeys(new Set());
    setAnchorKey(null);
    setMenuOpen(false);
    setError("");
    setNotice("");
  }

  function applyPick(keys: string[], additive: boolean) {
    setPickedKeys((current) => {
      const next = additive ? new Set(current) : new Set<string>();
      for (const key of keys) {
        if (!canPickKey(key)) continue;
        if (additive && current.has(key) && keys.length === 1) {
          next.delete(key);
        } else {
          next.add(key);
        }
      }
      return next;
    });
  }

  function handleDayClick(event: MouseEvent<HTMLButtonElement>, dateKey: string) {
    setSelectedKey(dateKey);
    setError("");
    setNotice("");
    if (!blocking) return;

    if (!canPickKey(dateKey)) {
      setAnchorKey(dateKey);
      return;
    }

    if (event.shiftKey && anchorKey) {
      applyPick(dateKeysBetween(anchorKey, dateKey), true);
      setAnchorKey(dateKey);
      return;
    }

    applyPick([dateKey], true);
    setAnchorKey(dateKey);
  }

  async function saveAvailability(dates: string[], unavailable: boolean) {
    if (dates.length === 0) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/seller/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dates, unavailable }),
      });
      const data = (await response.json().catch(() => null)) as {
        dates?: string[];
        skipped?: string[];
        error?: string;
      } | null;
      if (data?.dates) setUnavailableKeys(new Set(data.dates));
      if (!response.ok) {
        setError(data?.error ?? "Unable to update availability.");
        return;
      }
      const skipped = data?.skipped?.length ?? 0;
      setPickedKeys(new Set());
      setAnchorKey(null);
      if (unavailable) {
        setNotice(
          skipped > 0
            ? `Marked ${dates.length - skipped} day${dates.length - skipped === 1 ? "" : "s"} unavailable. ${skipped} already had bookings.`
            : `Marked ${dates.length} day${dates.length === 1 ? "" : "s"} unavailable.`,
        );
      } else {
        setNotice(`Opened ${dates.length} day${dates.length === 1 ? "" : "s"} for bookings.`);
      }
    } catch {
      setError("Unable to update availability.");
    } finally {
      setSaving(false);
    }
  }

  const selectedUnavailable = selectedKey ? unavailableKeys.has(selectedKey) : false;
  const selectedOccupied = selectedKey ? occupiedKeys.has(selectedKey) : false;
  const selectedPast = selectedKey ? selectedKey < todayKey : false;

  return (
    <div className="seller-calendar">
      <div className="seller-offerings__toolbar">
        <div>
          <h2 className="seller-offerings__title">Booking calendar</h2>
          <p className="seller-offerings__hint">
            Monthly view of requests by delivery or scheduled date
            {monthBookingCount > 0 ? ` · ${monthBookingCount} this month` : ""}.
            {blocking
              ? " Select one or more open days, then mark them unavailable. Days with bookings stay open for those requests."
              : ""}
          </p>
        </div>
        <div
          className="seller-context-menu seller-calendar__manage"
          ref={menuRef}
          onMouseEnter={openMenu}
          onMouseLeave={() => closeMenu(120)}
        >
          <button
            type="button"
            className="btn btn--ghost btn--sm seller-calendar__manage-trigger"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => (menuOpen ? closeMenu() : openMenu())}
            onFocus={openMenu}
          >
            <span>Manage</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" width="16" height="16">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
          {menuOpen ? (
            <div className="seller-context-menu__dropdown" role="menu" aria-label="Calendar options">
              {blocking ? (
                <button
                  type="button"
                  className="seller-context-menu__item"
                  role="menuitem"
                  onClick={stopBlocking}
                >
                  Done
                </button>
              ) : (
                <button
                  type="button"
                  className="seller-context-menu__item"
                  role="menuitem"
                  onClick={startBlocking}
                >
                  Block days
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="seller-banner seller-banner--error" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="seller-banner seller-banner--ok" role="status">
          {notice}
        </p>
      ) : null}

      <div className={`seller-calendar__board${blocking ? " is-blocking" : ""}`}>
        <div className="seller-calendar__toolbar">
          <button
            type="button"
            className="seller-calendar__nav"
            aria-label="Previous month"
            onClick={() => shiftMonth(-1)}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
            </svg>
          </button>
          <div className="seller-calendar__period">
            {monthLabel(cursor.year, cursor.month)} {cursor.year}
          </div>
          <button
            type="button"
            className="seller-calendar__nav"
            aria-label="Next month"
            onClick={() => shiftMonth(1)}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6z" />
            </svg>
          </button>
        </div>

        <div className="seller-calendar__weekdays" aria-hidden="true">
          {WEEKDAYS.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>

        <div className="seller-calendar__grid" role="grid" aria-label="Booking calendar">
          {calendarDays.map((cell) => {
            if (!cell.inMonth) {
              return <span key={cell.key} className="seller-calendar__cell is-empty" />;
            }

            const dayBookings = bookingsByDay.get(cell.dateKey) ?? [];
            const isSelected = selectedKey === cell.dateKey;
            const isToday = cell.dateKey === todayKey;
            const isUnavailable = unavailableKeys.has(cell.dateKey);
            const isOccupied = occupiedKeys.has(cell.dateKey);
            const isPicked = blocking && pickedKeys.has(cell.dateKey);
            const isPast = cell.dateKey < todayKey;
            const preview = dayBookings.slice(0, 2);
            const overflow = dayBookings.length - preview.length;
            const labelBits = [
              cell.date.toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              }),
            ];
            if (dayBookings.length) {
              labelBits.push(
                `${dayBookings.length} booking${dayBookings.length === 1 ? "" : "s"}`,
              );
            }
            if (isUnavailable) labelBits.push("unavailable for bookings");
            if (blocking && isOccupied) labelBits.push("cannot be blocked");

            return (
              <button
                key={cell.key}
                type="button"
                role="gridcell"
                className={`seller-calendar__cell${isSelected ? " is-selected" : ""}${
                  isToday ? " is-today" : ""
                }${dayBookings.length > 0 ? " has-bookings" : ""}${
                  isUnavailable ? " is-unavailable" : ""
                }${isPicked ? " is-picked" : ""}${isOccupied && blocking ? " is-locked" : ""}${
                  isPast && blocking ? " is-past" : ""
                }`}
                aria-pressed={blocking ? isPicked : isSelected}
                aria-label={labelBits.join(", ")}
                onClick={(event) => handleDayClick(event, cell.dateKey)}
              >
                <span className="seller-calendar__day-row">
                  <span className="seller-calendar__day">{cell.date.getDate()}</span>
                  {isUnavailable ? <span className="seller-calendar__badge">Blocked</span> : null}
                </span>
                {dayBookings.length > 0 ? (
                  <span className="seller-calendar__events">
                    {preview.map((booking) => (
                      <span
                        key={booking.id}
                        className={`seller-calendar__chip seller-calendar__chip--${booking.status
                          .trim()
                          .toLowerCase()}`}
                        title={`${booking.requestLabel} · ${booking.statusLabel}`}
                      >
                        {booking.requestLabel}
                      </span>
                    ))}
                    {overflow > 0 ? (
                      <span className="seller-calendar__more">+{overflow} more</span>
                    ) : null}
                  </span>
                ) : (
                  <span className="seller-calendar__empty-slot" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {blocking ? (
        <div className="seller-calendar__legend" aria-hidden="true">
          <span>
            <i className="seller-calendar__swatch seller-calendar__swatch--picked" /> Selected
          </span>
          <span>
            <i className="seller-calendar__swatch seller-calendar__swatch--unavailable" /> Unavailable
          </span>
          <span>
            <i className="seller-calendar__swatch seller-calendar__swatch--booked" /> Has bookings
          </span>
        </div>
      ) : null}

      <div className="seller-calendar__detail" aria-live="polite">
        <h3 className="seller-calendar__detail-title">
          {selectedKey ? formatDateKeyLabel(selectedKey) : "Select a day"}
        </h3>

        {selectedOccupied && blocking ? (
          <p className="seller-calendar__detail-note">
            This day already has bookings, so it cannot be marked unavailable.
          </p>
        ) : null}
        {selectedUnavailable && !selectedOccupied ? (
          <p className="seller-calendar__detail-note">
            This day is marked unavailable for new bookings.
          </p>
        ) : null}
        {selectedPast && blocking && !selectedOccupied ? (
          <p className="seller-calendar__detail-note">Past days cannot be blocked.</p>
        ) : null}

        {selectedBookings.length === 0 ? (
          <p className="seller-calendar__detail-empty">
            {selectedUnavailable ? "Closed for bookings." : "No bookings on this day."}
          </p>
        ) : (
          <ul className="seller-calendar__detail-list">
            {selectedBookings.map((booking) => (
              <li key={booking.id}>
                <Link
                  href={bookingDetailsHref(booking)}
                  className="seller-calendar__detail-item"
                  aria-label={`Open ${booking.requestLabel} (${booking.reference}) in Calendar`}
                >
                  <div className="seller-calendar__detail-copy">
                    <strong>{booking.requestLabel}</strong>
                    <span>
                      {booking.requesterName}
                      {booking.category ? ` · ${booking.category}` : ""}
                      {` · ${booking.totalLabel}`}
                    </span>
                    <span className="seller-calendar__detail-ref">{booking.reference}</span>
                  </div>
                  <span className={bookingStatusClass(booking.status)}>{booking.statusLabel}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {blocking ? (
        <div
          className="seller-calendar__actions"
          ref={actionsRef}
          tabIndex={-1}
          aria-label="Block days"
        >
          <p className="seller-calendar__actions-copy">
            {pickedList.length === 0
              ? "Tap days to select them. Shift-click to select a range. Days with bookings cannot be blocked."
              : `${pickedList.length} day${pickedList.length === 1 ? "" : "s"} selected.`}
          </p>
          <div className="seller-calendar__actions-buttons">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={saving}
              onClick={stopBlocking}
            >
              Done
            </button>
            {pickedList.length > 0 ? (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={saving}
                onClick={() => {
                  setPickedKeys(new Set());
                  setAnchorKey(null);
                }}
              >
                Clear
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              disabled={saving || pickedToUnblock.length === 0}
              onClick={() => void saveAvailability(pickedToUnblock, false)}
            >
              Make available
            </button>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              disabled={saving || pickedToBlock.length === 0}
              onClick={() => void saveAvailability(pickedToBlock, true)}
            >
              {saving ? "Saving…" : "Mark unavailable"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
