"use client";

import Link from "next/link";
import { useId, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { MyBookingItem } from "@/lib/feed/user-bookings";
import { bookingStatusClass } from "@/lib/feed/booking-status";
import LeftNav from "@/components/feed/LeftNav";
import MobileNav from "@/components/feed/MobileNav";

export default function BookingDeliverView({ booking }: { booking: MyBookingItem }) {
  const router = useRouter();
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleFilePick(file: File | null) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/feed/bookings/uploads", { method: "POST", body });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        url?: string;
        name?: string;
      };
      if (!response.ok || !data.url) {
        setError(data.error ?? "Unable to upload that file.");
        return;
      }
      setFileUrl(data.url);
      setFileName(data.name || file.name);
    } catch {
      setError("Unable to upload that file.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!fileUrl) {
      setError("Upload a delivery file before marking this complete.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/feed/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deliver",
          deliveryUrl: fileUrl,
          deliveryName: fileName || null,
          note: note.trim() || null,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        reference?: string;
      };
      if (!response.ok) {
        setError(data.error ?? "Unable to mark this booking as delivered.");
        return;
      }

      const params = new URLSearchParams({
        tab: "calendar",
        toast: "delivered",
        ref: data.reference || booking.reference,
      });
      router.push(`/feed/bookings?${params.toString()}`);
      router.refresh();
    } catch {
      setError("Unable to mark this booking as delivered.");
    } finally {
      setSubmitting(false);
    }
  }

  const busy = uploading || submitting;

  return (
    <div className="app-shell page-bookings">
      <LeftNav />
      <main className="main-content bookings-page" id="main">
        <header className="my-bookings__head booking-deliver__head">
          <p className="booking-deliver__eyebrow">
            <Link href="/feed/bookings?tab=inbound">Commitments</Link>
            <span aria-hidden="true"> · </span>
            Deliver
          </p>
          <h1 className="my-bookings__title">Mark as delivered</h1>
          <p className="my-bookings__subtitle">
            Upload the finished file for <code>{booking.reference}</code>, review the request, then
            confirm delivery.
          </p>
        </header>

        <div className="booking-deliver">
          <section className="booking-deliver__review" aria-labelledby="deliver-review-title">
            <div className="booking-deliver__review-head">
              <h2 id="deliver-review-title">Request details</h2>
              <span className={bookingStatusClass(booking.status)}>{booking.statusLabel}</span>
            </div>
            <dl className="booking-deliver__facts">
              <div>
                <dt>Reference</dt>
                <dd>
                  <code>{booking.reference}</code>
                </dd>
              </div>
              <div>
                <dt>Requester</dt>
                <dd>
                  {booking.creator.name}
                  <span aria-hidden="true"> · </span>
                  {booking.creator.handle}
                </dd>
              </div>
              <div>
                <dt>Booking type</dt>
                <dd>{booking.requestLabel}</dd>
              </div>
              {booking.category ? (
                <div>
                  <dt>Category</dt>
                  <dd>{booking.category}</dd>
                </div>
              ) : null}
              <div>
                <dt>Total</dt>
                <dd>{booking.totalLabel}</dd>
              </div>
              {booking.deliverByLabel ? (
                <div>
                  <dt>Deliver by</dt>
                  <dd>{booking.deliverByLabel}</dd>
                </div>
              ) : null}
            </dl>

            {booking.summary.length > 0 ? (
              <dl className="my-bookings__summary-list booking-deliver__summary">
                {booking.summary.map((row) => (
                  <div key={row.label} className="my-bookings__summary-row">
                    <dt>{row.label}</dt>
                    <dd>{row.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </section>

          <form className="booking-deliver__form" onSubmit={(event) => void handleSubmit(event)}>
            <h2>Delivery file</h2>
            <p className="booking-deliver__form-copy">
              Add the finished deliverable fans should receive. PDF, Word, text, or image up to 10MB.
            </p>

            <div className="my-bookings-decline__field">
              <span>Upload file</span>
              <div className="my-bookings-accept__file-row">
                <input
                  ref={fileInputRef}
                  id={fileInputId}
                  type="file"
                  className="sr-only"
                  accept=".pdf,.doc,.docx,.txt,image/*"
                  disabled={busy}
                  onChange={(event) => void handleFilePick(event.target.files?.[0] ?? null)}
                />
                <label
                  htmlFor={fileInputId}
                  className="btn btn--secondary btn--xs my-bookings__respond-btn"
                >
                  {uploading ? "Uploading…" : fileName ? "Replace file" : "Choose file"}
                </label>
                {fileName ? (
                  <span className="my-bookings-accept__file-name">
                    {fileName}
                    <button
                      type="button"
                      className="my-bookings-accept__file-clear"
                      onClick={() => {
                        setFileUrl("");
                        setFileName("");
                      }}
                      disabled={busy}
                      aria-label="Remove delivery file"
                    >
                      ×
                    </button>
                  </span>
                ) : (
                  <span className="my-bookings-accept__file-hint">Required to mark as delivered</span>
                )}
              </div>
            </div>

            <label className="my-bookings-decline__field">
              <span>Note to requester (optional)</span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                disabled={busy}
                placeholder="Any final notes, usage terms, or follow-up details…"
              />
            </label>

            {error ? (
              <p className="my-bookings-decline__error" role="alert">
                {error}
              </p>
            ) : null}

            <div className="booking-deliver__actions">
              <Link
                href={`/feed/bookings?tab=inbound&booking=${encodeURIComponent(booking.id)}`}
                className="btn btn--secondary btn--sm"
              >
                Cancel
              </Link>
              <button
                type="submit"
                className="btn btn--primary btn--sm"
                disabled={busy || !fileUrl}
              >
                {submitting ? "Marking delivered…" : "Mark as delivered"}
              </button>
            </div>
          </form>
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
