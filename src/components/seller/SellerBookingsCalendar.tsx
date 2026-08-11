"use client";

import { useMemo, useState } from "react";
import { bookingStatusClass } from "@/lib/feed/booking-status";
import type { SettingsBookingRow } from "@/lib/settings/bookings";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

type CalendarCursor = {
  year: number;
  month: number;
};

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

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

type SellerBookingsCalendarProps = {
  bookings: SettingsBookingRow[];
};

export function SellerBookingsCalendar({ bookings }: SellerBookingsCalendarProps) {
  const now = new Date();
  const [cursor, setCursor] = useState<CalendarCursor>({
    year: now.getFullYear(),
    month: now.getMonth(),
  });
  const [selectedKey, setSelectedKey] = useState<string | null>(toDateKey(now));

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

  const todayKey = toDateKey(now);

  function shiftMonth(delta: number) {
    setCursor((current) => {
      const next = new Date(current.year, current.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  return (
    <div className="seller-calendar">
      <div className="seller-offerings__toolbar">
        <div>
          <h2 className="seller-offerings__title">Booking calendar</h2>
          <p className="seller-offerings__hint">
            Monthly view of requests by delivery or scheduled date
            {monthBookingCount > 0 ? ` · ${monthBookingCount} this month` : ""}.
          </p>
        </div>
      </div>

      <div className="seller-calendar__board">
        <div className="seller-calendar__toolbar">
          <button
            type="button"
            className="seller-calendar__nav"
            aria-label="Previous month"
            onClick={() => shiftMonth(-1)}
          >
            ‹
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
            ›
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
            const preview = dayBookings.slice(0, 2);
            const overflow = dayBookings.length - preview.length;

            return (
              <button
                key={cell.key}
                type="button"
                role="gridcell"
                className={`seller-calendar__cell${isSelected ? " is-selected" : ""}${
                  isToday ? " is-today" : ""
                }${dayBookings.length > 0 ? " has-bookings" : ""}`}
                aria-pressed={isSelected}
                aria-label={`${cell.date.toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}${
                  dayBookings.length
                    ? `, ${dayBookings.length} booking${dayBookings.length === 1 ? "" : "s"}`
                    : ""
                }`}
                onClick={() => setSelectedKey(cell.dateKey)}
              >
                <span className="seller-calendar__day">{cell.date.getDate()}</span>
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

      <div className="seller-calendar__detail" aria-live="polite">
        <h3 className="seller-calendar__detail-title">
          {selectedKey
            ? new Date(`${selectedKey}T12:00:00`).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })
            : "Select a day"}
        </h3>

        {selectedBookings.length === 0 ? (
          <p className="seller-calendar__detail-empty">No bookings on this day.</p>
        ) : (
          <ul className="seller-calendar__detail-list">
            {selectedBookings.map((booking) => (
              <li key={booking.id} className="seller-calendar__detail-item">
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
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
