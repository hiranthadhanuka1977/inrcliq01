export type SampleComment = {
  id: string;
  author: string;
  initials: string;
  color: string;
  text: string;
  timeAgo: string;
  likes: number;
  replies?: SampleComment[];
};

const COMMENT_POOL = [
  "This is incredible — need more of this!",
  "Watched this twice already. So good.",
  "The energy here is unmatched.",
  "Can we get a part two?",
  "Sharing this with everyone I know.",
  "Production quality is next level.",
  "Been waiting for this drop.",
  "Okay but the ending though…",
  "This made my whole day.",
  "Absolute fire. No notes.",
  "How do you always nail the vibe?",
  "On repeat. Not even kidding.",
];

const REPLY_POOL = [
  "Same — already saved this.",
  "Couldn’t agree more.",
  "Came here to say this.",
  "Part two would be wild.",
  "Facts. Every time.",
  "Thank you!! Means a lot.",
  "Haha right? That part got me.",
  "Sending this to my group chat.",
];

const NAME_POOL = [
  { name: "Maya Chen", initials: "MC", color: "#5b8def" },
  { name: "Jordan Lee", initials: "JL", color: "#e07a5f" },
  { name: "Sam Rivera", initials: "SR", color: "#81b29a" },
  { name: "Alex Kim", initials: "AK", color: "#f2cc8f" },
  { name: "Riley Brooks", initials: "RB", color: "#9b5de5" },
  { name: "Casey Nguyen", initials: "CN", color: "#00bbf9" },
  { name: "Taylor Ortiz", initials: "TO", color: "#f15bb5" },
  { name: "Drew Patel", initials: "DP", color: "#00f5d4" },
];

const TIME_POOL = ["2m", "8m", "14m", "32m", "1h", "2h", "3h", "5h"];

function buildComment(
  postId: string,
  seed: number,
  index: number,
  suffix: string,
  textPool: string[],
): SampleComment {
  const name = NAME_POOL[(seed + index * 3) % NAME_POOL.length];
  const text = textPool[(seed + index * 5) % textPool.length];
  const timeAgo = TIME_POOL[(seed + index) % TIME_POOL.length];
  return {
    id: `${postId}-${suffix}`,
    author: name.name,
    initials: name.initials,
    color: name.color,
    text,
    timeAgo,
    likes: ((seed + index * 7) % 48) + 1,
  };
}

/** Deterministic sample comments for a feed post (demo UI). */
export function getSampleComments(postId: string, count: number): SampleComment[] {
  const target = Math.min(Math.max(count, 3), 12);
  const seed = Array.from(postId).reduce((sum, ch) => sum + ch.charCodeAt(0), 0);

  return Array.from({ length: target }, (_, index) => {
    const comment = buildComment(postId, seed, index, `c${index}`, COMMENT_POOL);

    // Attach sample replies to a few top-level comments.
    if (index % 3 === 0) {
      const replyCount = 1 + ((seed + index) % 2);
      comment.replies = Array.from({ length: replyCount }, (_, replyIndex) =>
        buildComment(
          postId,
          seed + 11,
          index * 4 + replyIndex + 1,
          `c${index}-r${replyIndex}`,
          REPLY_POOL,
        ),
      );
    }

    return comment;
  });
}

export function countSampleComments(comments: SampleComment[]): number {
  return comments.reduce((total, comment) => total + 1 + (comment.replies?.length ?? 0), 0);
}

export type CommentSortMode = "relevant" | "newest" | "all";

function commentAgeMinutes(timeAgo: string): number {
  const match = /^(\d+)([mh])$/.exec(timeAgo);
  if (!match) return 0;
  const value = Number(match[1]);
  return match[2] === "h" ? value * 60 : value;
}

/** Sort sample comments for the viewer sort control. */
export function sortSampleComments(comments: SampleComment[], mode: CommentSortMode): SampleComment[] {
  const list = comments.map((comment) => ({
    ...comment,
    replies: comment.replies ? [...comment.replies] : undefined,
  }));

  if (mode === "relevant") {
    list.sort((a, b) => {
      const engagementA = a.likes + (a.replies?.length ?? 0) * 3;
      const engagementB = b.likes + (b.replies?.length ?? 0) * 3;
      return engagementB - engagementA;
    });
  } else if (mode === "newest") {
    list.sort((a, b) => commentAgeMinutes(a.timeAgo) - commentAgeMinutes(b.timeAgo));
  } else {
    // All comments: chronological, oldest first.
    list.sort((a, b) => commentAgeMinutes(b.timeAgo) - commentAgeMinutes(a.timeAgo));
  }

  for (const comment of list) {
    if (!comment.replies?.length) continue;
    if (mode === "newest") {
      comment.replies.sort((a, b) => commentAgeMinutes(a.timeAgo) - commentAgeMinutes(b.timeAgo));
    } else if (mode === "all") {
      comment.replies.sort((a, b) => commentAgeMinutes(b.timeAgo) - commentAgeMinutes(a.timeAgo));
    } else {
      comment.replies.sort((a, b) => b.likes - a.likes);
    }
  }

  return list;
}
