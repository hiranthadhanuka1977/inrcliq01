import type { ReactNode } from "react";
import type { SectionIcon } from "@/lib/admin-portal/sections";

function grad(id: string, from: string, to: string, x2 = 40, y2 = 44) {
  return (
    <linearGradient id={id} x1="8" y1="4" x2={x2} y2={y2} gradientUnits="userSpaceOnUse">
      <stop offset="0" stopColor={from} />
      <stop offset="1" stopColor={to} />
    </linearGradient>
  );
}

const MARKS: Record<SectionIcon, () => ReactNode> = {
  users: () => (
    <>
      <defs>
        {grad("ic-users-back", "#E4EDFF", "#8FB2F8", 44, 40)}
        {grad("ic-users-front", "#74A4FF", "#1D4ED8")}
      </defs>
      <circle cx="33.5" cy="14.5" r="5.6" fill="url(#ic-users-back)" />
      <rect x="25.5" y="21" width="16.5" height="15.5" rx="7.8" fill="url(#ic-users-back)" />
      <rect x="6.5" y="25" width="24" height="16.5" rx="8.2" fill="url(#ic-users-front)" />
      <circle cx="18.5" cy="17" r="7.4" fill="url(#ic-users-front)" />
    </>
  ),
  feed: () => (
    <>
      <defs>{grad("ic-feed", "#FFB199", "#E11D48", 42, 42)}</defs>
      <rect x="8" y="6" width="26" height="32" rx="6" fill="#FDBA9A" />
      <rect x="14" y="10" width="26" height="32" rx="6" fill="url(#ic-feed)" />
      <rect x="18" y="15" width="18" height="10" rx="2.5" fill="#fff" />
      <rect x="18" y="28.5" width="16" height="2.4" rx="1.2" fill="#fff" />
      <rect x="18" y="33.2" width="11" height="2.4" rx="1.2" fill="#fff" opacity="0.72" />
    </>
  ),
  payments: () => (
    <>
      <defs>
        {grad("ic-pay", "#6EE7B7", "#047857", 36, 40)}
        {grad("ic-coin", "#FDE68A", "#D97706", 44, 28)}
      </defs>
      <rect x="5" y="16" width="28" height="20" rx="4.5" fill="url(#ic-pay)" />
      <rect x="5" y="21" width="28" height="4.5" fill="#A7F3D0" />
      <rect x="9" y="28.5" width="7.5" height="4.2" rx="1.2" fill="#FEF3C7" />
      <circle cx="35" cy="16" r="8" fill="url(#ic-coin)" />
      <circle cx="35" cy="16" r="4.8" fill="none" stroke="#fff" strokeWidth="1.6" />
    </>
  ),
  creators: () => (
    <>
      <defs>{grad("ic-star", "#DDD6FE", "#6D28D9", 40, 42)}</defs>
      <path
        d="M24 4.5 28.9 16.1 41.2 17.2 31.7 25.6 34.6 37.8 24 31.4 13.4 37.8 16.3 25.6 6.8 17.2 19.1 16.1 24 4.5Z"
        fill="url(#ic-star)"
      />
      <path d="M38.2 6.2 39.3 9l2.9.3-2.2 1.9.7 2.8-2.5-1.5-2.5 1.5.7-2.8-2.2-1.9 2.9-.3 1.1-2.8Z" fill="#FDE68A" />
    </>
  ),
  audio: () => (
    <>
      <defs>{grad("ic-band", "#5EEAD4", "#0F766E", 40, 36)}</defs>
      <path
        d="M12 28V24.5C12 16.2 17.2 10 24 10s12 6.2 12 14.5V28"
        fill="none"
        stroke="url(#ic-band)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <rect x="5" y="23" width="10" height="17" rx="4.5" fill="url(#ic-band)" />
      <rect x="33" y="23" width="10" height="17" rx="4.5" fill="url(#ic-band)" />
    </>
  ),
  shop: () => (
    <>
      <defs>{grad("ic-bag", "#FDBA74", "#C2410C", 36, 44)}</defs>
      <path d="M15.5 18h17l-1.5 19.2a3.2 3.2 0 0 1-3.2 2.8h-7.6a3.2 3.2 0 0 1-3.2-2.8L15.5 18Z" fill="url(#ic-bag)" />
      <path
        d="M19 18.2v-2.8a5 5 0 0 1 10 0v2.8"
        fill="none"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </>
  ),
  requests: () => (
    <>
      <defs>
        {grad("ic-ticket", "#F9A8D4", "#BE185D", 42, 36)}
        <mask id="ic-ticket-cut">
          <rect width="48" height="48" fill="#fff" />
          <circle cx="8" cy="24" r="3.3" fill="#000" />
          <circle cx="40" cy="24" r="3.3" fill="#000" />
        </mask>
      </defs>
      <rect x="6" y="14" width="36" height="20" rx="4" fill="url(#ic-ticket)" mask="url(#ic-ticket-cut)" />
      <circle cx="18" cy="24" r="1.15" fill="#fff" />
      <circle cx="24" cy="24" r="1.15" fill="#fff" />
      <circle cx="30" cy="24" r="1.15" fill="#fff" />
    </>
  ),
  messaging: () => (
    <>
      <defs>{grad("ic-bubble", "#A5B4FC", "#312E81", 44, 40)}</defs>
      <rect x="5" y="7" width="24" height="17" rx="8" fill="#E0E7FF" />
      <path d="M12 22.5 10.5 29l7.2-5.2" fill="#E0E7FF" />
      <path
        d="M18 15h16a7 7 0 0 1 7 7v7a7 7 0 0 1-7 7h-8l-6.5 5.2V36H18a7 7 0 0 1-7-7v-7a7 7 0 0 1 7-7Z"
        fill="url(#ic-bubble)"
      />
      <circle cx="24.5" cy="25.5" r="1.55" fill="#fff" />
      <circle cx="29.5" cy="25.5" r="1.55" fill="#fff" />
      <circle cx="34.5" cy="25.5" r="1.55" fill="#fff" />
    </>
  ),
  safety: () => (
    <>
      <defs>{grad("ic-shield", "#FDA4AF", "#9F1239", 36, 44)}</defs>
      <path d="M24 5.5 39.5 12v12.2c0 8-6.2 13.8-15.5 16.8C14.7 38 8.5 32.2 8.5 24.2V12L24 5.5Z" fill="url(#ic-shield)" />
      <path
        d="M17.2 24.2 22 29.1 31.6 18.6"
        fill="none"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  subscriptions: () => (
    <>
      <defs>{grad("ic-medal", "#DDD6FE", "#6B21A8", 36, 44)}</defs>
      <path d="M16.5 6h5.2l-1.4 13h-5.4L16.5 6Z" fill="#C4B5FD" />
      <path d="M26.3 6h5.2l1.6 13h-5.4L26.3 6Z" fill="#7C3AED" />
      <circle cx="24" cy="29" r="12" fill="url(#ic-medal)" />
      <path
        d="M24 21.6 26 26l4.8.5-3.6 3.2 1.1 4.6L24 31.8l-4.3 2.5 1.1-4.6-3.6-3.2 4.8-.5 2-4.4Z"
        fill="#FDE68A"
      />
    </>
  ),
  notifications: () => (
    <>
      <defs>{grad("ic-bell", "#7DD3FC", "#0369A1", 34, 40)}</defs>
      <path
        d="M24 7.2c.8 0 1.4.7 1.4 1.5v1.1c4.6.8 7.8 4.4 7.8 8.8v4.8l2.4 4c.5.8-.1 1.8-1 1.8H13.4c-.9 0-1.5-1-.9-1.8l2.3-4v-4.8c0-4.4 3.2-8 7.8-8.8V8.7c0-.8.6-1.5 1.4-1.5Z"
        fill="url(#ic-bell)"
      />
      <path d="M20.4 32.8a3.6 3.6 0 0 0 7.2 0" fill="#0284C7" />
      <circle cx="35.2" cy="12.2" r="5.2" fill="#FB923C" />
      <circle cx="35.2" cy="12.2" r="5.2" fill="none" stroke="#fff" strokeWidth="1.6" />
    </>
  ),
  analytics: () => (
    <>
      <defs>{grad("ic-bar", "#93C5FD", "#1D4ED8", 44, 42)}</defs>
      <rect x="6" y="26" width="9" height="16" rx="2.5" fill="#BFDBFE" />
      <rect x="19.5" y="16" width="9" height="26" rx="2.5" fill="#60A5FA" />
      <rect x="33" y="6" width="9" height="36" rx="2.5" fill="url(#ic-bar)" />
    </>
  ),
  support: () => (
    <>
      <defs>
        {grad("ic-ring", "#5EEAD4", "#0F766E", 40, 42)}
        <mask id="ic-ring-cut">
          <rect width="48" height="48" fill="#fff" />
          <rect x="20.6" y="3" width="6.8" height="16" rx="2" fill="#000" />
          <rect x="20.6" y="29" width="6.8" height="16" rx="2" fill="#000" />
          <rect x="3" y="20.6" width="16" height="6.8" rx="2" fill="#000" />
          <rect x="29" y="20.6" width="16" height="6.8" rx="2" fill="#000" />
        </mask>
      </defs>
      <path
        fill="url(#ic-ring)"
        fillRule="evenodd"
        mask="url(#ic-ring-cut)"
        d="M24 6a18 18 0 1 0 .01 0ZM24 16.5a7.5 7.5 0 1 1-.01 0Z"
      />
    </>
  ),
};

export function SectionMark({ icon, size = 44 }: { icon: SectionIcon; size?: number }) {
  return (
    <span className="admin-mark" style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 48 48">{MARKS[icon]()}</svg>
    </span>
  );
}
