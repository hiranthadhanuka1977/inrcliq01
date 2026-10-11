"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminTopSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const query = q.trim();
        router.push(query ? `/admin/users?q=${encodeURIComponent(query)}` : "/admin/users");
      }}
    >
      <input
        type="search"
        name="q"
        placeholder="Search name, email, handle"
        aria-label="Search users"
        value={q}
        onChange={(event) => setQ(event.target.value)}
      />
      <button className="admin-btn admin-btn--subtle" type="submit">
        Search
      </button>
    </form>
  );
}
