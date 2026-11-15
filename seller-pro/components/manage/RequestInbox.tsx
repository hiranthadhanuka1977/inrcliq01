"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type InboxBooking = {
  id: string;
  reference: string;
  status: string;
  statusLabel: string;
  requestLabel: string;
  requesterName: string;
  totalLabel: string;
  deliverBy: string | null;
  requestedForAt: string | null;
};

function whenLabel(booking: InboxBooking) {
  const raw = booking.requestedForAt || booking.deliverBy;
  if (!raw) return "No date";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function RequestInbox({
  bookings,
  detailsBase,
}: {
  bookings: InboxBooking[];
  detailsBase: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(bookings);
  const [declining, setDeclining] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function act(id: string, action: "accept" | "decline") {
    setBusy(id);
    setError("");
    try {
      const response = await fetch(`/api/seller/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "decline" ? { action, reason } : { action }),
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
        status?: string;
        statusLabel?: string;
      } | null;
      if (!response.ok) {
        setError(data?.error || "Unable to update this request.");
        return;
      }
      setRows((current) =>
        current.map((row) =>
          row.id === id
            ? { ...row, status: data?.status || row.status, statusLabel: data?.statusLabel || row.statusLabel }
            : row,
        ),
      );
      setDeclining(null);
      setReason("");
      router.refresh();
    } catch {
      setError("Unable to update this request.");
    } finally {
      setBusy("");
    }
  }

  if (rows.length === 0) {
    return (
      <div className="admin-panel">
        <p className="admin-empty">When a fan books, the request shows up here. You can accept it or decline it with a short reason.</p>
      </div>
    );
  }

  return (
    <>
      {error ? <p className="admin-banner admin-banner--err">{error}</p> : null}
      <div className="admin-panel">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Request</th>
              <th>When</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((booking) => (
              <tr key={booking.id}>
                <td>
                  <a href={`${detailsBase}${booking.id}`} target="_blank" rel="noreferrer">
                    {booking.requestLabel || booking.reference}
                    <small className="admin-meta">
                      {booking.requesterName}
                      {booking.totalLabel ? ` · ${booking.totalLabel}` : ""}
                    </small>
                  </a>
                </td>
                <td>{whenLabel(booking)}</td>
                <td>
                  <span className={booking.status === "RECEIVED" ? "admin-lozenge admin-lozenge--warning" : "admin-lozenge"}>
                    {booking.statusLabel || booking.status}
                  </span>
                </td>
                <td>
                  {booking.status === "RECEIVED" ? (
                    <div className="admin-actions">
                      <button className="admin-btn" type="button" disabled={busy === booking.id} onClick={() => void act(booking.id, "accept")}>
                        Accept
                      </button>
                      <button
                        className="admin-btn admin-btn--subtle"
                        type="button"
                        disabled={busy === booking.id}
                        onClick={() => {
                          setDeclining(booking.id);
                          setReason("");
                        }}
                      >
                        Decline
                      </button>
                    </div>
                  ) : (
                    <a href={`${detailsBase}${booking.id}`} target="_blank" rel="noreferrer">
                      Open
                    </a>
                  )}
                  {declining === booking.id ? (
                    <form
                      className="admin-field"
                      onSubmit={(event) => {
                        event.preventDefault();
                        if (!reason.trim()) {
                          setError("Add a short reason before declining.");
                          return;
                        }
                        void act(booking.id, "decline");
                      }}
                    >
                      <input
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        placeholder="Why you can't take this"
                        aria-label="Decline reason"
                      />
                      <button className="admin-btn admin-btn--danger" type="submit" disabled={busy === booking.id}>
                        Decline request
                      </button>
                    </form>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
