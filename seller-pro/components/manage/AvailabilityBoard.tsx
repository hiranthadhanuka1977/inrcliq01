"use client";

import { useState } from "react";
import { dateKeyFromBookingWhen, toDateKey } from "@/lib/calendar-date";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type DayBooking = {
  id: string;
  when: string | null;
  label: string;
  who: string;
};

function cellsFor(year: number, month: number) {
  const pad = new Date(year, month, 1).getDay();
  const count = new Date(year, month + 1, 0).getDate();
  const cells: Array<string | null> = Array.from({ length: pad }, () => null);
  for (let day = 1; day <= count; day += 1) cells.push(toDateKey(new Date(year, month, day)));
  return cells;
}

export function AvailabilityBoard({
  dates,
  bookings,
}: {
  dates: string[];
  bookings: DayBooking[];
}) {
  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [blocked, setBlocked] = useState(() => new Set(dates));
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const monthName = new Date(cursor.year, cursor.month, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  const cells = cellsFor(cursor.year, cursor.month);
  const monthKey = `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}`;
  const monthBookings = bookings.filter((booking) => dateKeyFromBookingWhen(booking.when)?.startsWith(monthKey));

  async function toggle(key: string) {
    const nextBlocked = !blocked.has(key);
    setBusy(key);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/seller/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dates: [key], unavailable: nextBlocked }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string; dates?: string[] } | null;
      if (!response.ok) {
        setError(data?.error || "Unable to update that day.");
        if (data?.dates) setBlocked(new Set(data.dates));
        return;
      }
      setBlocked(new Set(data?.dates ?? []));
      setNotice(nextBlocked ? "Day blocked." : "Day opened.");
    } catch {
      setError("Unable to update that day.");
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      {error ? <p className="admin-banner admin-banner--err">{error}</p> : null}
      {notice ? <p className="admin-banner admin-banner--ok">{notice}</p> : null}
      <div className="studio-cal-nav">
        <button
          className="admin-btn admin-btn--subtle"
          type="button"
          onClick={() =>
            setCursor((current) =>
              current.month === 0
                ? { year: current.year - 1, month: 11 }
                : { year: current.year, month: current.month - 1 },
            )
          }
        >
          Previous
        </button>
        <strong>{monthName}</strong>
        <button
          className="admin-btn admin-btn--subtle"
          type="button"
          onClick={() =>
            setCursor((current) =>
              current.month === 11
                ? { year: current.year + 1, month: 0 }
                : { year: current.year, month: current.month + 1 },
            )
          }
        >
          Next
        </button>
      </div>
      <div className="studio-cal" role="grid" aria-label={monthName}>
        {WEEKDAYS.map((day) => (
          <span key={day} className="studio-cal__label">
            {day}
          </span>
        ))}
        {cells.map((key, index) =>
          key ? (
            <button
              key={key}
              type="button"
              disabled={busy === key}
              className={[blocked.has(key) ? "is-blocked" : "", bookings.some((booking) => dateKeyFromBookingWhen(booking.when) === key) ? "has-booking" : ""]
                .filter(Boolean)
                .join(" ")}
              aria-pressed={blocked.has(key)}
              onClick={() => void toggle(key)}
            >
              {Number(key.slice(-2))}
            </button>
          ) : (
            <span key={`pad-${index}`} />
          ),
        )}
      </div>
      <p className="studio-note">Click a day to block it. Fans cannot book blocked days. A blue underline means a request is already on that day.</p>
      {monthBookings.length > 0 ? (
        <div className="admin-panel" style={{ marginTop: 16, maxWidth: 640 }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>This month</th>
                <th>Fan</th>
              </tr>
            </thead>
            <tbody>
              {monthBookings.map((booking) => (
                <tr key={booking.id}>
                  <td>{booking.label}</td>
                  <td>{booking.who}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
}
