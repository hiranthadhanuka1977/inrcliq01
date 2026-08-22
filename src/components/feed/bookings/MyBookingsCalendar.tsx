"use client";

import { useMemo, useState } from "react";
import { bookingStatusClass } from "@/lib/feed/booking-status";
import type { MyBookingItem } from "@/lib/feed/user-bookings";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

type CalendarCursor = {
  year: number;
  month: number;
};

type CalendarDirectionFilter = "all" | "inbound" | "outbound";

const DIRECTION_FILTERS: Array<{ id: CalendarDirectionFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "inbound", label: "Commitments" },
  { id: "outbound", label: "My Requests" },
];

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
export function bookingCalendarDate(booking: MyBookingItem): Date {
  const preferred = booking.deliverBy || booking.requestedForAt || booking.createdAt;
  return new Date(preferred);
}

function bookingCalendarKey(booking: MyBookingItem): string {
  return toDateKey(bookingCalendarDate(booking));
}

export default function MyBookingsCalendar({
  bookings,
  onSelectBooking,
}: {
  bookings: MyBookingItem[];
  onSelectBooking: (booking: MyBookingItem) => void;
}) {
  const now = new Date();
  const [cursor, setCursor] = useState<CalendarCursor>({
    year: now.getFullYear(),
    month: now.getMonth(),
  });
  const [selectedKey, setSelectedKey] = useState<string | null>(toDateKey(now));
  const [directionFilter, setDirectionFilter] = useState<CalendarDirectionFilter>("all");

  const filteredBookings = useMemo(() => {
    if (directionFilter === "all") return bookings;
    return bookings.filter((booking) => booking.direction === directionFilter);
  }, [bookings, directionFilter]);

  const bookingsByDay = useMemo(() => {
    const map = new Map<string, MyBookingItem[]>();
    for (const booking of filteredBookings) {
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
  }, [filteredBookings]);

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
    const prefix = `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}`;
    for (const [key, list] of bookingsByDay) {
      if (key.startsWith(prefix)) count += list.length;
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
    <div className="my-bookings-calendar">
      <div className="my-bookings-calendar__controls">
        <p className="my-bookings-calendar__hint">
          {directionFilter === "all"
            ? "Your alerts, events, bookings, and requests by date"
            : directionFilter === "inbound"
              ? "Commitments by delivery or scheduled date"
              : "My requests by delivery or scheduled date"}
          {monthBookingCount > 0 ? ` · ${monthBookingCount} this month` : ""}.
        </p>
        <div
          className="my-bookings-calendar__filters"
          role="group"
          aria-label="Filter calendar bookings"
        >
          {DIRECTION_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={`my-bookings-calendar__filter${
                directionFilter === filter.id ? " is-active" : ""
              }`}
              aria-pressed={directionFilter === filter.id}
              onClick={() => setDirectionFilter(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="my-bookings-calendar__board">
        <div className="my-bookings-calendar__toolbar">
          <button
            type="button"
            className="my-bookings-calendar__nav"
            aria-label="Previous month"
            onClick={() => shiftMonth(-1)}
          >
            ‹
          </button>
          <div className="my-bookings-calendar__period">
            {monthLabel(cursor.year, cursor.month)} {cursor.year}
          </div>
          <button
            type="button"
            className="my-bookings-calendar__nav"
            aria-label="Next month"
            onClick={() => shiftMonth(1)}
          >
            ›
          </button>
        </div>

        <div className="my-bookings-calendar__weekdays" aria-hidden="true">
          {WEEKDAYS.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>

        <div className="my-bookings-calendar__grid" role="grid" aria-label="Booking calendar">
          {calendarDays.map((cell) => {
            if (!cell.inMonth) {
              return <span key={cell.key} className="my-bookings-calendar__cell is-empty" />;
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
                className={`my-bookings-calendar__cell${isSelected ? " is-selected" : ""}${
                  isToday ? " is-today" : ""
                }${dayBookings.length > 0 ? " has-bookings" : ""}`}
                aria-selected={isSelected}
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
                <span className="my-bookings-calendar__day">{cell.date.getDate()}</span>
                {dayBookings.length > 0 ? (
                  <span className="my-bookings-calendar__events">
                    {preview.map((booking) => (
                      <span
                        key={booking.id}
                        className={`my-bookings-calendar__chip my-bookings-calendar__chip--${booking.status
                          .trim()
                          .toLowerCase()}`}
                        title={`${booking.requestLabel} · ${booking.direction} · ${booking.statusLabel}`}
                      >
                        {booking.requestLabel}
                      </span>
                    ))}
                    {overflow > 0 ? (
                      <span className="my-bookings-calendar__more">+{overflow} more</span>
                    ) : null}
                  </span>
                ) : (
                  <span className="my-bookings-calendar__empty-slot" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="my-bookings-calendar__detail" aria-live="polite">
        <h3 className="my-bookings-calendar__detail-title">
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
          <p className="my-bookings-calendar__detail-empty">
            {selectedKey === todayKey ? "There's none for today." : "There's none for this day."}
          </p>
        ) : (
          <ul className="my-bookings-calendar__detail-list">
            {selectedBookings.map((booking) => (
              <li key={booking.id}>
                <button
                  type="button"
                  className="my-bookings-calendar__detail-item"
                  onClick={() => onSelectBooking(booking)}
                >
                  <div className="my-bookings-calendar__detail-copy">
                    <strong>{booking.requestLabel}</strong>
                    <span>
                      {booking.direction === "inbound" ? "Commitments" : "My Requests"}
                      {` · ${booking.creator.name}`}
                      {booking.category ? ` · ${booking.category}` : ""}
                      {` · ${booking.totalLabel}`}
                    </span>
                    <span className="my-bookings-calendar__detail-ref">
                      Ref {booking.reference}
                    </span>
                  </div>
                  <span className={bookingStatusClass(booking.status)}>{booking.statusLabel}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
