"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { SettingsUserRow, SettingsUsersGroup } from "@/lib/settings/users";

type UsersTableProps = {
  users: SettingsUserRow[];
  group: SettingsUsersGroup;
  pills: ReactNode;
};

const GROUP_COPY: Record<SettingsUsersGroup, { subtitle: string; empty: string }> = {
  members: {
    subtitle: "Accounts people registered on the platform.",
    empty: "No users registered yet.",
  },
  demo: {
    subtitle: "Seeded accounts created for demo feed creators.",
    empty: "There are no demo users.",
  },
};

function matchesSearch(user: SettingsUserRow, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  return (
    user.name.toLowerCase().includes(normalized) ||
    user.email.toLowerCase().includes(normalized) ||
    Boolean(user.handle?.toLowerCase().includes(normalized))
  );
}

export function UsersTable({ users: initialUsers, group, pills }: UsersTableProps) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const filteredUsers = useMemo(
    () => users.filter((user) => matchesSearch(user, searchQuery)),
    [users, searchQuery],
  );

  async function handleRemove(user: SettingsUserRow) {
    const confirmed = window.confirm(
      `Remove ${user.name} (${user.email})? This cannot be undone.`,
    );
    if (!confirmed) return;

    setPendingId(user.id);
    setError("");

    try {
      const response = await fetch(`/api/settings/users/${user.id}`, { method: "DELETE" });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Unable to remove user.");
        setPendingId(null);
        return;
      }

      setUsers((current) => current.filter((entry) => entry.id !== user.id));
      setPendingId(null);
      router.refresh();
    } catch {
      setError("Unable to remove user.");
      setPendingId(null);
    }
  }

  return (
    <div className="settings-panel">
      <div className="settings-panel__head">
        <h1 className="settings-panel__title">Users</h1>
        <p className="settings-panel__subtitle">{GROUP_COPY[group].subtitle}</p>
      </div>

      {pills}

      {error ? (
        <p className="field-error settings-panel__error" role="alert">
          {error}
        </p>
      ) : null}

      {users.length > 0 ? (
        <div className="settings-search">
          <label className="sr-only" htmlFor="settings-users-search">
            Search users
          </label>
          <input
            type="search"
            id="settings-users-search"
            className="input settings-search__input"
            placeholder="Search by name, handle or email"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            autoComplete="off"
          />
        </div>
      ) : null}

      {users.length === 0 ? (
        <p className="settings-empty">{GROUP_COPY[group].empty}</p>
      ) : filteredUsers.length === 0 ? (
        <p className="settings-empty">No users match your search.</p>
      ) : (
        <div className="settings-table-wrap">
          <table className="settings-table settings-table--users">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Handle</th>
                <th scope="col">Email</th>
                <th scope="col">Type</th>
                <th scope="col" className="settings-table__number">
                  Feed posts
                </th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    <Link href={`/settings/users/${user.id}`}>
                      {user.name !== "—" ? user.name : "Unnamed user"}
                    </Link>
                  </td>
                  <td className={`settings-table__wrap${user.handle ? "" : " settings-table__muted"}`}>
                    {user.handle ?? "—"}
                  </td>
                  <td className="settings-table__wrap">{user.email}</td>
                  <td>{user.typeLabel}</td>
                  <td className="settings-table__number">{user.postCount}</td>
                  <td className="settings-table__actions">
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      onClick={() => handleRemove(user)}
                      disabled={pendingId === user.id}
                    >
                      {pendingId === user.id ? "Removing…" : "Remove"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
