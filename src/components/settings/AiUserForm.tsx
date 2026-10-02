"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { COUNTRIES, US_STATES } from "@/lib/constants/locations";
import type { AiUserDraft, AiUserDraftResponse } from "@/lib/settings/ai-users";

export type CreatedAiUser = { id: string; name: string; handle: string };

type AiUserFormProps = {
  onCreated: (user: CreatedAiUser) => void;
  onCancel: () => void;
};

type Field = keyof AiUserDraft;

type DraftResult = AiUserDraftResponse | { error: string };

async function requestDraft(): Promise<DraftResult> {
  try {
    const response = await fetch("/api/settings/ai-users", { credentials: "same-origin", cache: "no-store" });
    const data = (await response.json().catch(() => ({}))) as Partial<AiUserDraftResponse> & { error?: string };
    if (!response.ok || !data.draft) return { error: data.error ?? "Unable to generate an AI user." };
    return { draft: data.draft, latestDateOfBirth: data.latestDateOfBirth ?? "" };
  } catch {
    return { error: "Unable to generate an AI user." };
  }
}

export function AiUserForm({ onCreated, onCancel }: AiUserFormProps) {
  const [draft, setDraft] = useState<AiUserDraft | null>(null);
  const [latestDateOfBirth, setLatestDateOfBirth] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const applyDraft = useCallback((result: DraftResult) => {
    if ("error" in result) {
      setError(result.error);
    } else {
      setDraft(result.draft);
      setLatestDateOfBirth(result.latestDateOfBirth);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    requestDraft().then((result) => {
      if (!cancelled) applyDraft(result);
    });
    return () => {
      cancelled = true;
    };
  }, [applyDraft]);

  function generate() {
    setLoading(true);
    setError("");
    void requestDraft().then(applyDraft);
  }

  function update(field: Field, value: string) {
    setDraft((current) => {
      if (!current) return current;
      if (field === "country") {
        return { ...current, country: value, region: value === "US" ? (current.region ?? "") : null };
      }
      return { ...current, [field]: value };
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/settings/ai-users", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = (await response.json().catch(() => ({}))) as { user?: CreatedAiUser; error?: string };
      if (!response.ok || !data.user) throw new Error(data.error ?? "Unable to create the AI user.");
      onCreated(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create the AI user.");
    } finally {
      setSaving(false);
    }
  }

  const busy = loading || saving;

  return (
    <form className="settings-card settings-ai-form" onSubmit={submit} aria-busy={busy}>
      <div className="settings-ai-form__head">
        <div>
          <h2 className="settings-card__title">New AI user</h2>
          <p className="settings-card__hint">
            Details are generated at random. Edit anything before creating the account.
          </p>
        </div>
        <button type="button" className="btn btn--secondary btn--sm" onClick={generate} disabled={busy}>
          {loading ? "Generating…" : "Generate new"}
        </button>
      </div>

      {error ? (
        <p className="field-error settings-panel__error" role="alert">
          {error}
        </p>
      ) : null}

      {draft ? (
        <div className="settings-ai-form__grid">
          <div className="field">
            <label className="field-label" htmlFor="ai-user-first-name">
              First name
            </label>
            <input
              id="ai-user-first-name"
              className="input"
              value={draft.firstName}
              onChange={(event) => update("firstName", event.target.value)}
              maxLength={50}
              autoComplete="off"
              required
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="ai-user-last-name">
              Last name
            </label>
            <input
              id="ai-user-last-name"
              className="input"
              value={draft.lastName}
              onChange={(event) => update("lastName", event.target.value)}
              maxLength={50}
              autoComplete="off"
              required
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="ai-user-email">
              Email
            </label>
            <input
              id="ai-user-email"
              type="email"
              className="input"
              value={draft.email}
              onChange={(event) => update("email", event.target.value)}
              autoComplete="off"
              spellCheck={false}
              required
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="ai-user-handle">
              Handle
            </label>
            <div className="settings-ai-form__handle">
              <span aria-hidden="true">@</span>
              <input
                id="ai-user-handle"
                className="input"
                value={draft.handle}
                onChange={(event) => update("handle", event.target.value.replace(/^@/, ""))}
                maxLength={24}
                pattern="[a-zA-Z0-9._]+"
                title="Letters, numbers, underscores and periods only"
                autoComplete="off"
                spellCheck={false}
                required
              />
            </div>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="ai-user-dob">
              Date of birth
            </label>
            <input
              id="ai-user-dob"
              type="date"
              className="input"
              value={draft.dateOfBirth}
              onChange={(event) => update("dateOfBirth", event.target.value)}
              max={latestDateOfBirth || undefined}
              min="1900-01-01"
              required
            />
            <p className="field-hint">Must be at least 18 years old today.</p>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="ai-user-country">
              Country
            </label>
            <select
              id="ai-user-country"
              className="select"
              value={draft.country}
              onChange={(event) => update("country", event.target.value)}
              required
            >
              {COUNTRIES.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.label}
                </option>
              ))}
            </select>
          </div>
          {draft.country === "US" ? (
            <div className="field">
              <label className="field-label" htmlFor="ai-user-state">
                State
              </label>
              <select
                id="ai-user-state"
                className="select"
                value={draft.region ?? ""}
                onChange={(event) => update("region", event.target.value)}
                required
              >
                <option value="" disabled>
                  Select a state
                </option>
                {US_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      ) : loading ? (
        <p className="settings-card__hint">Generating details…</p>
      ) : null}

      <div className="settings-ai-form__actions">
        <button type="submit" className="btn btn--primary btn--sm" disabled={busy || !draft}>
          {saving ? "Creating…" : "Create AI user"}
        </button>
        <button type="button" className="btn btn--secondary btn--sm" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
}
