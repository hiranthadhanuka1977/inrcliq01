"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { SellerServiceRequestsConfig } from "@/lib/seller/service-requests-helpers";
import { readApiError } from "./api";

export function PageSetup({ config }: { config: SellerServiceRequestsConfig }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(config.enabled);
  const [intro, setIntro] = useState(config.content.intro.join("\n\n"));
  const [responseTime, setResponseTime] = useState(config.content.responseTime);
  const [guarantee, setGuarantee] = useState(config.content.guarantee);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const response = await fetch("/api/seller/service-requests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          content: {
            ...config.content,
            intro: intro
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean),
            responseTime: responseTime.trim(),
            guarantee: guarantee.trim(),
          },
        }),
      });
      if (!response.ok) {
        setError(await readApiError(response, "Unable to save this page."));
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("Unable to save this page.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {error ? <p className="admin-banner admin-banner--err">{error}</p> : null}
      {saved ? <p className="admin-banner admin-banner--ok">Saved.</p> : null}
      <form className="studio-form" onSubmit={handleSubmit}>
        <label className="admin-check">
          <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
          Show service requests on your profile
        </label>
        <p className="studio-note">Turn this on after a category has a photo and at least one live offering.</p>
        <label className="admin-field">
          Introduction
          <textarea value={intro} onChange={(event) => setIntro(event.target.value)} placeholder="What fans should know before they request something." />
          <small>Each line becomes its own paragraph.</small>
        </label>
        <label className="admin-field">
          How fast you reply
          <input value={responseTime} onChange={(event) => setResponseTime(event.target.value)} placeholder="Within 3 days" />
        </label>
        <label className="admin-field">
          Guarantee
          <input value={guarantee} onChange={(event) => setGuarantee(event.target.value)} placeholder="What happens if you miss the delivery date" />
        </label>
        <div className="admin-actions">
          <button className="admin-btn" type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save page"}
          </button>
        </div>
      </form>
    </>
  );
}
