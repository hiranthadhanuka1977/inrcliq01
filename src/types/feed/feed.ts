export interface FeedAuthor {
  name: string;
  handle: string;
  /** Public profile URL slug when known (from CreatorUser / UserProfile). */
  slug?: string | null;
  avatar_initials: string;
  avatar_color: string;
  avatar_url: string | null;
  verified: boolean;
}

export interface FeedImage {
  url: string;
  alt: string;
}

export interface FeedAudioTheme {
  accent_a: string;
  accent_b: string;
  base: [string, string, string];
  border: string;
}

export interface FeedAudio {
  title: string;
  thumbnail: FeedImage;
  current_time: string;
  duration: string;
  progress?: number;
  audio_url?: string | null;
  theme?: FeedAudioTheme;
}

export interface FeedMedia {
  type: "image" | "collage" | "video";
  images: FeedImage[];
  /** Optional clip URL; feed falls back to the shared sample video when omitted. */
  video_url?: string | null;
  /** When false, image posts are photos — not sample-video cards. */
  use_sample_video?: boolean;
  location?: {
    label: string;
    lat?: number;
    lng?: number;
  };
  feeling?: {
    kind: "feeling" | "activity";
    emoji: string;
    label: string;
  };
  tagged?: {
    name: string;
    handle: string;
    slug: string | null;
  }[];
}

export interface FeedEngagement {
  /** Every reaction added up — the number next to the button, not thumbs-up alone. */
  likes: number;
  /**
   * The breakdown, for the stacked emoji: `{ LOVE: 30, HAHA: 8 }`.
   *
   * Only reactions somebody actually left appear, so read the top few by value
   * rather than expecting a fixed set of keys.
   */
  reactions?: Record<string, number>;
  comments: number;
  shares: number;
}

export interface FeedRelationship {
  following: boolean;
  subscribed?: boolean;
}

export interface FeedItem {
  id: string;
  category: string;
  author: FeedAuthor;
  text: string;
  tags: string[];
  media: FeedMedia | null;
  audio?: FeedAudio | null;
  engagement: FeedEngagement;
  relationship: FeedRelationship;
  posted_at: string;
  posted_ago: string;
  members_only?: boolean;
  /** True when the logged-in user authored this post. */
  is_own?: boolean;
  /** Live mode: whether this viewer has already reacted at all. */
  viewer_liked?: boolean;
  /** Live mode: which reaction they left, as the API spells it (`LOVE`). */
  viewer_reaction?: string | null;
  /** Live mode: whether this viewer has already saved it. */
  viewer_bookmarked?: boolean;
}

export interface FeedData {
  version: string;
  description: string;
  generated_at: string;
  total_items: number;
  categories: string[];
  items: FeedItem[];
}
