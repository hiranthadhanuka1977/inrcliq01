"use client";

import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import type {
  SettingsBookingRow,
  SettingsCreatorBookingsGroup,
} from "@/lib/settings/bookings";
import { bookingStatusClass } from "@/lib/feed/booking-status";

type BookingsPanelProps = {
  groups: SettingsCreatorBookingsGroup[];
};

function matchesSearch(group: SettingsCreatorBookingsGroup, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  if (
    group.creatorName.toLowerCase().includes(normalized) ||
    group.creatorHandle.toLowerCase().includes(normalized)
  ) {
    return true;
  }

  return group.bookings.some((booking) => {
    return (
      booking.reference.toLowerCase().includes(normalized) ||
      booking.requestLabel.toLowerCase().includes(normalized) ||
      booking.statusLabel.toLowerCase().includes(normalized) ||
      booking.requesterName.toLowerCase().includes(normalized) ||
      booking.requesterEmail.toLowerCase().includes(normalized)
    );
  });
}

function filterGroupBookings(group: SettingsCreatorBookingsGroup, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return group.bookings;

  const creatorMatch =
    group.creatorName.toLowerCase().includes(normalized) ||
    group.creatorHandle.toLowerCase().includes(normalized);

  if (creatorMatch) return group.bookings;

  return group.bookings.filter((booking) => {
    return (
      booking.reference.toLowerCase().includes(normalized) ||
      booking.requestLabel.toLowerCase().includes(normalized) ||
      booking.statusLabel.toLowerCase().includes(normalized) ||
      booking.requesterName.toLowerCase().includes(normalized) ||
      booking.requesterEmail.toLowerCase().includes(normalized)
    );
  });
}

export function BookingsPanel({ groups: initialGroups }: BookingsPanelProps) {
  const router = useRouter();
  const [groups, setGroups] = useState(initialGroups);
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const filteredGroups = useMemo(() => {
    return groups
      .filter((group) => matchesSearch(group, searchQuery))
      .map((group) => ({
        ...group,
        bookings: filterGroupBookings(group, searchQuery),
      }))
      .filter((group) => group.bookings.length > 0);
  }, [groups, searchQuery]);

  async function handleDelete(booking: SettingsBookingRow) {
    const confirmed = window.confirm(
      `Delete booking ${booking.reference} (${booking.requestLabel})? This cannot be undone.`,
    );
    if (!confirmed) return;

    setPendingId(booking.id);
    setError("");

    try {
      const response = await fetch(`/api/settings/bookings/${booking.id}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(data?.error ?? "Unable to delete booking.");
        setPendingId(null);
        return;
      }

      setGroups((current) =>
        current
          .map((group) => {
            const bookings = group.bookings.filter((entry) => entry.id !== booking.id);
            return {
              ...group,
              bookings,
              bookingCount: bookings.length,
            };
          })
          .filter((group) => group.bookings.length > 0),
      );
      setPendingId(null);
      router.refresh();
    } catch {
      setError("Unable to delete booking.");
      setPendingId(null);
    }
  }

  return (
    <div className="settings-panel">
      <div className="settings-panel__head">
        <h1 className="settings-panel__title">Bookings</h1>
        <p className="settings-panel__subtitle">
          Special requests grouped by creator, from received through delivery.
        </p>
      </div>

      {error ? (
        <p className="field-error settings-panel__error" role="alert">
          {error}
        </p>
      ) : null}

      {groups.length > 0 ? (
        <div className="settings-search">
          <label className="sr-only" htmlFor="settings-bookings-search">
            Search bookings
          </label>
          <input
            type="search"
            id="settings-bookings-search"
            className="input settings-search__input"
            placeholder="Search by creator, reference, or requester"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            autoComplete="off"
          />
        </div>
      ) : null}

      {groups.length === 0 ? (
        <p className="settings-empty">No bookings yet. Completed request payments will show up here.</p>
      ) : filteredGroups.length === 0 ? (
        <p className="settings-empty">No bookings match your search.</p>
      ) : (
        <div className="settings-bookings">
          {filteredGroups.map((group) => (
            <section key={group.creatorId} className="settings-bookings__group">
              <header className="settings-bookings__creator">
                <span
                  className="settings-bookings__avatar"
                  style={{ "--avatar-accent": group.avatarColor } as CSSProperties}
                  aria-hidden="true"
                >
                  {group.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={group.avatarUrl} alt="" width={40} height={40} />
                  ) : (
                    group.avatarInitials
                  )}
                </span>
                <div className="settings-bookings__creator-copy">
                  <h2>{group.creatorName}</h2>
                  <p>
                    {group.creatorHandle}
                    <span aria-hidden="true"> · </span>
                    {group.bookings.length} booking{group.bookings.length === 1 ? "" : "s"}
                  </p>
                </div>
              </header>

              <div className="settings-table-wrap">
                <table className="settings-table">
                  <thead>
                    <tr>
                      <th scope="col">Reference</th>
                      <th scope="col">Request</th>
                      <th scope="col">Requester</th>
                      <th scope="col">Status</th>
                      <th scope="col">Total</th>
                      <th scope="col">Created</th>
                      <th scope="col">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.bookings.map((booking) => (
                      <tr key={booking.id}>
                        <td>
                          <code className="settings-bookings__ref">{booking.reference}</code>
                        </td>
                        <td>
                          <div className="settings-bookings__request">
                            <strong>{booking.requestLabel}</strong>
                            {booking.contentType ? <span>{booking.contentType}</span> : null}
                          </div>
                        </td>
                        <td>
                          <div className="settings-bookings__request">
                            <strong>{booking.requesterName}</strong>
                            <span>{booking.requesterEmail}</span>
                          </div>
                        </td>
                        <td>
                          <span className={bookingStatusClass(booking.status)}>
                            {booking.statusLabel}
                          </span>
                        </td>
                        <td>{booking.totalLabel}</td>
                        <td>{booking.createdLabel}</td>
                        <td className="settings-table__actions">
                          <div className="settings-table__action-row">
                            <Link
                              href={`/settings/bookings/${booking.id}`}
                              className="btn btn--secondary btn--sm"
                            >
                              View
                            </Link>
                            <button
                              type="button"
                              className="btn btn--secondary btn--sm"
                              onClick={() => handleDelete(booking)}
                              disabled={pendingId === booking.id}
                            >
                              {pendingId === booking.id ? "Deleting…" : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
