"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminLogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        setPending(true);
        void fetch("/api/admin-portal/logout", { method: "POST" }).then(() => {
          router.push("/admin/unlock");
          router.refresh();
        });
      }}
    >
      {pending ? "Locking…" : "Lock portal"}
    </button>
  );
}
