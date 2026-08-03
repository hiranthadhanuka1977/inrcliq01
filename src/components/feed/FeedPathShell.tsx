"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import {
  FEED_BODY_CLASSES,
  feedPageClassForPath,
} from "@/lib/feed/feed-page-class";

/** Applies the feed page class on a wrapper (SSR-safe) and keeps body in sync. */
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
