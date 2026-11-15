"use client";

import { useRouter } from "next/navigation";
import SharePostDialog from "@/components/feed/SharePostDialog";
import { postShareHref, type PostSharePayload } from "@/lib/feed/post-share-message";

export default function PostShareView({ post }: { post: PostSharePayload }) {
  const router = useRouter();
  return <SharePostDialog post={post} onClose={() => router.push(postShareHref(post.postId))} />;
}
