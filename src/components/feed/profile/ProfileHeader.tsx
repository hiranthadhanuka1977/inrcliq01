"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import FollowButton from "@/components/feed/FollowButton";
import ShareIcon from "@/components/feed/ShareIcon";
import CollectionCartDrawer from "@/components/feed/profile/CollectionCartDrawer";
import {
  cartItemCount,
  readCollectionCart,
  writeCollectionCart,
  type CollectionCartItem,
} from "@/lib/feed/collection-cart";
import type { ProfileData } from "@/types/feed/profile";

type NotificationLevel = "all" | "personalized" | "none";

const SUBSCRIBE_MENU_ITEMS: { id: NotificationLevel | "unsubscribe"; label: string; description?: string }[] = [
  { id: "all", label: "All", description: "Every new post and drop" },
  { id: "personalized", label: "Personalized", description: "Highlights based on your activity" },
  { id: "none", label: "None", description: "Mute notifications from this creator" },
  { id: "unsubscribe", label: "Unsubscribe" },
];

const SPECIAL_REQUESTS_SIZE = 72;
const MENU_GAP = 8;
const MENU_MIN_WIDTH = 248;
const VIEWPORT_PAD = 12;

type MenuCoords = {
  top: number;
  left: number;
  width: number;
};

function placeSubscribeMenu(anchor: DOMRect, menu: DOMRect | null): MenuCoords {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(menu?.width || MENU_MIN_WIDTH, vw - VIEWPORT_PAD * 2);
  const height = menu?.height || 260;

  const spaceBelow = vh - anchor.bottom - VIEWPORT_PAD;
  const spaceAbove = anchor.top - VIEWPORT_PAD;
  const placeAbove = spaceBelow < height + MENU_GAP && spaceAbove > spaceBelow;

  let top = placeAbove ? anchor.top - MENU_GAP - height : anchor.bottom + MENU_GAP;
  top = Math.min(Math.max(top, VIEWPORT_PAD), Math.max(VIEWPORT_PAD, vh - height - VIEWPORT_PAD));

  let left = anchor.right - width;
  left = Math.min(Math.max(left, VIEWPORT_PAD), Math.max(VIEWPORT_PAD, vw - width - VIEWPORT_PAD));

  return { top, left, width };
}

function SpecialRequestsOrb({ profileSlug }: { profileSlug: string }) {
  const tipId = useId();
  const router = useRouter();
  const orbRef = useRef<HTMLDivElement>(null);
  const freeRef = useRef(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [free, setFree] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    function onPointerMove(event: PointerEvent) {
      const drag = dragRef.current;
      if (!drag || event.pointerId !== drag.pointerId) return;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      if (!drag.moved && dx * dx + dy * dy > 9) {
        drag.moved = true;
        freeRef.current = true;
        setFree(true);
        setDragging(true);
      }
      const size = orbRef.current?.offsetWidth || SPECIAL_REQUESTS_SIZE;
      setPos({
        x: Math.min(window.innerWidth - size - 8, Math.max(8, drag.originX + dx)),
        y: Math.min(window.innerHeight - size - 8, Math.max(8, drag.originY + dy)),
      });
    }

    function onPointerUp(event: PointerEvent) {
      const drag = dragRef.current;
      if (!drag || event.pointerId !== drag.pointerId) return;
      const wasClick = !drag.moved;
      dragRef.current = null;
      setDragging(false);
      try {
        orbRef.current?.releasePointerCapture(event.pointerId);
      } catch {
        /* already released */
      }
      if (wasClick) {
        router.push(`/feed/profile/${profileSlug}/requests`);
      }
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [profileSlug, router]);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || !orbRef.current) return;
    const rect = orbRef.current.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: rect.left,
      originY: rect.top,
      moved: false,
    };
    if (!freeRef.current) {
      setPos({ x: rect.left, y: rect.top });
    }
    orbRef.current.setPointerCapture(event.pointerId);
  }

  return (
    <div
      ref={orbRef}
      className={`profile-special-requests${free ? " is-free" : ""}${dragging ? " is-dragging" : ""}`}
      style={free && pos ? { left: pos.x, top: pos.y } : undefined}
      tabIndex={0}
      role="link"
      aria-label="Open special requests"
      aria-describedby={tipId}
      onPointerDown={onPointerDown}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          router.push(`/feed/profile/${profileSlug}/requests`);
        }
      }}
    >
      <span className="profile-special-requests__aura" aria-hidden="true">
        <span className="profile-special-requests__ring profile-special-requests__ring--a" />
        <span className="profile-special-requests__ring profile-special-requests__ring--b" />
        <span className="profile-special-requests__glow" />
      </span>
      <span className="profile-special-requests__icon" aria-hidden="true">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="8" width="18" height="4" rx="1" />
          <path d="M12 8v13" />
          <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
          <path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8" />
          <path d="M16.5 8a2.5 2.5 0 0 0 0-5C13 3 12 8 12 8" />
        </svg>
      </span>
      <span id={tipId} className="profile-special-requests__popover" role="tooltip">
        <span className="profile-special-requests__badge">Available now</span>
        <strong className="profile-special-requests__title">Special Requests</strong>
        <span className="profile-special-requests__lead">Make your next moment one-of-a-kind.</span>
        <span className="profile-special-requests__copy">
          Book personalized messages, private coaching, or live appearances for races and celebrations.
        </span>
        <span className="profile-special-requests__perks">
          <span className="profile-special-requests__perk">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Messages
          </span>
          <span className="profile-special-requests__perk">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
            Coaching
          </span>
          <span className="profile-special-requests__perk">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Events
          </span>
        </span>
      </span>
    </div>
  );
}

function ProfileSubscribedPill({
  creatorName,
  notificationLevel,
  onNotificationLevelChange,
  onUnsubscribe,
  busy = false,
}: {
  creatorName: string;
  notificationLevel: NotificationLevel;
  onNotificationLevelChange: (level: NotificationLevel) => void;
  onUnsubscribe: () => void;
  busy?: boolean;
}) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<MenuCoords | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!menuOpen) {
      setCoords(null);
      return;
    }

    function updatePosition() {
      const anchor = triggerRef.current?.getBoundingClientRect();
      if (!anchor) return;
      const menu = menuRef.current?.getBoundingClientRect() ?? null;
      setCoords(placeSubscribeMenu(anchor, menu));
    }

    updatePosition();
    const frame = window.requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setMenuOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  function handleMenuSelect(id: NotificationLevel | "unsubscribe") {
    if (id === "unsubscribe") {
      onUnsubscribe();
      setMenuOpen(false);
      return;
    }

    onNotificationLevelChange(id);
    setMenuOpen(false);
  }

  function toggleMenu() {
    if (menuOpen) {
      setMenuOpen(false);
      return;
    }
    const anchor = triggerRef.current?.getBoundingClientRect();
    if (anchor) setCoords(placeSubscribeMenu(anchor, null));
    setMenuOpen(true);
  }

  const bellLabel =
    notificationLevel === "all"
      ? "All notifications on"
      : notificationLevel === "personalized"
        ? "Personalized notifications on"
        : "Notifications off";

  const menuStyle: CSSProperties = {
    top: coords?.top ?? 0,
    left: coords?.left ?? 0,
    width: coords?.width ?? MENU_MIN_WIDTH,
    visibility: coords ? "visible" : "hidden",
  };

  return (
    <div ref={rootRef} className="profile-subscribed-pill">
      <button
        type="button"
        className="profile-subscribed-pill__bell"
        aria-label={bellLabel}
        title={bellLabel}
        onClick={() => {
          const next =
            notificationLevel === "all"
              ? "none"
              : notificationLevel === "personalized"
                ? "all"
                : "personalized";
          onNotificationLevelChange(next);
        }}
        disabled={busy}
      >
        {notificationLevel === "none" ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            <path d="M18.63 13A17.89 17.89 0 0 1 18 8" />
            <path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14" />
            <path d="M18 8a6 6 0 0 0-9.33-5" />
            <line x1="2" y1="2" x2="22" y2="22" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 22c1.1 0 2-.9 2-2h-4a2 2 0 0 0 2 2zm6-6V9c0-3.07-1.63-5.64-4.5-6.32V2h-3v.68C7.64 3.36 6 5.92 6 9v7l-2 2v1h16v-1l-2-2z" />
          </svg>
        )}
      </button>

      <span className="profile-subscribed-pill__divider" aria-hidden="true" />

      <div className="profile-subscribed-pill__menu-wrap">
        <button
          ref={triggerRef}
          type="button"
          className="profile-subscribed-pill__menu-trigger"
          aria-label={`Subscription options for ${creatorName}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          disabled={busy}
          onClick={toggleMenu}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <circle cx="8" cy="3.25" r="1.5" />
            <circle cx="8" cy="8" r="1.5" />
            <circle cx="8" cy="12.75" r="1.5" />
          </svg>
        </button>

        {mounted && menuOpen
          ? createPortal(
              <div
                ref={menuRef}
                className="profile-subscribed-pill__menu"
                id={menuId}
                role="menu"
                aria-label={`${creatorName} subscription options`}
                style={menuStyle}
              >
                <p className="profile-subscribed-pill__menu-label">Notify me about</p>
                {SUBSCRIBE_MENU_ITEMS.slice(0, 3).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`profile-subscribed-pill__menu-item${notificationLevel === item.id ? " is-selected" : ""}`}
                    role="menuitemradio"
                    aria-checked={notificationLevel === item.id}
                    onClick={() => handleMenuSelect(item.id)}
                  >
                    <span className="profile-subscribed-pill__menu-item-copy">
                      <span className="profile-subscribed-pill__menu-item-title">{item.label}</span>
                      {item.description ? (
                        <span className="profile-subscribed-pill__menu-item-desc">{item.description}</span>
                      ) : null}
                    </span>
                    {notificationLevel === item.id ? (
                      <svg className="profile-subscribed-pill__menu-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    ) : null}
                  </button>
                ))}
                <div className="profile-subscribed-pill__menu-separator" role="separator" />
                <button
                  type="button"
                  className="profile-subscribed-pill__menu-item profile-subscribed-pill__menu-item--danger"
                  role="menuitem"
                  onClick={() => handleMenuSelect("unsubscribe")}
                >
                  <span className="profile-subscribed-pill__menu-item-title">Unsubscribe</span>
                </button>
              </div>,
              document.body,
            )
          : null}
      </div>
    </div>
  );
}

function ProfileToolbar({
  onCover,
  className,
  cartCount,
  onOpenCart,
}: {
  onCover: boolean;
  className?: string;
  cartCount?: number;
  onOpenCart?: () => void;
}) {
  const showCart = typeof cartCount === "number" && onOpenCart;

  return (
    <div className={className}>
      <Link
        href="/feed"
        className={`profile-back btn btn--sm btn--icon${onCover ? " btn--ghost-cover" : " btn--secondary"}`}
        aria-label="Back to feed"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
        </svg>
      </Link>
      <div className="profile-utility-actions" aria-label="Profile utilities">
        {showCart ? (
          <button
            type="button"
            className="btn btn--warning btn--sm collection-cart"
            aria-label={`Shopping bag, ${cartCount === 1 ? "1 item" : `${cartCount} items`}`}
            aria-haspopup="dialog"
            onClick={onOpenCart}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            <span className="collection-cart__label">
              {cartCount === 1 ? "1 item" : `${cartCount} items`}
            </span>
          </button>
        ) : null}
        <button
          type="button"
          className={`btn btn--sm btn--icon${onCover ? " btn--ghost-cover" : " btn--secondary"}`}
          aria-label="Share profile"
        >
          <ShareIcon size={16} />
        </button>
      </div>
    </div>
  );
}

export default function ProfileHeader({ profile }: { profile: ProfileData }) {
  const [following, setFollowing] = useState(profile.relationship?.following ?? false);
  const [subscribed, setSubscribed] = useState(profile.relationship?.subscribed ?? false);
  const [notifyLevel, setNotifyLevel] = useState<NotificationLevel>("personalized");
  const [subscriptionBusy, setSubscriptionBusy] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<CollectionCartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const handle = profile.handle.startsWith("@") ? profile.handle : `@${profile.handle}`;
  const hasCover = Boolean(profile.cover_url);
  const hasSubscription = Boolean(profile.subscription);
  const hasCollection = profile.collection.length > 0;
  const cartCount = cartItemCount(cartItems);

  useEffect(() => {
    if (!hasCollection) return;
    setCartItems(readCollectionCart(profile.slug));
  }, [hasCollection, profile.slug]);

  useEffect(() => {
    setSubscribed(profile.relationship?.subscribed ?? false);
  }, [profile.relationship?.subscribed, profile.slug]);

  useEffect(() => {
    if (!hasSubscription) return;
    let cancelled = false;
    fetch(`/api/feed/subscriptions/${profile.slug}`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then(
        (
          data: {
            subscribed?: boolean;
            notifyLevel?: string;
          } | null,
        ) => {
          if (cancelled || !data) return;
          if (typeof data.subscribed === "boolean") setSubscribed(data.subscribed);
          if (data.notifyLevel === "all" || data.notifyLevel === "personalized" || data.notifyLevel === "none") {
            setNotifyLevel(data.notifyLevel);
          }
        },
      )
      .catch(() => {
        // Keep SSR subscription state.
      });
    return () => {
      cancelled = true;
    };
  }, [hasSubscription, profile.slug]);

  function updateCart(next: CollectionCartItem[]) {
    setCartItems(next);
    writeCollectionCart(profile.slug, next);
  }

  async function postSubscription(action: "subscribe" | "unsubscribe" | "notify", level?: NotificationLevel) {
    setSubscriptionBusy(true);
    setSubscriptionError(null);
    try {
      const response = await fetch(`/api/feed/subscriptions/${profile.slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          notifyLevel: level ?? notifyLevel,
        }),
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
        subscribed?: boolean;
        notifyLevel?: string;
      } | null;
      if (response.status === 401) {
        throw new Error("Sign in to manage your subscription.");
      }
      if (!response.ok) {
        throw new Error(data?.error || "Could not update subscription.");
      }
      setSubscribed(Boolean(data?.subscribed));
      if (data?.notifyLevel === "all" || data?.notifyLevel === "personalized" || data?.notifyLevel === "none") {
        setNotifyLevel(data.notifyLevel);
      }
    } catch (error) {
      setSubscriptionError(error instanceof Error ? error.message : "Could not update subscription.");
    } finally {
      setSubscriptionBusy(false);
    }
  }

  return (
    <>
      <header className={`profile-header${hasCover ? "" : " profile-header--no-cover"}`} id="profile-top">
        {hasCover ? (
          <div className="profile-header__cover">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={profile.cover_url!} alt="" width={1400} height={320} />
            <div className="profile-header__cover-fade" aria-hidden="true" />
            <ProfileToolbar
              onCover
              className="profile-header__cover-nav"
              cartCount={hasCollection ? cartCount : undefined}
              onOpenCart={hasCollection ? () => setCartOpen(true) : undefined}
            />
          </div>
        ) : (
          <ProfileToolbar
            onCover={false}
            className="profile-header__toolbar"
            cartCount={hasCollection ? cartCount : undefined}
            onOpenCart={hasCollection ? () => setCartOpen(true) : undefined}
          />
        )}

        <div className="profile-header__panel">
          <div className="profile-header__identity" aria-labelledby="creator-name">
            <div
              className="story-avatar profile-header__avatar"
              style={{ "--story-color": profile.avatar_color } as React.CSSProperties}
            >
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt={profile.name} width={88} height={88} />
              ) : (
                profile.avatar_initials
              )}
            </div>
            <div className="profile-header__info">
              <h1 id="creator-name">{profile.name}</h1>
              <p className="profile-header__meta">
                <span>{handle}</span>
                {profile.verified ? (
                  <>
                    <span className="profile-header__dot" aria-hidden="true">
                      ·
                    </span>
                    <span className="profile-header__verified">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                      Verified
                    </span>
                  </>
                ) : null}
              </p>
              <p className="profile-header__stats">
                <span>
                  <strong>{profile.stats.followers}</strong> followers
                </span>
                <span className="profile-header__dot" aria-hidden="true">
                  ·
                </span>
                <span>
                  <strong>{profile.stats.following.toLocaleString()}</strong> following
                </span>
                {hasSubscription ? (
                  <>
                    <span className="profile-header__dot" aria-hidden="true">
                      ·
                    </span>
                    <span>
                      <strong>{profile.stats.subscribers.toLocaleString()}</strong> subscribers
                    </span>
                  </>
                ) : null}
                <span className="profile-header__dot" aria-hidden="true">
                  ·
                </span>
                <span>
                  <strong>{profile.stats.posts.toLocaleString()}</strong> posts
                </span>
              </p>
            </div>
          </div>

          <p className="profile-header__bio">{profile.bio}</p>

          <div className="profile-header__footer">
            <div className="profile-header__actions" aria-label="Profile actions">
              {hasSubscription ? (
                subscribed ? (
                  <ProfileSubscribedPill
                    creatorName={profile.name}
                    notificationLevel={notifyLevel}
                    busy={subscriptionBusy}
                    onNotificationLevelChange={(level) => {
                      void postSubscription("notify", level);
                    }}
                    onUnsubscribe={() => {
                      void postSubscription("unsubscribe");
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    className="btn btn--warning btn--sm profile-header__subscribe"
                    disabled={subscriptionBusy}
                    onClick={() => {
                      void postSubscription("subscribe");
                    }}
                  >
                    {profile.subscription!.price_label}
                  </button>
                )
              ) : null}
              <FollowButton
                following={following}
                onFollowingChange={setFollowing}
                className={`btn btn--sm profile-header__follow${following ? " btn--outline-brand is-active" : " btn--secondary"}`}
                name={profile.name}
              />
              {hasCollection ? (
                <Link
                  href={`/feed/profile/${profile.slug}/collection`}
                  className="btn btn--secondary btn--sm btn--icon"
                  aria-label="View collection"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                </Link>
              ) : null}
              <button
                type="button"
                className="btn btn--secondary btn--sm btn--icon profile-header__message"
                aria-label="Message"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </button>
            </div>
          </div>

          {subscriptionError ? (
            <p className="profile-header__subscription-error" role="alert">
              {subscriptionError}
            </p>
          ) : null}

          {profile.special_requests ? <SpecialRequestsOrb profileSlug={profile.slug} /> : null}
        </div>
      </header>

      {hasCollection ? (
        <CollectionCartDrawer
          open={cartOpen}
          items={cartItems}
          profileSlug={profile.slug}
          checkoutHref={`/feed/profile/${profile.slug}/collection/checkout`}
          onClose={() => setCartOpen(false)}
          onChangeItems={updateCart}
        />
      ) : null}
    </>
  );
}
