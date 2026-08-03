export type FeedPageClass =
  | "page-home"
  | "page-profile"
  | "page-audio"
  | "page-messages"
  | "page-bookings";

export const FEED_BODY_CLASSES: FeedPageClass[] = [
  "page-home",
  "page-profile",
  "page-audio",
  "page-messages",
  "page-bookings",
];

export function feedPageClassForPath(pathname: string): FeedPageClass {
  if (pathname.startsWith("/feed/audio")) return "page-audio";
  if (pathname.startsWith("/feed/messages")) return "page-messages";
  if (pathname.startsWith("/feed/bookings")) return "page-bookings";
  if (pathname.startsWith("/feed/profile") || pathname.startsWith("/feed/me")) {
    return "page-profile";
  }
  return "page-home";
}
