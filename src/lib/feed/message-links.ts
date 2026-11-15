export type MessageTextPart =
  | { type: "text"; text: string }
  | { type: "link"; text: string; href: string; internalFeedHref: string | null };

const URL_PATTERN = /https?:\/\/[^\s<>"'`]+/gi;

/** Public app origin used when profile shares are written. Safe to read in the client. */
export function appUrlOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3002";
  try {
    return new URL(raw).origin;
  } catch {
    return "http://localhost:3002";
  }
}

function originOf(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function isHttpUrl(href: string): boolean {
  try {
    const url = new URL(href);
    return (url.protocol === "http:" || url.protocol === "https:") && Boolean(url.hostname);
  } catch {
    return false;
  }
}

/**
 * Same-origin /feed/... paths become in-app routes.
 * Other http(s) URLs stay absolute so they can open outside the app.
 */
export function internalFeedPath(href: string, origins: readonly string[]): string | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  if (url.pathname !== "/feed" && !url.pathname.startsWith("/feed/")) return null;

  const allowed = new Set(
    origins.map((origin) => originOf(origin)).filter((origin): origin is string => Boolean(origin)),
  );
  if (!allowed.has(url.origin)) return null;
  return `${url.pathname}${url.search}${url.hash}`;
}

function peelTrailing(raw: string): { href: string; trailing: string } {
  let href = raw;
  let trailing = "";

  while (href.length > 0) {
    const last = href[href.length - 1]!;
    if (last === ")" || last === "]" || last === "}") {
      const open = last === ")" ? "(" : last === "]" ? "[" : "{";
      const opens = href.split(open).length - 1;
      const closes = href.split(last).length - 1;
      if (closes <= opens) break;
      trailing = last + trailing;
      href = href.slice(0, -1);
      continue;
    }
    if (/[.,;:!?'"]/.test(last)) {
      trailing = last + trailing;
      href = href.slice(0, -1);
      continue;
    }
    break;
  }

  return { href, trailing };
}

export function splitMessageLinks(text: string, origins: readonly string[]): MessageTextPart[] {
  const parts: MessageTextPart[] = [];
  let cursor = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const raw = match[0];
    const index = match.index ?? 0;
    const { href } = peelTrailing(raw);
    if (!isHttpUrl(href) || index < cursor) continue;

    if (index > cursor) {
      parts.push({ type: "text", text: text.slice(cursor, index) });
    }

    parts.push({
      type: "link",
      text: href,
      href,
      internalFeedHref: internalFeedPath(href, origins),
    });
    cursor = index + href.length;
  }

  if (cursor < text.length) {
    parts.push({ type: "text", text: text.slice(cursor) });
  }

  return parts.length > 0 ? parts : [{ type: "text", text }];
}
