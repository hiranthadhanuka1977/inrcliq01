import PostPermalinkView from "@/components/feed/PostPermalinkView";
import { getFeedPostById } from "@/lib/feed/feed";

interface PostPageProps {
  params: Promise<{ postId: string }>;
}

export async function generateMetadata({ params }: PostPageProps) {
  const { postId } = await params;
  const post = await getFeedPostById(postId);
  if (!post) return { title: "Post · INRCLIQ" };
  return { title: `${post.author.name}'s post · INRCLIQ` };
}

export default async function PostPage({ params }: PostPageProps) {
  const { postId } = await params;
  const post = await getFeedPostById(postId);
  if (!post) {
    return (
      <main className="main-content" id="main">
        <p className="profile-directory__empty">This post is no longer available.</p>
      </main>
    );
  }

  return <PostPermalinkView item={post} />;
}
