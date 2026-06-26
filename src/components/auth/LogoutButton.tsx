"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    if (loading) return;
    setLoading(true);

    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      const data = await response.json();

      if (!response.ok) {
        setLoading(false);
        return;
      }

      router.push(data.redirectTo ?? "/");
      router.refresh();
    } catch {
      setLoading(false);
    }
  }

  return (
    <button type="button" onClick={handleLogout} disabled={loading}>
      {loading ? "Logging out…" : "Log out"}
    </button>
  );
}
