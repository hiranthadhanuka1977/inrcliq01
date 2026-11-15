"use client";

import { useState } from "react";

export function ImageField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function upload(file: File) {
    setError("");
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/seller/uploads", { method: "POST", body });
      const data = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (!response.ok || !data?.url) {
        setError(data?.error || "Unable to upload image.");
        return;
      }
      onChange(data.url);
    } catch {
      setError("Unable to upload image.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="studio-photo">
      <div className="studio-photo__preview">
        {value ? <img src={value} alt="" /> : "Photo"}
      </div>
      <label className="admin-field">
        {label}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          disabled={uploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void upload(file);
          }}
        />
        <small>{uploading ? "Uploading…" : hint}</small>
        {error ? <small>{error}</small> : null}
      </label>
    </div>
  );
}
