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
  likes: number;
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
}

export interface FeedData {
  version: string;
  description: string;
  generated_at: string;
  total_items: number;
  categories: string[];
  items: FeedItem[];
}
