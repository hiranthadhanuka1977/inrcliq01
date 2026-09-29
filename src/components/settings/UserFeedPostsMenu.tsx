"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CogMenu } from "@/components/settings/CogMenu";

export function UserFeedPostsMenu({
  userId,
  userName,
  postCount,
}: {
  userId: string;
  userName: string;
  postCount: number;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    const noun = postCount === 1 ? "post" : "posts";
    const confirmed = window.confirm(
      `Delete all ${postCount} feed ${noun} by ${userName}? They will be removed from the feed and this cannot be undone.`,
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/settings/users/${encodeURIComponent(userId)}/feed-posts`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const data = await response.json();
      if (!response.ok) {
        window.alert(data.error ?? "Unable to delete feed posts.");
        return;
      }
      router.refresh();
    } catch {
      window.alert("Unable to delete feed posts.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <CogMenu
      label="Feed posts options"
      disabled={deleting}
      items={[
        {
          label: postCount ? `Delete feed posts (${postCount})` : "No feed posts to delete",
          danger: true,
          disabled: postCount === 0,
          onSelect: handleDelete,
        },
      ]}
    />
  );
}
