"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import ComposerImageEditor from "@/components/feed/account/ComposerImageEditor";
import CreatePostModal from "@/components/feed/account/CreatePostModal";
import {
  buildProfileCompletion,
  type ProfileCompletionInput,
} from "@/lib/feed/profile-completion";

function CompletionIcon({ id }: { id: "password" | "handle" | "post" | "photo" | "adult" }) {
  if (id === "password") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="5" y="11" width="14" height="9" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
    );
  }
  if (id === "handle") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
      </svg>
    );
  }
  if (id === "post") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
      </svg>
    );
  }
  if (id === "photo") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="9" cy="10" r="1.5" />
        <path d="m21 16-4.5-4.5L7 19" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3 5 6v6c0 4.2 2.8 7.2 7 9 4.2-1.8 7-4.8 7-9V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export default function ProfileCompletionView({
  completion,
  firstName,
  verified,
}: {
  completion: ProfileCompletionInput;
  firstName: string | null;
  verified: boolean;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [postOpen, setPostOpen] = useState(false);
  const [editorSrc, setEditorSrc] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState("");
  const { items, doneCount, total, percent } = buildProfileCompletion(completion);

  function closeAvatarEditor() {
    if (editorSrc?.startsWith("blob:")) URL.revokeObjectURL(editorSrc);
    setEditorSrc(null);
  }

  function handleAvatarFile(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhotoError("Choose an image file.");
      return;
    }
    setPhotoError("");
    setEditorSrc(URL.createObjectURL(file));
    if (fileInputRef.current) fileInputRef.current.value = "";
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
    closeAvatarEditor();
    router.refresh();
  }

  return (
    <main className="main-content account-profile" id="main">
      <div className="account-profile__card">
        <p className="account-profile__eyebrow">Account</p>
        <h1 className="account-profile__name">Profile completion</h1>
        <p className="account-profile__handle">
          {doneCount} of {total} complete · {percent}%
        </p>

        <ul className="account-profile__completion-list">
          {items.map((item) => (
            <li key={item.id} className="account-profile__completion-item">
              <div className="account-profile__completion-item-main">
                <span className="account-profile__completion-icon">
                  <CompletionIcon id={item.id} />
                </span>
                <div className="account-profile__completion-item-copy">
                  <p className="account-profile__completion-item-label">{item.label}</p>
                  <p className="account-profile__completion-item-intro">{item.intro}</p>
                </div>
              </div>
              {item.done ? (
                <span className="account-profile__completion-tick" role="img" aria-label="Done">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M7.5 12.4 10.6 15.5 16.8 8.8" />
                  </svg>
                </span>
              ) : item.href && item.actionLabel ? (
                <Link href={item.href} className="btn btn--secondary btn--sm">
                  {item.actionLabel}
                </Link>
              ) : item.id === "post" && item.actionLabel ? (
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  onClick={() => setPostOpen(true)}
                >
                  {item.actionLabel}
                </button>
              ) : item.id === "photo" && item.actionLabel ? (
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {item.actionLabel}
                </button>
              ) : (
                <span className="account-profile__completion-item-status">Not done</span>
              )}
            </li>
          ))}
        </ul>

        {photoError ? (
          <p className="field-error mt-4" role="alert">
            {photoError}
          </p>
        ) : null}

        <div className="account-profile__actions">
          <Link href="/feed/me" className="btn btn--secondary">
            Back to profile
          </Link>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          onChange={(event) => handleAvatarFile(event.target.files)}
        />
      </div>

      <CreatePostModal
        open={postOpen}
        onClose={() => {
          setPostOpen(false);
          router.refresh();
        }}
        firstName={firstName}
        verified={verified}
      />

      {editorSrc ? (
        <ComposerImageEditor
          src={editorSrc}
          title="Edit profile photo"
          defaultAspectId="1:1"
          onCancel={closeAvatarEditor}
          onSave={saveAvatar}
        />
      ) : null}
    </main>
  );
}
