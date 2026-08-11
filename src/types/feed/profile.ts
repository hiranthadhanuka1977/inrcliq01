import type { FeedItem } from "@/types/feed/feed";

export interface ProfileStats {
  followers: string;
  following: number;
  subscribers: number;
  posts: number;
}

export interface ProfileCollectionItem {
  id?: string;
  name: string;
  price: string;
  image: string;
  image_alt: string;
}

export interface ProfilePopularPost {
  title: string;
  posted_ago: string;
  likes: string;
  comments: string;
  image: string;
  members_only: boolean;
  has_video: boolean;
}

export interface ProfileData {
  slug: string;
  name: string;
  handle: string;
  avatar_initials: string;
  avatar_color: string;
  avatar_url: string | null;
  verified: boolean;
  cover_url: string | null;
  bio: string;
  special_requests?: boolean;
  /** When false, Special Requests exist but are temporarily off for fans. */
  special_requests_enabled?: boolean;
  /** When false, Collection exists but the storefront is temporarily off for fans. */
  collection_enabled?: boolean;
  stats: ProfileStats;
  subscription: {
    price_label: string;
  } | null;
  relationship?: {
    following?: boolean;
    subscribed?: boolean;
  };
  /** True when the signed-in user is viewing their own creator profile. */
  is_own?: boolean;
  collection: ProfileCollectionItem[];
  popular_posts: ProfilePopularPost[];
  feed_posts: FeedItem[];
}
