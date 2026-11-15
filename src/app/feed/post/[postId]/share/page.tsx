import PostShareView from "@/components/feed/PostShareView";
import { getFeedPostById } from "@/lib/feed/feed";
import { postSharePayload } from "@/lib/feed/share-post";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";

interface PostSharePageProps {
  params: Promise<{ postId: string }>;
}

export async function generateMetadata({ params }: PostSharePageProps) {
  const { postId } = await params;
  const post = await getFeedPostById(postId);
  if (!post) return { title: "Share post · INRCLIQ" };
  return { title: `Share ${post.author.name}'s post · INRCLIQ` };
}

export default async function PostSharePage({ params }: PostSharePageProps) {
  const user = await getSessionUser();
  if (!user) redirect("/");

  const { postId } = await params;
  const post = await getFeedPostById(postId);
  if (!post) {
    return (
      <main className="main-content profile-page" id="main">
        <p className="profile-directory__empty">This post is no longer available.</p>
      </main>
    );
  }

  return <PostShareView post={postSharePayload(post)} />;
}
