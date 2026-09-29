import type { ReactNode } from "react";

export type DashboardSegment = {
  key: string;
  label: string;
  count: number;
};

export type DashboardDay = {
  date: string;
  label: string;
  count: number;
};

export type DashboardTone = "blue" | "green" | "violet" | "amber" | "teal" | "rose";

const numberFormat = new Intl.NumberFormat("en-GB");

export function formatCount(value: number) {
  return numberFormat.format(value);
}

export function percent(part: number, whole: number) {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

const ICONS = {
  users: (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  userPlus: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <path d="M20 8v6M23 11h-6" />
    </>
  ),
  activity: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />,
  mail: (
    <>
      <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
      <polyline points="22 6 12 13 2 6" />
    </>
  ),
  checkCircle: (
    <>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </>
  ),
  posts: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M16 13H8M16 17H8" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </>
  ),
  lock: (
    <>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <path d="M1 1l22 22" />
    </>
  ),
  chart: <path d="M18 20V10M12 20V4M6 20v-6" />,
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </>
  ),
  family: (
    <>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </>
  ),
  login: (
    <>
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <path d="M15 12H3" />
    </>
  ),
  tag: (
    <>
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <path d="M7 7h.01" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </>
  ),
  heart: (
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  ),
  star: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />,
} satisfies Record<string, ReactNode>;

export type DashboardIconName = keyof typeof ICONS;

export function DashboardIcon({ name }: { name: DashboardIconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  );
}

const AVATAR_TONES: DashboardTone[] = ["blue", "green", "violet", "amber", "teal", "rose"];

export function DashboardAvatar({ name }: { name: string }) {
  const words = name.replace(/[^\p{L}\p{N}\s]/gu, " ").trim().split(/\s+/).filter(Boolean);
  const initials = (words.length > 1 ? words[0][0] + words[words.length - 1][0] : (words[0] ?? "?").slice(0, 2))
    .toUpperCase();
  const hash = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return (
    <span className={`settings-avatar settings-tone--${AVATAR_TONES[hash % AVATAR_TONES.length]}`} aria-hidden="true">
      {initials}
    </span>
  );
}

export function StatCard({
  label,
  value,
  detail,
  icon,
  tone,
}: {
  label: string;
  value: number;
  detail: string;
  icon: DashboardIconName;
  tone: DashboardTone;
}) {
  return (
    <div className={`settings-stat settings-tone--${tone}`}>
      <div className="settings-stat__head">
        <p className="settings-stat__label">{label}</p>
        <span className="settings-stat__icon">
          <DashboardIcon name={icon} />
        </span>
      </div>
      <p className="settings-stat__value">{formatCount(value)}</p>
      <p className="settings-stat__detail">{detail}</p>
    </div>
  );
}

export function DashboardCard({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon?: DashboardIconName;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="settings-card settings-dash-card">
      <header className="settings-dash-card__head">
        <h2 className="settings-card__title">
          {icon ? (
            <span className="settings-dash-card__icon">
              <DashboardIcon name={icon} />
            </span>
          ) : null}
          {title}
        </h2>
        {action}
      </header>
      {children}
    </section>
  );
}

export function BreakdownList({
  segments,
  total,
  renderIcon,
}: {
  segments: DashboardSegment[];
  total: number;
  renderIcon?: (segment: DashboardSegment) => ReactNode;
}) {
  return (
    <ul className="settings-breakdown">
      {segments.map((segment) => {
        const share = percent(segment.count, total);
        return (
          <li key={segment.key} className="settings-breakdown__row">
            <div className="settings-breakdown__meta">
              <span className="settings-breakdown__label">
                {renderIcon ? renderIcon(segment) : <span className="settings-breakdown__dot" aria-hidden="true" />}
                {segment.label}
              </span>
              <span className="settings-breakdown__count">
                {formatCount(segment.count)}
                <span className="settings-breakdown__share">{share}%</span>
              </span>
            </div>
            <div className="settings-breakdown__track" aria-hidden="true">
              <span className="settings-breakdown__fill" style={{ width: `${Math.max(share, segment.count > 0 ? 1 : 0)}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function DailyTrend({ days, noun }: { days: DashboardDay[]; noun: [singular: string, plural: string] }) {
  const max = Math.max(1, ...days.map((day) => day.count));
  const total = days.reduce((sum, day) => sum + day.count, 0);
  const peak = days.reduce((best, day) => (day.count > best.count ? day : best), days[0]);
  const average = days.length ? total / days.length : 0;
  const labelStep = Math.max(1, Math.ceil(days.length / 7));
  const plural = (count: number) => (count === 1 ? noun[0] : noun[1]);

  return (
    <div className="settings-trend-wrap">
      <dl className="settings-trend-summary">
        <div>
          <dt>Total</dt>
          <dd>{formatCount(total)}</dd>
        </div>
        <div>
          <dt>Daily average</dt>
          <dd>{average.toLocaleString("en-GB", { maximumFractionDigits: 1 })}</dd>
        </div>
        <div>
          <dt>Busiest day</dt>
          <dd>{peak && peak.count > 0 ? `${peak.label} · ${formatCount(peak.count)}` : "None yet"}</dd>
        </div>
      </dl>

      <div className="settings-trend-chart">
        <div className="settings-trend__grid" aria-hidden="true">
          <span data-value={formatCount(max)} />
          <span data-value={formatCount(Math.round(max / 2))} />
          <span data-value="0" />
        </div>
        <ol className="settings-trend" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
          {days.map((day, index) => (
            <li
              key={day.date}
              className={`settings-trend__day${day === peak && day.count > 0 ? " is-peak" : ""}`}
              aria-label={`${day.label}: ${day.count} ${plural(day.count)}`}
            >
              <span className="settings-trend__bar-wrap" aria-hidden="true">
                <span
                  className={`settings-trend__bar${day.count === 0 ? " is-empty" : ""}`}
                  style={{ height: day.count === 0 ? undefined : `${Math.max(3, (day.count / max) * 100)}%` }}
                >
                  <span className="settings-trend__tip">
                    <span>
                      <strong>{formatCount(day.count)}</strong> {plural(day.count)}
                    </span>
                    <span className="settings-trend__tip-date">{day.label}</span>
                  </span>
                </span>
              </span>
              <span className="settings-trend__label" aria-hidden="true">
                {(days.length - 1 - index) % labelStep === 0 ? day.label : ""}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export function formatShortDate(date: Date) {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
