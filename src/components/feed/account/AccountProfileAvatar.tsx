"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import ComposerImageEditor from "@/components/feed/account/ComposerImageEditor";

export default function AccountProfileAvatar({
  avatarUrl: initialAvatarUrl,
  avatarColor,
  avatarInitial,
  size = "md",
}: {
  avatarUrl: string | null;
  avatarColor: string | null;
  avatarInitial: string;
  size?: "md" | "sm";
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [editorSrc, setEditorSrc] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState("");

  useEffect(() => {
    setAvatarUrl(initialAvatarUrl);
  }, [initialAvatarUrl]);

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
    if (editorSrc?.startsWith("blob:")) URL.revokeObjectURL(editorSrc);
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

  const small = size === "sm";

  return (
    <div className="account-profile__avatar-column">
      <div
        className={`account-profile__avatar-wrap${small ? " account-profile__avatar-wrap--sm" : ""}`}
      >
        <span
          className={`account-profile__avatar${small ? " account-profile__avatar--sm" : ""}`}
          style={
            avatarColor ? ({ "--story-color": avatarColor } as CSSProperties) : undefined
          }
          aria-hidden="true"
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" width={small ? 52 : 72} height={small ? 52 : 72} />
          ) : (
            avatarInitial
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
            <path d="M12 20h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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
      {avatarError ? (
        <p className="account-profile__avatar-error" role="alert">
          {avatarError}
        </p>
      ) : null}
      {editorSrc ? (
        <ComposerImageEditor
          src={editorSrc}
          title="Edit profile photo"
          defaultAspectId="1:1"
          onCancel={closeAvatarEditor}
          onSave={saveAvatar}
        />
      ) : null}
    </div>
  );
}
