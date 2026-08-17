"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ShareIcon from "@/components/feed/ShareIcon";
import FeedReactionButton, { type FeedReactionId } from "@/components/feed/FeedReactionButton";
import { useDialogA11y } from "@/lib/accessibility/useDialogA11y";
import { resolveAuthorProfileSlug } from "@/lib/feed/profile-slugs";
import {
  countSampleComments,
  getSampleComments,
  sortSampleComments,
  type CommentSortMode,
  type SampleComment,
} from "@/lib/feed/sample-comments";
import type { FeedImage, FeedItem } from "@/types/feed/feed";

type FeedVideoViewerProps = {
  item: FeedItem;
  slides: FeedImage[];
  initialIndex?: number;
  open: boolean;
  /** Full media theater vs comments-focused popup. */
  mode?: "media" | "comments";
  /** When set, the stage plays this clip; otherwise photos are shown. */
  videoSrc?: string | null;
  onClose: () => void;
};

function isInsideScrollableComments(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest(".feed-video-viewer__comments"));
}

const COMMENT_SORT_OPTIONS: {
  id: CommentSortMode;
  label: string;
  description: string;
}[] = [
  {
    id: "relevant",
    label: "Most relevant",
    description: "Show friends’ comments and the most engaging comments first.",
  },
  {
    id: "newest",
    label: "Newest",
    description: "Show all comments with the newest comments first.",
  },
  {
    id: "all",
    label: "All comments",
    description: "Show all comments, including potential spam.",
  },
];

const sortCaretSvg = (
  <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M4.2 6.2a.75.75 0 0 1 1.06 0L8 8.94l2.74-2.74a.75.75 0 1 1 1.06 1.06l-3.27 3.27a.75.75 0 0 1-1.06 0L4.2 7.26a.75.75 0 0 1 0-1.06Z" />
  </svg>
);

const chevronLeft = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M15 18 9 12l6-6" />
  </svg>
);

const chevronRight = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m9 18 6-6-6-6" />
  </svg>
);

export default function FeedVideoViewer({
  item,
  slides,
  initialIndex = 0,
  open,
  mode = "media",
  videoSrc = null,
  onClose,
}: FeedVideoViewerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lockedScrollYRef = useRef(0);
  const [reaction, setReaction] = useState<FeedReactionId | null>(null);
  const [commentReactions, setCommentReactions] = useState<Record<string, FeedReactionId>>({});
  const [commentSort, setCommentSort] = useState<CommentSortMode>("relevant");
  const [draft, setDraft] = useState("");
  const [mounted, setMounted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const isCommentsMode = mode === "comments";
  const comments = useMemo(
    () => getSampleComments(item.id, Math.max(item.engagement.comments, 6)),
    [item.engagement.comments, item.id],
  );
  const sortedComments = useMemo(
    () => sortSampleComments(comments, commentSort),
    [commentSort, comments],
  );
  const slideCount = Math.max(slides.length, 1);
  const safeIndex = ((activeIndex % slideCount) + slideCount) % slideCount;
  const activeSlide = slides[safeIndex] ?? null;
  const hasCarousel = slideCount > 1;
  const canGoPrev = hasCarousel && safeIndex > 0;
  const canGoNext = hasCarousel && safeIndex < slideCount - 1;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setCommentReactions({});
      setReaction(null);
      setCommentSort("relevant");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setActiveIndex(Math.min(Math.max(initialIndex, 0), Math.max(slideCount - 1, 0)));
  }, [open, initialIndex, slideCount]);

  useEffect(() => {
    if (!open) return;

    const html = document.documentElement;
    const body = document.body;
    lockedScrollYRef.current = window.scrollY;

    const previous = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyPaddingRight: body.style.paddingRight,
    };

    const scrollbarGap = window.innerWidth - html.clientWidth;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    if (scrollbarGap > 0) {
      body.style.paddingRight = `${scrollbarGap}px`;
    }
    body.classList.add("feed-video-viewer-open");

    const blockPageScroll = (event: WheelEvent | TouchEvent) => {
      if (isInsideScrollableComments(event.target)) return;
      event.preventDefault();
    };

    window.addEventListener("wheel", blockPageScroll, { passive: false });
    window.addEventListener("touchmove", blockPageScroll, { passive: false });

    return () => {
      window.removeEventListener("wheel", blockPageScroll);
      window.removeEventListener("touchmove", blockPageScroll);

      html.style.overflow = previous.htmlOverflow;
      body.style.overflow = previous.bodyOverflow;
      body.style.paddingRight = previous.bodyPaddingRight;
      body.classList.remove("feed-video-viewer-open");

      const scrollY = lockedScrollYRef.current;
      if (window.scrollY !== scrollY) {
        window.scrollTo({ top: scrollY, left: 0, behavior: "instant" });
      }
    };
  }, [open]);

  useEffect(() => {
    if (!open || isCommentsMode || !videoSrc) return;
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    video.currentTime = 0;
    void video.play().catch(() => {
      /* autoplay may be blocked until user interacts */
    });
  }, [open, safeIndex, isCommentsMode, videoSrc]);

  const goPrev = useCallback(() => {
    setActiveIndex((current) => Math.max(current - 1, 0));
  }, []);

  const goNext = useCallback(() => {
    setActiveIndex((current) => Math.min(current + 1, slideCount - 1));
  }, [slideCount]);

  useEffect(() => {
    if (!open || !hasCarousel || isCommentsMode) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrev();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, hasCarousel, isCommentsMode, goPrev, goNext]);

  const setCommentReaction = useCallback((commentId: string, next: FeedReactionId | null) => {
    setCommentReactions((current) => {
      if (!next) {
        if (!(commentId in current)) return current;
        const { [commentId]: _removed, ...rest } = current;
        return rest;
      }
      return { ...current, [commentId]: next };
    });
  }, []);

  const releaseFocusWithoutScroll = useCallback(() => {
    const active = document.activeElement;
    if (active instanceof HTMLElement) {
      active.blur();
    }

    const body = document.body;
    body.setAttribute("tabindex", "-1");
    body.focus({ preventScroll: true });
    body.removeAttribute("tabindex");
  }, []);

  const handleClose = useCallback(() => {
    videoRef.current?.pause();
    releaseFocusWithoutScroll();
    onClose();

    requestAnimationFrame(() => {
      releaseFocusWithoutScroll();
    });
  }, [onClose, releaseFocusWithoutScroll]);

  const { dialogRef } = useDialogA11y(open, handleClose, { restoreFocus: false });

  if (!open || !mounted) return null;

  const { author } = item;
  const handle = author.handle.startsWith("@") ? author.handle : `@${author.handle}`;
  const profileSlug = resolveAuthorProfileSlug(author.handle, author.slug);
  const commentInputId = `video-comment-${item.id}`;

  return createPortal(
    <div
      ref={dialogRef}
      className={`feed-video-viewer${isCommentsMode ? " feed-video-viewer--comments" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={isCommentsMode ? "Comments" : videoSrc ? "Video viewer" : "Photo viewer"}
      tabIndex={-1}
    >
      {isCommentsMode ? (
        <button
          type="button"
          className="feed-video-viewer__backdrop"
          aria-label="Close comments"
          onClick={handleClose}
        />
      ) : null}

      <div className={`feed-video-viewer__shell${isCommentsMode ? " feed-video-viewer__shell--comments" : ""}`}>
        <button
          type="button"
          className={`feed-video-viewer__close${isCommentsMode ? " feed-video-viewer__close--panel" : " feed-video-viewer__close--media"}`}
          aria-label="Close"
          onClick={handleClose}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>

        {!isCommentsMode ? (
          <div className="feed-video-viewer__stage">
            {hasCarousel ? (
              <div className="feed-video-viewer__counter" aria-live="polite">
                {safeIndex + 1} / {slideCount}
              </div>
            ) : null}

            {canGoPrev ? (
              <button
                type="button"
                className="feed-video-viewer__nav feed-video-viewer__nav--prev"
                aria-label={videoSrc ? "Previous video" : "Previous photo"}
                onClick={goPrev}
              >
                {chevronLeft}
              </button>
            ) : null}

            {canGoNext ? (
              <button
                type="button"
                className="feed-video-viewer__nav feed-video-viewer__nav--next"
                aria-label={videoSrc ? "Next video" : "Next photo"}
                onClick={goNext}
              >
                {chevronRight}
              </button>
            ) : null}

            {videoSrc ? (
              <video
                key={`${item.id}-${safeIndex}-${mode}`}
                ref={videoRef}
                className="feed-video-viewer__video"
                src={videoSrc}
                poster={activeSlide?.url}
                controls
                playsInline
                autoPlay
              />
            ) : activeSlide ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={`${item.id}-${safeIndex}-${mode}`}
                className="feed-video-viewer__image"
                src={activeSlide.url}
                alt={activeSlide.alt}
              />
            ) : (
              <div className="feed-video-viewer__empty-media">
                <p>{item.text || "Post"}</p>
              </div>
            )}
          </div>
        ) : null}

        <aside className="feed-video-viewer__side">
          <header className="feed-video-viewer__head">
            <div className="feed-video-viewer__author">
              {profileSlug ? (
                <Link href={`/feed/profile/${profileSlug}`} className="feed-video-viewer__avatar-link" onClick={handleClose}>
                  <AuthorAvatar author={author} />
                </Link>
              ) : (
                <AuthorAvatar author={author} />
              )}
              <div className="feed-video-viewer__identity">
                {profileSlug ? (
                  <Link href={`/feed/profile/${profileSlug}`} className="feed-video-viewer__name" onClick={handleClose}>
                    {author.name}
                  </Link>
                ) : (
                  <strong className="feed-video-viewer__name">{author.name}</strong>
                )}
                <div className="feed-video-viewer__meta">
                  <span className="feed-video-viewer__handle">{handle}</span>
                  <span className="feed-video-viewer__meta-dot" aria-hidden="true">
                    ·
                  </span>
                  <time>{item.posted_ago}</time>
                </div>
              </div>
            </div>
          </header>

          <div className="feed-video-viewer__body">
            {item.tags.length > 0 ? (
              <div className="feed-video-viewer__tags">
                {item.tags.map((tag) => (
                  <span key={tag} className="tag">
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
            {item.text ? <p className="feed-video-viewer__text">{item.text}</p> : null}
          </div>

          <div className="feed-video-viewer__actions" role="group" aria-label="Post actions">
            <FeedReactionButton
              variant="viewer"
              count={item.engagement.likes}
              reaction={reaction}
              onReactionChange={setReaction}
            />
            <button type="button" className="feed-video-viewer__action feed-video-viewer__action--comment" aria-label="Comments">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span>{item.engagement.comments.toLocaleString()}</span>
            </button>
            <button type="button" className="feed-video-viewer__action feed-video-viewer__action--share" aria-label="Share">
              <ShareIcon />
            </button>
          </div>

          <div className="feed-video-viewer__comments-head">
            <CommentSortControl value={commentSort} onChange={setCommentSort} />
            <span>{countSampleComments(comments)}</span>
          </div>

          <div className="feed-video-viewer__comments" aria-label="Comments">
            {sortedComments.map((comment) => (
              <CommentThread
                key={comment.id}
                comment={comment}
                commentReactions={commentReactions}
                onReactionChange={setCommentReaction}
              />
            ))}
          </div>

          <form
            className="feed-video-viewer__composer"
            onSubmit={(event) => {
              event.preventDefault();
              setDraft("");
            }}
          >
            <label className="sr-only" htmlFor={commentInputId}>
              Write a comment
            </label>
            <input
              id={commentInputId}
              className="feed-video-viewer__composer-input"
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Add a comment…"
              autoComplete="off"
            />
            <button type="submit" className="btn btn--primary btn--sm" disabled={!draft.trim()}>
              Post
            </button>
          </form>
        </aside>
      </div>
    </div>,
    document.body,
  );
}

function CommentSortControl({
  value,
  onChange,
}: {
  value: CommentSortMode;
  onChange: (next: CommentSortMode) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const active = COMMENT_SORT_OPTIONS.find((option) => option.id === value) ?? COMMENT_SORT_OPTIONS[0];

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`feed-video-viewer__sort${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="feed-video-viewer__sort-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{active.label}</span>
        {sortCaretSvg}
      </button>

      {open ? (
        <div className="feed-video-viewer__sort-menu" role="menu" aria-label="Comment sort order">
          {COMMENT_SORT_OPTIONS.map((option) => {
            const selected = option.id === value;
            return (
              <button
                key={option.id}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                className={`feed-video-viewer__sort-option${selected ? " is-selected" : ""}`}
                onClick={() => {
                  onChange(option.id);
                  setOpen(false);
                }}
              >
                <strong>{option.label}</strong>
                <span>{option.description}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function CommentThread({
  comment,
  commentReactions,
  onReactionChange,
}: {
  comment: SampleComment;
  commentReactions: Record<string, FeedReactionId>;
  onReactionChange: (commentId: string, next: FeedReactionId | null) => void;
}) {
  const replies = comment.replies ?? [];

  return (
    <div className="feed-video-viewer__thread">
      <CommentRow
        comment={comment}
        reaction={commentReactions[comment.id] ?? null}
        onReactionChange={onReactionChange}
      />
      {replies.length > 0 ? (
        <div className="feed-video-viewer__replies" aria-label={`Replies to ${comment.author}`}>
          {replies.map((reply) => (
            <CommentRow
              key={reply.id}
              comment={reply}
              reaction={commentReactions[reply.id] ?? null}
              onReactionChange={onReactionChange}
              isReply
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CommentRow({
  comment,
  reaction,
  onReactionChange,
  isReply = false,
}: {
  comment: SampleComment;
  reaction: FeedReactionId | null;
  onReactionChange: (commentId: string, next: FeedReactionId | null) => void;
  isReply?: boolean;
}) {
  return (
    <article className={`feed-video-viewer__comment${isReply ? " feed-video-viewer__comment--reply" : ""}`}>
      <div
        className="feed-video-viewer__comment-avatar"
        style={{ background: comment.color }}
        aria-hidden="true"
      >
        {comment.initials}
      </div>
      <div className="feed-video-viewer__comment-body">
        <div className="feed-video-viewer__comment-top">
          <strong>{comment.author}</strong>
          <time>{comment.timeAgo}</time>
        </div>
        <p>{comment.text}</p>
        <div className="feed-video-viewer__comment-meta">
          <FeedReactionButton
            variant="comment"
            count={comment.likes}
            reaction={reaction}
            onReactionChange={(next) => onReactionChange(comment.id, next)}
          />
          <button type="button">Reply</button>
        </div>
      </div>
    </article>
  );
}

function AuthorAvatar({ author }: { author: FeedItem["author"] }) {
  return (
    <div
      className="feed-video-viewer__avatar"
      style={{ "--story-color": author.avatar_color } as React.CSSProperties}
      aria-hidden="true"
    >
      {author.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={author.avatar_url} alt="" />
      ) : (
        author.avatar_initials
      )}
    </div>
  );
}
