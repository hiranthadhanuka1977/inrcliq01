import Link from "next/link";
import {
  formatCompactCount,
  formatCompactMoney,
  type CollectionSummaryStats,
  type DailyViewPoint,
  type ServiceRequestsSummaryStats,
} from "@/lib/seller/dashboard-stats";

type DashboardStat = {
  label: string;
  value: string;
  hint?: string;
};

const BASE_CARDS = [
  {
    id: "collection" as const,
    href: "/seller/collection",
    title: "Collection",
    text: "Manage products, pricing, and what’s available in your storefront.",
    requiresSpecialRequests: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  },
  {
    id: "service-requests" as const,
    href: "/seller/service-requests",
    title: "Service requests",
    text: "Set up how fans book you — offerings, availability, and request flow.",
    requiresSpecialRequests: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <path d="m9 16 2 2 4-4" />
      </svg>
    ),
  },
] as const;

function collectionStatsList(stats: CollectionSummaryStats): DashboardStat[] {
  return [
    {
      label: "Products",
      value: formatCompactCount(stats.products),
      hint:
        stats.products > 0
          ? `${stats.physical} physical · ${stats.digital} digital`
          : "None listed yet",
    },
    {
      label: "Sold",
      value: formatCompactCount(stats.sold),
      hint: stats.sold > 0 ? "From product sold labels" : "No sales signal yet",
    },
    {
      label: "Rating",
      value: stats.rating > 0 ? stats.rating.toFixed(1) : "—",
      hint: stats.onOffer > 0 ? `${stats.onOffer} on offer` : "Avg across products",
    },
  ];
}

function serviceRequestsStatsList(stats: ServiceRequestsSummaryStats): DashboardStat[] {
  return [
    {
      label: "Awaiting",
      value: formatCompactCount(stats.awaiting),
      hint: stats.awaiting > 0 ? "Need a response" : "Inbox clear",
    },
    {
      label: "Completed",
      value: formatCompactCount(stats.completed),
      hint:
        stats.activeCategories > 0
          ? `${stats.activeCategories} live categor${stats.activeCategories === 1 ? "y" : "ies"}`
          : "Accepted & delivered",
    },
    {
      label: "Earnings",
      value: formatCompactMoney(stats.earnings, stats.currency),
      hint: `${formatCompactCount(stats.liveOfferings)} live offering${
        stats.liveOfferings === 1 ? "" : "s"
      }`,
    },
  ];
}

function ServiceRequestsViewsChart({
  points,
  monthLabel,
  monthViews,
  currency,
}: {
  points: DailyViewPoint[];
  monthLabel: string;
  monthViews: number;
  currency: string;
}) {
  const maxViews = Math.max(...points.map((point) => point.views), 1);

  return (
    <div className="seller-dash-chart" aria-label={`Daily views for ${monthLabel}`}>
      <div className="seller-dash-chart__head">
        <div>
          <span className="seller-dash-card__stat-label">Views</span>
          <strong className="seller-dash-card__stat-value">
            {formatCompactCount(monthViews)}
          </strong>
        </div>
        <span className="seller-dash-card__stat-hint">{monthLabel} · 30 days</span>
      </div>
      <div
        className="seller-dash-chart__bars"
        role="img"
        aria-label={`Bar chart of daily service request views in ${monthLabel}`}
      >
        {points.map((point) => {
          const hasBar = point.views > 0;
          const monthName = monthLabel.split(" ")[0];
          return (
            <div
              key={point.day}
              className={`seller-dash-chart__bar-wrap${hasBar ? "" : " is-future"}`}
            >
              {hasBar ? (
                <>
                  <span
                    className="seller-dash-chart__bar"
                    style={{ height: `${Math.max((point.views / maxViews) * 100, 8)}%` }}
                  />
                  <span className="seller-dash-chart__tooltip" role="tooltip">
                    <strong>
                      {monthName} {point.label}
                    </strong>
                    <span>
                      {point.views} view{point.views === 1 ? "" : "s"}
                    </span>
                    <span>{formatCompactMoney(point.revenue, currency)} revenue</span>
                  </span>
                </>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SellerDashboard({
  firstName,
  hasSpecialRequests = false,
  collectionStats,
  serviceRequestsStats,
}: {
  firstName?: string | null;
  hasSpecialRequests?: boolean;
  collectionStats: CollectionSummaryStats;
  serviceRequestsStats?: ServiceRequestsSummaryStats | null;
}) {
  const name = firstName?.trim() || "Creator";
  const cards = BASE_CARDS.filter(
    (card) => !card.requiresSpecialRequests || hasSpecialRequests,
  );

  return (
    <section className="seller-panel" aria-labelledby="seller-dash-title">
      <div className="seller-panel__head">
        <h1 className="seller-panel__title" id="seller-dash-title">
          Seller dashboard
        </h1>
        <p className="seller-panel__subtitle">
          Welcome back, {name}. Manage your collection
          {hasSpecialRequests ? " and service request setup" : ""} from this portal.
        </p>
      </div>

      <div className="seller-dash-grid">
        {cards.map((card) => {
          const stats =
            card.id === "collection"
              ? collectionStatsList(collectionStats)
              : serviceRequestsStats
                ? serviceRequestsStatsList(serviceRequestsStats)
                : null;
          const showViewsChart =
            card.id === "service-requests" && serviceRequestsStats
              ? serviceRequestsStats.dailyViews.length > 0
              : false;

          return (
            <Link
              key={card.href}
              href={card.href}
              className={`seller-dash-card${showViewsChart ? " seller-dash-card--with-chart" : ""}`}
            >
              <div className="seller-dash-card__top">
                <span className="seller-dash-card__icon" aria-hidden="true">
                  {card.icon}
                </span>
                <div className="seller-dash-card__copy">
                  <h2 className="seller-dash-card__title">{card.title}</h2>
                  <p className="seller-dash-card__text">{card.text}</p>
                </div>
              </div>

              {stats ? (
                <div className="seller-dash-card__metrics">
                  <div className="seller-dash-card__stats" aria-label={`${card.title} summary`}>
                    {stats.map((stat) => (
                      <div key={stat.label} className="seller-dash-card__stat">
                        <span className="seller-dash-card__stat-label">{stat.label}</span>
                        <strong className="seller-dash-card__stat-value">{stat.value}</strong>
                        {stat.hint ? (
                          <span className="seller-dash-card__stat-hint">{stat.hint}</span>
                        ) : null}
                      </div>
                    ))}
                  </div>

                  {showViewsChart && serviceRequestsStats ? (
                    <ServiceRequestsViewsChart
                      points={serviceRequestsStats.dailyViews}
                      monthLabel={serviceRequestsStats.monthLabel}
                      monthViews={serviceRequestsStats.monthViews}
                      currency={serviceRequestsStats.currency}
                    />
                  ) : null}
                </div>
              ) : null}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
