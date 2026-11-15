"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useMemo, type MouseEvent } from "react";
import { appUrlOrigin, internalFeedPath, splitMessageLinks } from "@/lib/feed/message-links";

export default function MessageBody({ text }: { text: string }) {
  const router = useRouter();
  const origins = useMemo(() => [appUrlOrigin()], []);
  const parts = useMemo(() => splitMessageLinks(text, origins), [text, origins]);

  function openInApp(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }
    const path = internalFeedPath(href, [appUrlOrigin(), window.location.origin]);
    if (!path) return;
    event.preventDefault();
    router.push(path);
  }

  return parts.map((part, index) => {
    if (part.type === "text") {
      return <Fragment key={index}>{part.text}</Fragment>;
    }

    if (part.internalFeedHref) {
      return (
        <Link key={index} href={part.internalFeedHref} className="messages-bubble__link">
          {part.text}
        </Link>
      );
    }

    return (
      <a
        key={index}
        href={part.href}
        className="messages-bubble__link"
        target="_blank"
        rel="noopener noreferrer"
        onClick={(event) => openInApp(event, part.href)}
      >
        {part.text}
      </a>
    );
  });
}
