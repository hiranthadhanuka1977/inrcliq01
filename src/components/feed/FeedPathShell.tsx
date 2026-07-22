"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

type FeedPageClass = "page-home" | "page-profile" | "page-audio" | "page-messages";

const FEED_BODY_CLASSES: FeedPageClass[] = [
  "page-home",
  "page-profile",
  "page-audio",
  "page-messages",
];

export function feedPageClassForPath(pathname: string): FeedPageClass {
  if (pathname.startsWith("/feed/audio")) return "page-audio";
  if (pathname.startsWith("/feed/messages")) return "page-messages";
  if (pathname.startsWith("/feed/profile")) return "page-profile";
  return "page-home";
}

/** Applies the feed page class on a wrapper (SSR-safe) and on body before paint. */
export default function FeedPathShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const pageClass = feedPageClassForPath(pathname);

  useLayoutEffect(() => {
    const body = document.body;
    body.classList.remove(...FEED_BODY_CLASSES);
    body.classList.add(pageClass);

    return () => {
      body.classList.remove(pageClass);
    };
  }, [pageClass]);

  return <div className={`feed-path-shell ${pageClass}`}>{children}</div>;
}
