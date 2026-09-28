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

const numberFormat = new Intl.NumberFormat("en-GB");

export function formatCount(value: number) {
  return numberFormat.format(value);
}

export function percent(part: number, whole: number) {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

export function StatCard({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="settings-stat">
      <p className="settings-stat__label">{label}</p>
      <p className="settings-stat__value">{formatCount(value)}</p>
      <p className="settings-stat__detail">{detail}</p>
    </div>
  );
}

export function DashboardCard({
  title,
  children,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <section className={`settings-card${wide ? " settings-card--wide" : ""}`}>
      <h2 className="settings-card__title">{title}</h2>
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
                {renderIcon?.(segment)}
                {segment.label}
              </span>
              <span className="settings-breakdown__count">
                {formatCount(segment.count)}
                <span className="settings-breakdown__share"> · {share}%</span>
              </span>
            </div>
            <div className="settings-breakdown__track" aria-hidden="true">
              <span className="settings-breakdown__fill" style={{ width: `${share}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function DailyTrend({ days, noun }: { days: DashboardDay[]; noun: [singular: string, plural: string] }) {
  const max = Math.max(1, ...days.map((day) => day.count));

  return (
    <ol className="settings-trend" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
      {days.map((day) => (
        <li
          key={day.date}
          className="settings-trend__day"
          aria-label={`${day.label}: ${day.count} ${day.count === 1 ? noun[0] : noun[1]}`}
        >
          <span className="settings-trend__count" aria-hidden="true">
            {day.count > 0 ? formatCount(day.count) : ""}
          </span>
          <span className="settings-trend__bar-wrap" aria-hidden="true">
            <span
              className={`settings-trend__bar${day.count === 0 ? " is-empty" : ""}`}
              style={{ height: `${Math.max(4, (day.count / max) * 100)}%` }}
            />
          </span>
          <span className="settings-trend__label" aria-hidden="true">
            {day.label}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function formatShortDate(date: Date) {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
