"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { formatCount } from "@/components/settings/DashboardParts";
import type { DemoUsersRestoreResult, DemoUsersStatus } from "@/lib/settings/demo-users";
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

function accounts(count: number) {
  return `${formatCount(count)} demo ${count === 1 ? "account" : "accounts"}`;
}

type SeedCounts = { present: number; missing: number };

type SeedSectionProps<Status, Restored> = {
  id: string;
  title: string;
  summary: (status: Status) => ReactNode;
  endpoint: string;
  deleteToken: string;
  initialStatus: Status;
  counts: (status: Status) => SeedCounts;
  noun: (count: number) => string;
  deleteTitle: string;
  deleteText: (status: Status) => ReactNode;
  deleteConfirm: (status: Status) => string;
  restoreTitle: string;
  restoreText: (status: Status) => ReactNode;
  restoreConfirm: (status: Status) => string;
  restoredMessage: (result: Restored) => string;
};

function SeedSection<Status, Restored>({
  id,
  title,
  summary,
  endpoint,
  deleteToken,
  initialStatus,
  counts,
  noun,
  deleteTitle,
  deleteText,
  deleteConfirm,
  restoreTitle,
  restoreText,
  restoreConfirm,
  restoredMessage,
}: SeedSectionProps<Status, Restored>) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [confirmWord, setConfirmWord] = useState<string | null>(null);
  const [typedWord, setTypedWord] = useState("");
  const [busy, setBusy] = useState<"delete" | "restore" | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const { present, missing } = counts(status);
  const inputId = `settings-seed-confirm-${id}`;
  const lowerTitle = deleteTitle.replace(/^Delete /, "");

  function startDelete() {
    if (!window.confirm(deleteConfirm(status))) return;
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
      const response = await fetch(endpoint, {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: deleteToken }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? `Unable to delete the ${lowerTitle}.`);
        return;
      }
      setStatus(data.status);
      setConfirmWord(null);
      setTypedWord("");
      setMessage(`Deleted ${noun(data.deleted)}.`);
      router.refresh();
    } catch {
      setError(`Unable to delete the ${lowerTitle}.`);
    } finally {
      setBusy(null);
    }
  }

  async function handleRestore() {
    if (!window.confirm(restoreConfirm(status))) return;

    setBusy("restore");
    setError("");
    setMessage("");
    try {
      const response = await fetch(endpoint, { method: "POST", credentials: "same-origin" });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? `Unable to restore the ${lowerTitle}.`);
        return;
      }
      setStatus(data.status);
      setMessage(restoredMessage(data));
      router.refresh();
    } catch {
      setError(`Unable to restore the ${lowerTitle}.`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="settings-seed-section" aria-labelledby={`settings-seed-${id}`}>
      <div className="settings-seed-section__head">
        <h2 id={`settings-seed-${id}`} className="settings-seed-section__title">
          {title}
        </h2>
        <p className="settings-panel__subtitle">{summary(status)}</p>
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
          <h3 className="settings-card__title">{deleteTitle}</h3>
          <p className="settings-seed-action__text">{deleteText(status)}</p>

          {confirmWord ? (
            <form className="settings-seed-confirm" onSubmit={handleDelete}>
              <label htmlFor={inputId}>
                To confirm, type <strong className="settings-seed-confirm__word">{confirmWord}</strong> below.
              </label>
              <input
                id={inputId}
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
                  {busy === "delete" ? "Deleting…" : `Delete ${noun(present)}`}
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
              disabled={busy !== null || present === 0}
            >
              {deleteTitle}
            </button>
          )}
        </section>

        <section className="settings-card settings-seed-action">
          <h3 className="settings-card__title">{restoreTitle}</h3>
          <p className="settings-seed-action__text">{restoreText(status)}</p>
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleRestore}
            disabled={busy !== null || missing === 0}
          >
            {busy === "restore" ? "Restoring…" : restoreTitle}
          </button>
        </section>
      </div>
    </section>
  );
}

export function FeedSeedSettings({
  initialStatus,
  initialDemoUsers,
}: {
  initialStatus: FeedSeedStatus;
  initialDemoUsers: DemoUsersStatus;
}) {
  return (
    <div className="settings-panel">
      <p className="settings-back">
        <Link href="/settings/feed-mgmt">← Back to Feed Mgmt</Link>
      </p>
      <div className="settings-panel__head">
        <h1 className="settings-panel__title">Seed sample settings</h1>
        <p className="settings-panel__subtitle">
          Delete or restore the sample content from the seed files: feed posts and demo accounts.
        </p>
      </div>

      <SeedSection<FeedSeedStatus, { restored: number; skippedNoCreator?: string[] }>
        id="posts"
        title="Feed posts"
        summary={(status) =>
          `The seed files hold ${posts(status.seedPosts)}. In the feed now: ${formatCount(status.inFeed)}. Missing: ${formatCount(status.missing)}.`
        }
        endpoint="/api/settings/feed-seed"
        deleteToken="delete-seed-sample"
        initialStatus={initialStatus}
        counts={(status) => ({ present: status.inFeed, missing: status.missing })}
        noun={posts}
        deleteTitle="Delete seed sample"
        deleteText={(status) =>
          `Removes every seed post from the feed (${posts(status.inFeed)}). Member posts, creators and accounts are kept, and you can bring the posts back with Restore seed sample.`
        }
        deleteConfirm={(status) =>
          `Delete the seed sample? This removes ${posts(status.inFeed)} from the feed. Member posts are kept.`
        }
        restoreTitle="Restore seed sample"
        restoreText={(status) =>
          `Adds back the seed posts that are missing from the feed (${posts(status.missing)}), in their original feed order. Posts already in the feed are left as they are, so nothing is duplicated.`
        }
        restoreConfirm={(status) =>
          `Restore the seed sample? This adds back the ${posts(status.missing)} missing from the feed. Posts already in the feed are left as they are.`
        }
        restoredMessage={(result) => {
          const skipped = result.skippedNoCreator ?? [];
          return (
            `Restored ${posts(result.restored)}.` +
            (skipped.length ? ` Skipped ${posts(skipped.length)} whose creator no longer exists.` : "")
          );
        }}
      />

      <SeedSection<DemoUsersStatus, DemoUsersRestoreResult>
        id="demo-users"
        title="Demo users"
        summary={(status) =>
          `The demo users file holds ${accounts(status.seedUsers)}, such as the Anderson family. On the site now: ${formatCount(status.present)}. Missing: ${formatCount(status.missing)}.`
        }
        endpoint="/api/settings/demo-users"
        deleteToken="delete-demo-users"
        initialStatus={initialDemoUsers}
        counts={(status) => status}
        noun={accounts}
        deleteTitle="Delete demo users"
        deleteText={(status) =>
          `Removes ${accounts(status.present)} the same way as removing a user: their profiles, family links, chats, follows, subscriptions and posts go too. Their creator identities are kept. Restore demo users brings back the accounts, profiles and family links, but not chats, follows or subscriptions.`
        }
        deleteConfirm={(status) =>
          `Delete ${accounts(status.present)}? Their chats, follows, subscriptions and posts are removed permanently and are not restored.`
        }
        restoreTitle="Restore demo users"
        restoreText={(status) =>
          `Recreates the missing accounts (${accounts(status.missing)}) with the same IDs, handles and age zones, plus their profiles and parent-child links. Restored accounts have no password: they sign in with an email login code.`
        }
        restoreConfirm={(status) =>
          `Restore ${accounts(status.missing)}? Accounts that already exist are left as they are.`
        }
        restoredMessage={(result) =>
          `Restored ${accounts(result.restored)} and ${formatCount(result.linksRestored)} family ${result.linksRestored === 1 ? "link" : "links"}.` +
          (result.skipped.length ? ` Skipped: ${result.skipped.join("; ")}.` : "")
        }
      />
    </div>
  );
}
