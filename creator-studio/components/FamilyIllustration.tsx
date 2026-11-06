import type { ReactNode } from "react";
import type { FamilyId } from "../lib/labels";

const ink = "#1a1a1a";
const line = 2.6;
const skin = "#ffd3c4";
const blush = "#ff8ea6";

function Frame({
  id,
  from,
  to,
  paints = [],
  children,
}: {
  id: string;
  from: string;
  to: string;
  paints?: { name: string; from: string; to: string }[];
  children: ReactNode;
}) {
  const clip = `${id}-clip`;
  return (
    <svg viewBox="0 0 200 150" aria-hidden="true" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
        {paints.map((paint) => (
          <linearGradient key={paint.name} id={`${id}-${paint.name}`} x1="0" y1="0" x2="0.2" y2="1">
            <stop offset="0%" stopColor={paint.from} />
            <stop offset="100%" stopColor={paint.to} />
          </linearGradient>
        ))}
        <clipPath id={clip}>
          <rect x="2" y="2" width="196" height="146" rx="26" />
        </clipPath>
      </defs>
      <rect x="2" y="2" width="196" height="146" rx="26" fill={`url(#${id}-bg)`} />
      <g clipPath={`url(#${clip})`}>{children}</g>
      <rect x="2" y="2" width="196" height="146" rx="26" stroke={ink} strokeWidth={line} />
    </svg>
  );
}

function Person({
  cx,
  hair,
  shirt,
  mood = "smile",
}: {
  cx: number;
  hair: string;
  shirt: string;
  mood?: "smile" | "calm";
}) {
  const cy = 82;
  return (
    <g>
      <circle cx={cx - 30} cy={cy + 2} r="8" fill={skin} stroke={ink} strokeWidth={line} />
      <circle cx={cx + 30} cy={cy + 2} r="8" fill={skin} stroke={ink} strokeWidth={line} />
      <path d={`M${cx - 46} 122c10-26 82-26 92 0v36h-92z`} fill={shirt} stroke={ink} strokeWidth={line} />
      <rect x={cx - 10} y={cy + 24} width="20" height="16" fill={skin} />
      <circle cx={cx} cy={cy} r="30" fill={skin} stroke={ink} strokeWidth={line} />
      <path
        d={`M${cx - 26} ${cy - 8} C ${cx - 34} ${cy - 28}, ${cx - 18} ${cy - 52}, ${cx} ${cy - 50} C ${cx + 20} ${cy - 52}, ${cx + 34} ${cy - 26}, ${cx + 26} ${cy - 8} C ${cx + 14} ${cy + 2}, ${cx + 6} ${cy - 14}, ${cx} ${cy - 6} C ${cx - 6} ${cy - 14}, ${cx - 14} ${cy + 2}, ${cx - 26} ${cy - 8} Z`}
        fill={hair}
        stroke={ink}
        strokeWidth={line}
      />
      {mood === "smile" ? (
        <>
          <ellipse cx={cx - 11} cy={cy + 2} rx="2.4" ry="3.2" fill={ink} />
          <ellipse cx={cx + 11} cy={cy + 2} rx="2.4" ry="3.2" fill={ink} />
          <path d={`M${cx - 12} ${cy + 14}q12 11 24 0`} stroke={ink} strokeWidth="2.4" />
        </>
      ) : (
        <>
          <path d={`M${cx - 17} ${cy + 2}q6 7 12 0`} stroke={ink} strokeWidth="2.4" />
          <path d={`M${cx + 5} ${cy + 2}q6 7 12 0`} stroke={ink} strokeWidth="2.4" />
          <path d={`M${cx - 8} ${cy + 16}q8 7 16 0`} stroke={ink} strokeWidth="2.4" />
        </>
      )}
      <circle cx={cx - 21} cy={cy + 12} r="4.2" fill={blush} />
      <circle cx={cx + 21} cy={cy + 12} r="4.2" fill={blush} />
    </g>
  );
}

export default function FamilyIllustration({ id }: { id: FamilyId }) {
  switch (id) {
    case "SHORT":
      return (
        <Frame
          id={id}
          from="#ffe7a8"
          to="#ffb020"
          paints={[
            { name: "hair", from: "#b3a6ff", to: "#5b4de0" },
            { name: "screen", from: "#4a4a4a", to: "#1a1a1a" },
          ]}
        >
          <g transform="rotate(-8 42 72)">
            <rect x="24" y="34" width="36" height="66" rx="8" fill="#fff" stroke={ink} strokeWidth={line} />
            <rect x="29" y="42" width="26" height="44" rx="3" fill={`url(#${id}-screen)`} />
            <path d="M38 58l10 6-10 6z" fill="#fff" />
            <circle cx="42" cy="40" r="2.2" fill="#ff4d5e" />
          </g>
          <path d="M108 118c-16-6-28-4-40-16 8 2 14 12 22 16 6 8 14 10 18 0z" fill={skin} stroke={ink} strokeWidth={line} />
          <Person cx={132} hair={`url(#${id}-hair)`} shirt="#fff" />
          <circle cx="66" cy="104" r="11" fill={skin} stroke={ink} strokeWidth={line} />
        </Frame>
      );
    case "VIDEO":
      return (
        <Frame
          id={id}
          from="#ffc2d4"
          to="#ff6d93"
          paints={[
            { name: "lens", from: "#d7f3ff", to: "#4aa8e8" },
            { name: "grip", from: "#ff8fa3", to: "#ff3d62" },
          ]}
        >
          <rect x="28" y="64" width="108" height="56" rx="16" fill="#fff" stroke={ink} strokeWidth={line} />
          <circle cx="74" cy="92" r="18" fill="#242424" stroke={ink} strokeWidth={line} />
          <circle cx="74" cy="92" r="9" fill={`url(#${id}-lens)`} stroke={ink} strokeWidth={line} />
          <circle cx="70" cy="88" r="3" fill="#fff" />
          <path d="M136 78l32-12v48l-32-12z" fill="#242424" stroke={ink} strokeWidth={line} />
          <rect x="52" y="46" width="50" height="18" rx="8" fill={`url(#${id}-grip)`} stroke={ink} strokeWidth={line} />
          <circle cx="168" cy="36" r="7" fill="#ffe56a" stroke={ink} strokeWidth={line} />
        </Frame>
      );
    case "PODCAST":
      return (
        <Frame
          id={id}
          from="#e6d9ff"
          to="#9b7cf0"
          paints={[{ name: "shirt", from: "#ffc2ad", to: "#ff6a45" }]}
        >
          <path d="M76 78c0-34 68-34 68 0" stroke={ink} strokeWidth="7" />
          <Person cx={110} hair="#3a3550" shirt={`url(#${id}-shirt)`} />
          <circle cx="76" cy="84" r="10" fill="#1a1a1a" stroke={ink} strokeWidth={line} />
          <circle cx="144" cy="84" r="10" fill="#1a1a1a" stroke={ink} strokeWidth={line} />
          <rect x="104" y="118" width="6" height="22" rx="3" fill={ink} />
          <circle cx="107" cy="116" r="13" fill="#fff" stroke={ink} strokeWidth={line} />
          <path d="M101 112v8M107 110v12M113 112v8" stroke={ink} strokeWidth="1.8" />
        </Frame>
      );
    case "AUDIOBOOK":
      return (
        <Frame
          id={id}
          from="#d5e4ff"
          to="#6f97f0"
          paints={[
            { name: "hair", from: "#ffd0a2", to: "#e07a32" },
            { name: "page", from: "#fff7df", to: "#ffd27a" },
          ]}
        >
          <circle cx="78" cy="62" r="24" fill={skin} stroke={ink} strokeWidth={line} />
          <path
            d="M56 54 C52 36, 66 22, 78 24 C92 22, 106 36, 100 54 C90 46, 84 40, 78 48 C72 40, 66 46, 56 54 Z"
            fill={`url(#${id}-hair)`}
            stroke={ink}
            strokeWidth={line}
          />
          <ellipse cx="70" cy="62" rx="2" ry="2.6" fill={ink} />
          <ellipse cx="86" cy="62" rx="2" ry="2.6" fill={ink} />
          <path d="M72 70q6 6 12 0" stroke={ink} strokeWidth="2.2" />
          <circle cx="64" cy="68" r="3.2" fill={blush} />
          <circle cx="92" cy="68" r="3.2" fill={blush} />
          <path d="M18 78h70c8 0 12 8 12 16v56H40c-14 0-22-8-22-20V78z" fill="#fff" stroke={ink} strokeWidth={line} />
          <path d="M182 78h-70c-8 0-12 8-12 16v56h60c14 0 22-8 22-20V78z" fill={`url(#${id}-page)`} stroke={ink} strokeWidth={line} />
          <path d="M36 98h46M36 110h46M36 122h30" stroke={ink} strokeWidth="2.2" />
          <path d="M118 92c0-16 36-16 36 0" stroke={ink} strokeWidth="5" />
          <circle cx="118" cy="96" r="7" fill="#1a1a1a" stroke={ink} strokeWidth={line} />
          <circle cx="154" cy="96" r="7" fill="#1a1a1a" stroke={ink} strokeWidth={line} />
        </Frame>
      );
    case "MUSIC":
      return (
        <Frame
          id={id}
          from="#ffd7c2"
          to="#ff8a5c"
          paints={[
            { name: "hair", from: "#8eb4ff", to: "#2450e0" },
            { name: "phones", from: "#fff4b0", to: "#ffc107" },
          ]}
        >
          <ellipse cx="36" cy="112" rx="14" ry="11" fill="#1a1a1a" transform="rotate(-18 36 112)" />
          <rect x="46" y="50" width="6" height="64" rx="3" fill="#1a1a1a" />
          <path d="M52 52c16 6 18 16 18 16" stroke="#1a1a1a" strokeWidth="6" />
          <path d="M96 84c0-30 56-30 56 0" stroke={`url(#${id}-phones)`} strokeWidth="7" />
          <Person cx={124} hair={`url(#${id}-hair)`} shirt="#fff" />
          <circle cx="96" cy="90" r="9" fill={`url(#${id}-phones)`} stroke={ink} strokeWidth={line} />
          <circle cx="152" cy="90" r="9" fill={`url(#${id}-phones)`} stroke={ink} strokeWidth={line} />
        </Frame>
      );
    case "SOUND":
      return (
        <Frame
          id={id}
          from="#d8f8ec"
          to="#49c4a4"
          paints={[{ name: "hair", from: "#ffd0a2", to: "#e07a32" }]}
        >
          <circle cx="36" cy="36" r="11" fill="#fff7d6" stroke={ink} strokeWidth={line} />
          <Person cx={78} hair={`url(#${id}-hair)`} shirt="#fff" mood="calm" />
          <path d="M128 62c10 7 10 20 0 28" stroke={ink} strokeWidth="4.5" />
          <path d="M144 50c14 12 14 34 0 46" stroke={ink} strokeWidth="4.5" />
          <path d="M160 40c18 16 18 48 0 64" stroke={ink} strokeWidth="4.5" />
        </Frame>
      );
    case "PROMO":
      return (
        <Frame
          id={id}
          from="#d4e4ff"
          to="#4d84f5"
          paints={[
            { name: "mouth", from: "#ff9aa6", to: "#e23b4e" },
            { name: "star", from: "#fff4b0", to: "#ffc107" },
          ]}
        >
          <path d="M28 46l12 8M24 64l16 2M30 82l12-6" stroke="#d6ff6e" strokeWidth="4.5" />
          <g transform="rotate(-16 110 78)">
            <rect x="34" y="64" width="24" height="28" rx="6" fill="#1a1a1a" stroke={ink} strokeWidth={line} />
            <path d="M56 60h58l30-24v72l-30-24H56z" fill="#fff" stroke={ink} strokeWidth={line} />
            <rect x="136" y="40" width="20" height="56" rx="9" fill={`url(#${id}-mouth)`} stroke={ink} strokeWidth={line} />
          </g>
          <circle cx="50" cy="108" r="13" fill={skin} stroke={ink} strokeWidth={line} />
          <path d="M164 28l2.2 6.2 6.4.6-4.8 4.2 1.6 6.2-5.4-3.4-5.4 3.4 1.6-6.2-4.8-4.2 6.4-.6z" fill={`url(#${id}-star)`} stroke={ink} strokeWidth="1.8" />
        </Frame>
      );
    default:
      return null;
  }
}
