import { getCategoryReadiness } from "@/lib/seller/service-requests-helpers";
import type { RequestCategory } from "@/lib/feed/special-requests";
import type { SellerServiceRequestsConfig } from "@/lib/seller/service-requests-helpers";
import { AvailabilityBoard } from "./AvailabilityBoard";
import { PageSetup } from "./PageSetup";
import { RequestInbox, type InboxBooking } from "./RequestInbox";

export type ServiceSection = "offerings" | "requests" | "calendar" | "page";

function sectionHref(section: ServiceSection) {
  return section === "offerings" ? "/seller-pro/service-requests" : `/seller-pro/service-requests?section=${section}`;
}

function tone(category: RequestCategory) {
  const status = getCategoryReadiness(category).status;
  if (status === "ready") return "admin-lozenge admin-lozenge--success";
  if (status === "inactive") return "admin-lozenge";
  if (status === "empty" || status === "needs_setup") return "admin-lozenge admin-lozenge--warning";
  return "admin-lozenge admin-lozenge--info";
}

function statusLabel(category: RequestCategory) {
  const status = getCategoryReadiness(category).status;
  if (status === "ready") return "Live";
  if (status === "inactive") return "Paused";
  if (status === "empty") return "Add an offering";
  if (status === "needs_setup") return "Finish setup";
  return "Draft";
}

function offeringCount(category: RequestCategory) {
  const count = category.services.length;
  return count === 1 ? "1 offering" : `${count} offerings`;
}

const COPY: Record<ServiceSection, { title: string; body: string }> = {
  offerings: {
    title: "What fans can book",
    body: "Group requests into categories, then add an offering with a price inside each one.",
  },
  requests: {
    title: "Incoming requests",
    body: "Accept a request or decline it with a short reason. Open one to see the full brief.",
  },
  calendar: {
    title: "Your calendar",
    body: "Block days you cannot take a request. Booked days stay marked.",
  },
  page: {
    title: "Your request page",
    body: "The introduction fans read before they choose a category.",
  },
};

export function ServiceBoard({
  config,
  previewHref,
  section,
  bookings,
  unavailableDates,
  detailsBase,
}: {
  config: SellerServiceRequestsConfig;
  previewHref: string;
  section: ServiceSection;
  bookings: InboxBooking[];
  unavailableDates: string[];
  detailsBase: string;
}) {
  const waiting = bookings.filter((booking) => booking.status === "RECEIVED").length;
  const copy = COPY[section];
  const sections: Array<{ id: ServiceSection; label: string; count?: number }> = [
    { id: "offerings", label: "Offerings", count: config.content.categories.length },
    { id: "requests", label: "Requests", count: waiting },
    { id: "calendar", label: "Calendar" },
    { id: "page", label: "Page" },
  ];

  return (
    <>
      <div className="admin-pagehead">
        <div>
          <p className="admin-kicker">Service requests</p>
          <h1>{copy.title}</h1>
          <p>
            {config.enabled ? "Fans can open this page on your profile. " : "This page is hidden from your profile. "}
            {copy.body}
          </p>
        </div>
        <div className="studio-page-actions">
          {previewHref ? (
            <a className="admin-btn admin-btn--subtle" href={previewHref} target="_blank" rel="noreferrer">
              Preview
            </a>
          ) : null}
          {section === "offerings" ? (
            <a className="admin-btn" href="/seller-pro/service-requests/categories/new">
              New category
            </a>
          ) : null}
        </div>
      </div>
      <div className="admin-stats">
        {sections.map((item) => (
          <a key={item.id} className={section === item.id ? "admin-stat is-active" : "admin-stat"} href={sectionHref(item.id)}>
            {typeof item.count === "number" ? <strong>{item.count}</strong> : null} {item.label}
          </a>
        ))}
      </div>
      {section === "offerings" ? (
        config.content.categories.length === 0 ? (
          <div className="admin-panel">
            <p className="admin-empty">No categories yet. Add one, then put a bookable offering inside it.</p>
          </div>
        ) : (
          <div className="studio-library">
            {config.content.categories.map((category) => (
              <a key={category.id} className="studio-card" href={`/seller-pro/service-requests/categories/${category.id}`}>
                <span className="studio-card__media">
                  {category.image ? <img src={category.image} alt="" /> : category.title.slice(0, 1)}
                </span>
                <span className="studio-card__body">
                  <strong>{category.title}</strong>
                  <span className="admin-meta">
                    {category.intent.trim() || offeringCount(category)}
                    {category.intent.trim() ? ` · ${offeringCount(category)}` : ""}
                  </span>
                  <span className={tone(category)}>{statusLabel(category)}</span>
                </span>
              </a>
            ))}
          </div>
        )
      ) : null}
      {section === "requests" ? <RequestInbox bookings={bookings} detailsBase={detailsBase} /> : null}
      {section === "calendar" ? (
        <AvailabilityBoard
          dates={unavailableDates}
          bookings={bookings.map((booking) => ({
            id: booking.id,
            when: booking.requestedForAt || booking.deliverBy,
            label: booking.requestLabel,
            who: booking.requesterName,
          }))}
        />
      ) : null}
      {section === "page" ? <PageSetup config={config} /> : null}
    </>
  );
}
