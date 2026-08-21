"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ComposerImageEditor from "@/components/feed/account/ComposerImageEditor";

type SellerPublicProfileCustomiseViewProps = {
  displayName: string;
  slug: string;
  coverUrl: string | null;
};

export function SellerPublicProfileCustomiseView({
  displayName,
  slug,
  coverUrl: initialCoverUrl,
}: SellerPublicProfileCustomiseViewProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [coverUrl, setCoverUrl] = useState(initialCoverUrl);
  const [editorSrc, setEditorSrc] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setCoverUrl(initialCoverUrl);
  }, [initialCoverUrl]);

  const profileHref = `/feed/profile/${encodeURIComponent(slug)}`;

  function openPicker() {
    setError("");
    setMessage("");
    fileInputRef.current?.click();
  }

  function handleFile(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file.");
      return;
    }
    setEditorSrc(URL.createObjectURL(file));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function closeEditor() {
    if (editorSrc?.startsWith("blob:")) {
      URL.revokeObjectURL(editorSrc);
    }
    setEditorSrc(null);
  }

  async function saveCover(file: File) {
    const body = new FormData();
    body.append("file", file);
    const response = await fetch("/api/seller/profile/cover", { method: "POST", body });
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      coverUrl?: string;
    };
    if (!response.ok || !data.coverUrl) {
      throw new Error(data.error ?? "Unable to update profile banner.");
    }
    setCoverUrl(data.coverUrl);
    setMessage("Banner updated. Fans will see it on your public profile.");
    closeEditor();
    router.refresh();
  }

  async function removeCover() {
    const confirmed = window.confirm("Remove the top banner from your public profile?");
    if (!confirmed) return;

    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/seller/profile/cover", { method: "DELETE" });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Unable to remove profile banner.");
        return;
      }
      setCoverUrl(null);
      setMessage("Banner removed.");
      router.refresh();
    } catch {
      setError("Unable to remove profile banner.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="seller-panel">
      <header className="seller-panel__head">
        <p className="seller-panel__eyebrow">
          <Link href="/seller/settings">Settings</Link>
          <span aria-hidden="true"> · </span>
          Public profile
        </p>
        <h1 className="seller-panel__title">Personalise public profile</h1>
        <p className="seller-panel__subtitle">
          Upload a wide banner image for the top of {displayName.split(" ")[0] || "your"} public
          profile. A 16:9 crop works best.
        </p>
      </header>

      <section className="seller-cover-editor" aria-label="Profile banner">
        <div className={`seller-cover-editor__preview${coverUrl ? "" : " is-empty"}`}>
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt="" />
          ) : (
            <p>No banner yet. Add one so your profile feels more personal.</p>
          )}
        </div>

        <div className="seller-cover-editor__actions">
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={openPicker}
            disabled={busy}
          >
            {coverUrl ? "Change banner" : "Upload banner"}
          </button>
          {coverUrl ? (
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => void removeCover()}
              disabled={busy}
            >
              {busy ? "Removing…" : "Remove banner"}
            </button>
          ) : null}
          <Link href={profileHref} className="btn btn--secondary btn--sm">
            View public profile
          </Link>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          onChange={(event) => handleFile(event.target.files)}
        />

        {error ? (
          <p className="seller-banner seller-banner--error" role="alert">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="seller-banner seller-banner--ok" role="status">
            {message}
          </p>
        ) : null}

        <p className="seller-cover-editor__hint">
          Use JPG, PNG, WebP, or GIF up to 12MB. After you pick a photo you can crop and save it.
        </p>
      </section>

      {editorSrc ? (
        <ComposerImageEditor
          src={editorSrc}
          title="Edit profile banner"
          defaultAspectId="16:9"
          onCancel={closeEditor}
          onSave={saveCover}
        />
      ) : null}
    </div>
  );
}
