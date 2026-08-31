"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import FollowButton from "@/components/feed/FollowButton";
import ComposerImageEditor from "@/components/feed/account/ComposerImageEditor";
import FirstPostPromptCard from "@/components/feed/account/FirstPostPromptCard";
import SetHandleModal from "@/components/feed/account/SetHandleModal";
import SetHandlePrompt from "@/components/feed/account/SetHandlePrompt";
import ShareOnSocialPrompt from "@/components/feed/account/ShareOnSocialPrompt";
import ProtectionTierIcon from "@/components/guardian/ProtectionTierIcon";
import type {
  AccountProfile,
  AccountSocialPerson,
  AccountSocialTab,
} from "@/lib/feed/account-profile";

function formatCount(value: number) {
  return value.toLocaleString();
}

function PersonRow({
  person,
  showUnfollow,
  onUnfollowed,
}: {
  person: AccountSocialPerson;
  showUnfollow?: boolean;
  onUnfollowed?: (id: string) => void;
}) {
  const [following, setFollowing] = useState(true);

  const avatar = (
    <span
      className="account-profile__person-avatar"
      style={{ "--story-color": person.avatarColor } as CSSProperties}
      aria-hidden="true"
    >
      {person.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={person.avatarUrl} alt="" width={40} height={40} />
      ) : (
        person.avatarInitials
      )}
    </span>
  );

  const body = (
    <>
      {avatar}
      <span className="account-profile__person-copy">
        <span className="account-profile__person-name">
          {person.name}
          {person.verified ? (
            <svg
              className="account-profile__person-verified"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-label="Verified"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          ) : null}
        </span>
        <span className="account-profile__person-handle">{person.handle}</span>
        {person.meta ? <span className="account-profile__person-meta">{person.meta}</span> : null}
      </span>
    </>
  );

  return (
    <div className="account-profile__person account-profile__person--row">
      {person.href ? (
        <Link href={person.href} className="account-profile__person-main">
          {body}
        </Link>
      ) : (
        <div className="account-profile__person-main">{body}</div>
      )}
      {showUnfollow && person.slug ? (
        <FollowButton
          following={following}
          creatorSlug={person.slug}
          name={person.name}
          className="btn btn--sm btn--secondary"
          onFollowingChange={(next) => {
            setFollowing(next);
            if (!next) onUnfollowed?.(person.id);
          }}
        />
      ) : null}
    </div>
  );
}

const TAB_COPY: Record<
  AccountSocialTab,
  { title: string; empty: string }
> = {
  followers: {
    title: "Followers",
    empty: "When people follow you, they’ll show up here.",
  },
  following: {
    title: "Following",
    empty: "Follow creators from the feed or their profile — they’ll show up here.",
  },
  subscriptions: {
    title: "Subscriptions",
    empty: "Subscribe to a creator from their profile to see them here.",
  },
};

export default function AccountProfileView({
  profile,
  initialTab = "subscriptions",
}: {
  profile: AccountProfile;
  initialTab?: AccountSocialTab;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<AccountSocialTab>(initialTab);
  const [followingPeople, setFollowingPeople] = useState(profile.social.following);
  const [followingCount, setFollowingCount] = useState(profile.social.followingCount);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [editorSrc, setEditorSrc] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState("");
  const [currentHandle, setCurrentHandle] = useState(profile.handle);
  const [handleModalOpen, setHandleModalOpen] = useState(false);

  useEffect(() => {
    setCurrentHandle(profile.handle);
  }, [profile.handle]);

  const hasHandle = Boolean(currentHandle?.trim());

  function openHandleModal() {
    setHandleModalOpen(true);
  }

  function handleSaved(handle: string) {
    setCurrentHandle(handle);
    router.refresh();
  }

  useEffect(() => {
    setAvatarUrl(profile.avatarUrl);
  }, [profile.avatarUrl]);

  const people = useMemo(() => {
    if (tab === "followers") return profile.social.followers;
    if (tab === "following") return followingPeople;
    return profile.social.subscriptions;
  }, [followingPeople, profile.social.followers, profile.social.subscriptions, tab]);

  const counts = {
    followers: profile.social.followersCount,
    following: followingCount,
    subscriptions: profile.social.subscriptionsCount,
  };

  function openAvatarPicker() {
    setAvatarError("");
    fileInputRef.current?.click();
  }

  function handleAvatarFile(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setAvatarError("Choose an image file.");
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setEditorSrc(objectUrl);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function closeAvatarEditor() {
    if (editorSrc?.startsWith("blob:")) {
      URL.revokeObjectURL(editorSrc);
    }
    setEditorSrc(null);
  }

  async function saveAvatar(file: File) {
    const body = new FormData();
    body.append("file", file);
    const response = await fetch("/api/feed/me/avatar", { method: "POST", body });
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      avatarUrl?: string;
    };
    if (!response.ok || !data.avatarUrl) {
      throw new Error(data.error ?? "Unable to update profile photo.");
    }
    setAvatarUrl(data.avatarUrl);
    closeAvatarEditor();
    router.refresh();
  }

  return (
    <main className="main-content account-profile" id="main">
      <div className="account-profile__card">
        <div className="account-profile__hero">
          <div className="account-profile__avatar-wrap">
            <span
              className="account-profile__avatar"
              style={
                profile.avatarColor
                  ? ({ "--story-color": profile.avatarColor } as CSSProperties)
                  : undefined
              }
              aria-hidden="true"
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" width={72} height={72} />
              ) : (
                profile.avatarInitial
              )}
            </span>
            <button
              type="button"
              className="account-profile__avatar-edit"
              aria-label="Edit profile photo"
              title="Edit profile photo"
              onClick={openAvatarPicker}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 20h9"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <path
                  d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              onChange={(event) => handleAvatarFile(event.target.files)}
            />
          </div>
          <div className="account-profile__hero-copy">
            <h1 className="account-profile__name">
              {profile.fullName}
              {profile.verified ? (
                <svg
                  className="account-profile__verified-star"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-label="Verified creator"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              ) : null}
              {profile.accountType === "GUARDIAN" ? (
                <Link
                  href="/family-circle"
                  className="account-profile__family-center-icon"
                  aria-label="Family Circle"
                  title="Family Circle"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <circle cx="12" cy="11" r="2.5" />
                    <path d="M8.5 15.5c.9 1.2 2.2 2 3.5 2s2.6-.8 3.5-2" />
                  </svg>
                </Link>
              ) : null}
            </h1>
            <div className="account-profile__handle-row">
              <p className="account-profile__handle">
                {hasHandle ? `@${currentHandle}` : "No handle set"}
              </p>
              {!hasHandle ? (
                <>
                  <span className="account-profile__handle-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="4" />
                      <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
                    </svg>
                  </span>
                  <button
                    type="button"
                    className="btn btn--sm btn--secondary account-profile__handle-set"
                    onClick={openHandleModal}
                  >
                    Set now
                  </button>
                </>
              ) : null}
            </div>
            <div className="account-profile__chips">
              <span className="account-profile__chip">{profile.accountTypeLabel}</span>
              {profile.verified ? (
                <span className="account-profile__chip account-profile__chip--verified">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  Verified
                </span>
              ) : null}
              <span className="account-profile__chip account-profile__chip--privacy">
                <ProtectionTierIcon tier={profile.privacyTier} />
                Privacy: {profile.privacyTierLabel}
              </span>
            </div>
            {profile.guardian ? (
              <div className="account-profile__guardian">
                <span className="account-profile__guardian-icon" aria-label="Guardian" title="Guardian">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <circle cx="12" cy="11" r="2.5" />
                    <path d="M8.5 15.5c.9 1.2 2.2 2 3.5 2s2.6-.8 3.5-2" />
                  </svg>
                </span>
                <div className="account-profile__guardian-main">
                  <span className="account-profile__guardian-name">{profile.guardian.fullName}</span>
                  <span className="account-profile__guardian-handle">{profile.guardian.handleLabel}</span>
                </div>
                <Link
                  href={profile.guardian.messagesHref}
                  className="account-profile__guardian-message"
                  aria-label={`Message ${profile.guardian.fullName}`}
                  title={`Message ${profile.guardian.fullName}`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </Link>
              </div>
            ) : null}
            {avatarError ? (
              <p className="account-profile__avatar-error" role="alert">
                {avatarError}
              </p>
            ) : null}
          </div>
          <div className="account-profile__hero-actions">
            <Link
              href="/feed/me/edit"
              className="account-profile__edit"
              aria-label="Edit profile"
              title="Edit profile"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
              </svg>
            </Link>
          </div>
        </div>

        {!hasHandle ? (
          <SetHandlePrompt
            firstName={profile.firstName}
            dismissKey={profile.id}
            onSetHandle={openHandleModal}
          />
        ) : profile.postCount === 0 ? (
          <FirstPostPromptCard
            firstName={profile.firstName}
            dismissKey={profile.id}
            verified={profile.verified}
          />
        ) : (
          <ShareOnSocialPrompt
            firstName={profile.firstName}
            handle={currentHandle}
            profileHref={profile.profileHref}
            dismissKey={profile.id}
          />
        )}

        <div className="account-profile__stats" role="tablist" aria-label="Your network">
          {(
            [
              ["followers", "Followers", counts.followers],
              ["following", "Following", counts.following],
              ["subscriptions", "Subscriptions", counts.subscriptions],
            ] as const
          ).map(([id, label, count]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={`account-profile__stat${tab === id ? " is-active" : ""}`}
              onClick={() => setTab(id)}
            >
              <strong className="account-profile__stat-count">{formatCount(count)}</strong>
              <span className="account-profile__stat-label">{label}</span>
            </button>
          ))}
        </div>

        <section
          className="account-profile__section account-profile__section--social"
          aria-labelledby="account-profile-social"
        >
          <h2 id="account-profile-social" className="account-profile__section-title">
            {TAB_COPY[tab].title}
          </h2>
          {people.length === 0 ? (
            <p className="account-profile__empty">{TAB_COPY[tab].empty}</p>
          ) : (
            <ul className="account-profile__people">
              {people.map((person) => (
                <li key={person.id}>
                  <PersonRow
                    person={person}
                    showUnfollow={tab === "following"}
                    onUnfollowed={(id) => {
                      setFollowingPeople((current) => current.filter((item) => item.id !== id));
                      setFollowingCount((count) => Math.max(0, count - 1));
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="account-profile__actions">
          <Link href="/feed" className="btn btn--secondary">
            Back to feed
          </Link>
        </div>
      </div>

      {editorSrc ? (
        <ComposerImageEditor
          src={editorSrc}
          title="Edit profile photo"
          defaultAspectId="1:1"
          onCancel={closeAvatarEditor}
          onSave={saveAvatar}
        />
      ) : null}

      <SetHandleModal
        open={handleModalOpen}
        onClose={() => setHandleModalOpen(false)}
        firstName={profile.firstName}
        lastName={profile.lastName}
        onSaved={handleSaved}
      />
    </main>
  );
}
