"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { formatCount } from "@/components/settings/DashboardParts";
import type { SettingsPartner } from "@/lib/settings/partners";

type NewKey = { partnerName: string; key: string };

function formatDate(value: string | null) {
  if (!value) return "Never";
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function send(url: string, method: "POST" | "DELETE", body?: unknown) {
  const response = await fetch(url, {
    method,
    credentials: "same-origin",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await response.json().catch(() => ({}))) as { error?: string; key?: string };
  if (!response.ok) throw new Error(data.error ?? "Something went wrong.");
  return data;
}

function PartnerCard({
  partner,
  busy,
  run,
  onKey,
}: {
  partner: SettingsPartner;
  busy: boolean;
  run: (action: () => Promise<unknown>, success: string) => Promise<boolean>;
  onKey: (key: NewKey) => void;
}) {
  const [handle, setHandle] = useState("");
  const base = `/api/settings/partners/${partner.id}`;
  const activeKeys = partner.keys.filter((key) => !key.revokedAt).length;

  async function linkCreator(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = handle.trim();
    if (!value) return;
    const linked = await run(() => send(`${base}/creators`, "POST", { handle: value }), `Linked ${value} to ${partner.name}.`);
    if (linked) setHandle("");
  }

  async function issueKey() {
    await run(async () => {
      const data = await send(`${base}/keys`, "POST");
      if (data.key) onKey({ partnerName: partner.name, key: data.key });
    }, `Created a new key for ${partner.name}.`);
  }

  function revokeKey(keyId: string, prefix: string) {
    if (!window.confirm(`Revoke key ${prefix}…? Requests using it will be rejected straight away.`)) return;
    void run(() => send(`${base}/keys/${keyId}`, "DELETE"), `Revoked key ${prefix}….`);
  }

  function unlinkCreator(creatorId: string, creatorHandle: string) {
    if (!window.confirm(`Stop ${partner.name} from posting as ${creatorHandle}? Posts already published stay in the feed.`)) return;
    void run(() => send(`${base}/creators/${creatorId}`, "DELETE"), `Unlinked ${creatorHandle}.`);
  }

  function deletePartner() {
    if (
      !window.confirm(
        `Delete ${partner.name}? Its keys stop working and its creator links are removed. The ${formatCount(partner.postsCount)} posts it published stay in the feed.`,
      )
    )
      return;
    void run(() => send(base, "DELETE"), `Deleted ${partner.name}.`);
  }

  return (
    <section className="settings-card settings-partner">
      <div className="settings-partner__head">
        <div>
          <h2 className="settings-card__title settings-partner__name">{partner.name}</h2>
          <p className="settings-partner__meta">
            {formatCount(partner.postsCount)} {partner.postsCount === 1 ? "post" : "posts"} published ·{" "}
            {activeKeys} active {activeKeys === 1 ? "key" : "keys"} · added {formatDate(partner.createdAt)}
          </p>
        </div>
        <button type="button" className="btn btn--secondary btn--sm" onClick={deletePartner} disabled={busy}>
          Delete partner
        </button>
      </div>

      <h3 className="settings-partner__section-title">Can post as</h3>
      {partner.creators.length ? (
        <ul className="settings-partner__creators">
          {partner.creators.map((creator) => (
            <li key={creator.id} className="settings-partner__creator">
              <span>
                <strong>{creator.name}</strong> {creator.handle}
                {creator.verified ? <span className="settings-partner__badge">Verified</span> : null}
              </span>
              <button
                type="button"
                className="settings-partner__remove"
                onClick={() => unlinkCreator(creator.id, creator.handle)}
                disabled={busy}
                aria-label={`Unlink ${creator.handle}`}
                title={`Unlink ${creator.handle}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="settings-partner__empty">No creators yet. This partner can&apos;t post until you link one.</p>
      )}
      <form className="settings-partner__inline-form" onSubmit={linkCreator}>
        <input
          className="input"
          value={handle}
          onChange={(event) => setHandle(event.target.value)}
          placeholder="@creatorhandle"
          aria-label={`Creator handle to link to ${partner.name}`}
          autoComplete="off"
          spellCheck={false}
        />
        <button type="submit" className="btn btn--secondary btn--sm" disabled={busy || !handle.trim()}>
          Link creator
        </button>
      </form>

      <div className="settings-partner__keys-head">
        <h3 className="settings-partner__section-title">API keys</h3>
        <button type="button" className="btn btn--secondary btn--sm" onClick={issueKey} disabled={busy}>
          New key
        </button>
      </div>
      {partner.keys.length ? (
        <div className="settings-table-wrap">
          <table className="settings-table">
            <thead>
              <tr>
                <th>Key</th>
                <th>Created</th>
                <th>Last used</th>
                <th>Status</th>
                <th className="settings-table__actions" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {partner.keys.map((key) => (
                <tr key={key.id}>
                  <td>
                    <code>{key.prefix}…</code>
                  </td>
                  <td className="settings-table__nowrap">{formatDate(key.createdAt)}</td>
                  <td className="settings-table__nowrap">{formatDate(key.lastUsedAt)}</td>
                  <td>
                    {key.revokedAt ? (
                      <span className="settings-partner__status">Revoked {formatDate(key.revokedAt)}</span>
                    ) : (
                      <span className="settings-partner__status settings-partner__status--active">Active</span>
                    )}
                  </td>
                  <td className="settings-table__actions">
                    {key.revokedAt ? null : (
                      <button
                        type="button"
                        className="btn btn--danger btn--xs"
                        onClick={() => revokeKey(key.id, key.prefix)}
                        disabled={busy}
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="settings-partner__empty">No keys yet.</p>
      )}
    </section>
  );
}

export function PartnersSettings({ partners }: { partners: SettingsPartner[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [newKey, setNewKey] = useState<NewKey | null>(null);
  const [copied, setCopied] = useState(false);

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
      setMessage(success);
      router.refresh();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  function showKey(key: NewKey) {
    setCopied(false);
    setNewKey(key);
  }

  async function addPartner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = name.trim();
    if (!value) return;
    const added = await run(async () => {
      const data = await send("/api/settings/partners", "POST", { name: value });
      if (data.key) showKey({ partnerName: value, key: data.key });
    }, `Added ${value}. Link at least one creator before sharing the key.`);
    if (added) setName("");
  }

  async function copyKey() {
    if (!newKey) return;
    try {
      await navigator.clipboard.writeText(newKey.key);
      setCopied(true);
    } catch {
      setError("Couldn't copy automatically. Select the key and copy it manually.");
    }
  }

  return (
    <div className="settings-panel">
      <div className="settings-panel__head settings-panel__head--with-action">
        <div>
          <h1 className="settings-panel__title">Partners</h1>
          <p className="settings-panel__subtitle">
            External parties that publish posts to the feed with <code>POST /api/v1/partner/feed/posts</code>. Each
            partner can only post as the creators linked to it.
          </p>
        </div>
        <Link href="/settings/partners/guide" className="settings-guide-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z" />
            <path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z" />
          </svg>
          Integration Guide
        </Link>
      </div>

      {error ? (
        <p className="field-error settings-panel__error" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="settings-message" role="status">
          {message}
        </p>
      ) : null}

      {newKey ? (
        <div className="settings-partner-key" role="status">
          <p className="settings-partner-key__title">New API key for {newKey.partnerName}</p>
          <p className="settings-partner-key__hint">
            Copy it now and send it to the partner securely. It won&apos;t be shown again.
          </p>
          <div className="settings-partner-key__row">
            <code className="settings-partner-key__value">{newKey.key}</code>
            <button type="button" className="btn btn--primary btn--sm" onClick={copyKey}>
              {copied ? "Copied" : "Copy"}
            </button>
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => setNewKey(null)}>
              Done
            </button>
          </div>
        </div>
      ) : null}

      <form className="settings-partner__inline-form settings-partner__add" onSubmit={addPartner}>
        <input
          className="input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Partner name, e.g. Acme Media"
          aria-label="New partner name"
          maxLength={80}
          autoComplete="off"
        />
        <button type="submit" className="btn btn--primary" disabled={busy || !name.trim()}>
          Add partner
        </button>
      </form>

      {partners.length ? (
        <div className="settings-partners">
          {partners.map((partner) => (
            <PartnerCard key={partner.id} partner={partner} busy={busy} run={run} onKey={showKey} />
          ))}
        </div>
      ) : (
        <p className="settings-partner__empty">No partners yet. Add one to issue an API key.</p>
      )}
    </div>
  );
}
