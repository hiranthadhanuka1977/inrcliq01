"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { formatCount } from "@/components/settings/DashboardParts";
import type { FeedSeedStatus } from "@/lib/settings/feed-seed";

const CONFIRM_WORDS = [
  "amber", "anchor", "aspen", "bamboo", "beacon", "breeze", "canyon", "cedar",
  "comet", "coral", "crystal", "delta", "ember", "falcon", "fjord", "garnet",
  "glacier", "harbor", "hazel", "horizon", "indigo", "island", "jasper", "juniper",
  "lagoon", "lantern", "maple", "meadow", "nebula", "oasis", "orchid", "pebble",
  "prairie", "quartz", "raven", "saffron", "sequoia", "summit", "tundra", "velvet",
  "willow", "zephyr",
];

function randomConfirmWord() {
  const [value] = crypto.getRandomValues(new Uint32Array(1));
  return CONFIRM_WORDS[value % CONFIRM_WORDS.length];
}

function posts(count: number) {
  return `${formatCount(count)} ${count === 1 ? "post" : "posts"}`;
}

export function FeedSeedSettings({ initialStatus }: { initialStatus: FeedSeedStatus }) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [confirmWord, setConfirmWord] = useState<string | null>(null);
  const [typedWord, setTypedWord] = useState("");
  const [busy, setBusy] = useState<"delete" | "restore" | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function startDelete() {
    const confirmed = window.confirm(
      `Delete the seed sample? This removes ${posts(status.inFeed)} from the feed. Member posts are kept.`,
    );
    if (!confirmed) return;
    setError("");
    setMessage("");
    setTypedWord("");
    setConfirmWord(randomConfirmWord());
  }

  function cancelDelete() {
    setConfirmWord(null);
    setTypedWord("");
  }

  async function handleDelete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!confirmWord || typedWord.trim() !== confirmWord) return;

    setBusy("delete");
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/settings/feed-seed", {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "delete-seed-sample" }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Unable to delete the seed sample.");
        return;
      }
      setStatus(data.status);
      setConfirmWord(null);
      setTypedWord("");
      setMessage(`Deleted ${posts(data.deleted)} from the seed sample.`);
      router.refresh();
    } catch {
      setError("Unable to delete the seed sample.");
    } finally {
      setBusy(null);
    }
  }

  async function handleRestore() {
    const confirmed = window.confirm(
      `Restore the seed sample? This adds back the ${posts(status.missing)} missing from the feed. Posts already in the feed are left as they are.`,
    );
    if (!confirmed) return;

    setBusy("restore");
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/settings/feed-seed", {
        method: "POST",
        credentials: "same-origin",
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Unable to restore the seed sample.");
        return;
      }
      setStatus(data.status);
      const skipped: string[] = data.skippedNoCreator ?? [];
      setMessage(
        `Restored ${posts(data.restored)}.` +
          (skipped.length ? ` Skipped ${posts(skipped.length)} whose creator no longer exists.` : ""),
      );
      router.refresh();
    } catch {
      setError("Unable to restore the seed sample.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="settings-panel">
      <p className="settings-back">
        <Link href="/settings/feed-mgmt">← Back to Feed Mgmt</Link>
      </p>
      <div className="settings-panel__head">
        <h1 className="settings-panel__title">Seed sample settings</h1>
        <p className="settings-panel__subtitle">
          The seed sample is the {posts(status.seedPosts)} in the seed files. In the feed now:{" "}
          {formatCount(status.inFeed)}. Missing: {formatCount(status.missing)}.
        </p>
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

      <div className="settings-seed-actions">
        <section className="settings-card settings-seed-action settings-seed-action--danger">
          <h2 className="settings-card__title">Delete seed sample</h2>
          <p className="settings-seed-action__text">
            Removes every seed post from the feed ({posts(status.inFeed)}). Member posts, creators and
            accounts are kept, and you can bring the posts back with Restore seed sample.
          </p>

          {confirmWord ? (
            <form className="settings-seed-confirm" onSubmit={handleDelete}>
              <label htmlFor="settings-seed-confirm-word">
                To confirm, type <strong className="settings-seed-confirm__word">{confirmWord}</strong> below.
              </label>
              <input
                id="settings-seed-confirm-word"
                className="input"
                value={typedWord}
                onChange={(event) => setTypedWord(event.target.value)}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                autoFocus
              />
              <div className="settings-seed-confirm__actions">
                <button
                  type="submit"
                  className="btn btn--danger"
                  disabled={busy !== null || typedWord.trim() !== confirmWord}
                >
                  {busy === "delete" ? "Deleting…" : `Delete ${posts(status.inFeed)}`}
                </button>
                <button type="button" className="btn btn--secondary" onClick={cancelDelete} disabled={busy !== null}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              className="btn btn--danger"
              onClick={startDelete}
              disabled={busy !== null || status.inFeed === 0}
            >
              Delete seed sample
            </button>
          )}
        </section>

        <section className="settings-card settings-seed-action">
          <h2 className="settings-card__title">Restore seed sample</h2>
          <p className="settings-seed-action__text">
            Adds back the seed posts that are missing from the feed ({posts(status.missing)}), in their
            original feed order. Posts already in the feed are left as they are, so nothing is duplicated.
          </p>
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleRestore}
            disabled={busy !== null || status.missing === 0}
          >
            {busy === "restore" ? "Restoring…" : "Restore seed sample"}
          </button>
        </section>
      </div>
    </div>
  );
}
