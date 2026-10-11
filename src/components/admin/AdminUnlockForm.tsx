"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

export function AdminUnlockForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/admin-portal/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Incorrect password.");
        setPending(false);
        return;
      }
      const next = searchParams.get("next");
      router.push(next && next.startsWith("/admin") ? next : "/admin/dashboard");
      router.refresh();
    } catch {
      setError("Unable to unlock the admin portal.");
      setPending(false);
    }
  }

  return (
    <div className="admin-unlock">
      <form className="admin-unlock__card" onSubmit={onSubmit}>
        <p className="admin-kicker">InrCliq</p>
        <h1>Admin portal</h1>
        <p>Onboarding, guardian approval, and user operations. Use the admin password.</p>
        <label className="admin-field" htmlFor="admin-password">
          Password
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {error ? (
          <p className="admin-banner admin-banner--err" role="alert">
            {error}
          </p>
        ) : null}
        <button className="admin-btn" type="submit" disabled={pending}>
          {pending ? "Checking…" : "Continue"}
        </button>
      </form>
    </div>
  );
}
