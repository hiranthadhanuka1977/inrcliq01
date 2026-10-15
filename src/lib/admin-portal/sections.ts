export type SectionIcon =
  | "users"
  | "feed"
  | "payments"
  | "creators"
  | "audio"
  | "shop"
  | "requests"
  | "messaging"
  | "safety"
  | "subscriptions"
  | "notifications"
  | "analytics"
  | "support";

export type AdminSectionNavItem = {
  slug: string;
  href: string;
  label: string;
  summary: string;
  exact?: boolean;
};

export type AdminSection = {
  slug: string;
  label: string;
  summary: string;
  href: string;
  icon: SectionIcon;
  nav: AdminSectionNavItem[];
};

function area(
  slug: string,
  label: string,
  summary: string,
  icon: SectionIcon,
  pages: Array<[string, string, string]>,
): AdminSection {
  const href = `/admin/${slug}`;
  return {
    slug,
    label,
    summary,
    href,
    icon,
    nav: [
      { slug: "", href, label: "Dashboard", summary, exact: true },
      ...pages.map(([pageSlug, pageLabel, pageSummary]) => ({
        slug: pageSlug,
        href: `${href}/${pageSlug}`,
        label: pageLabel,
        summary: pageSummary,
      })),
    ],
  };
}

const users: AdminSection = {
  slug: "users",
  label: "Users",
  summary: "Onboarding, guardian approval, and account administration.",
  href: "/admin/dashboard",
  icon: "users",
  nav: [
    {
      slug: "",
      href: "/admin/dashboard",
      label: "Dashboard",
      summary: "Onboarding, guardian approval, and account administration.",
      exact: true,
    },
    {
      slug: "queue",
      href: "/admin/queue",
      label: "Onboarding queue",
      summary: "Accounts still moving through setup.",
      exact: true,
    },
    {
      slug: "directory",
      href: "/admin/users",
      label: "Directory",
      summary: "Every registered account.",
    },
    {
      slug: "guardians",
      href: "/admin/guardians",
      label: "Guardians",
      summary: "Parent and guardian accounts.",
      exact: true,
    },
    {
      slug: "consent",
      href: "/admin/consent",
      label: "Consent register",
      summary: "Parent approval requests.",
      exact: true,
    },
    {
      slug: "audit",
      href: "/admin/audit",
      label: "Audit log",
      summary: "Operator actions on accounts.",
      exact: true,
    },
  ],
};

export const ADMIN_SECTIONS: AdminSection[] = [
  users,
  area("feed", "Feed", "Posts, stories, categories, and what fans see on the home feed.", "feed", [
    ["posts", "Posts", "Creator posts published to the home feed."],
    ["stories", "Stories & snaps", "Short-form stories and snaps."],
    ["categories", "Categories", "Interest and discovery categories."],
    ["reports", "Reported posts", "Posts fans or guardians have reported."],
  ]),
  area("payments", "Payments", "Charges, creator payouts, refunds, and promo codes.", "payments", [
    ["transactions", "Transactions", "Charges from shop checkout and paid requests."],
    ["payouts", "Creator payouts", "Money owed and paid out to creators."],
    ["refunds", "Refunds", "Returned charges and failed payments."],
    ["promos", "Promo codes", "Discount codes used at checkout."],
  ]),
  area("creators", "Creators", "Public profiles, verification, and follows.", "creators", [
    ["directory", "Directory", "Creator profiles on the platform."],
    ["verification", "Verification", "Creators waiting for a verified badge."],
    ["follows", "Follows", "Fan follows and suggested creators."],
  ]),
  area("audio", "Audio", "Podcasts, music, audiobooks, and playback.", "audio", [
    ["catalog", "Catalog", "Tracks, episodes, and audiobooks."],
    ["charts", "Charts", "What fans are listening to."],
    ["genres", "Genres", "Audio genres and discovery shelves."],
    ["playback", "Playback", "Player issues and listening sessions."],
  ]),
  area("shop", "Shop", "Creator collections, products, and orders.", "shop", [
    ["products", "Products", "Physical and digital listings."],
    ["orders", "Orders", "Bags, checkout, and completed orders."],
    ["collections", "Collections", "Creator storefronts."],
  ]),
  area("requests", "Requests", "Special requests, bookings, and appearances.", "requests", [
    ["offerings", "Offerings", "Shout-outs, coaching, and other bookable experiences."],
    ["bookings", "Bookings", "Fan bookings and delivery status."],
    ["reviews", "Reviews", "Ratings left on completed requests."],
  ]),
  area("messaging", "Messaging", "Fan and creator conversations.", "messaging", [
    ["conversations", "Conversations", "Inbox threads across the platform."],
    ["flagged", "Flagged threads", "Conversations held for safety review."],
    ["blocks", "Blocks", "Accounts that have blocked each other."],
  ]),
  area("safety", "Safety", "Reports, protection levels, and age rules.", "safety", [
    ["reports", "Reports", "Content and account reports waiting for review."],
    ["protection", "Protection levels", "Strict, standard, and relaxed guardian settings."],
    ["age-rules", "Age rules", "Age zones and what each zone can open."],
  ]),
  area("subscriptions", "Subscriptions", "Membership plans and members-only content.", "subscriptions", [
    ["plans", "Plans", "Creator membership plans."],
    ["members", "Members", "Fans with an active subscription."],
    ["member-content", "Member content", "Posts and media locked to members."],
  ]),
  area("notifications", "Notifications", "Transactional email and in-app alerts.", "notifications", [
    ["email", "Email", "Verification, login codes, and guardian notices."],
    ["in-app", "In-app", "Alerts shown inside the product."],
    ["templates", "Templates", "Copy used for outbound messages."],
  ]),
  area("analytics", "Analytics", "Engagement, growth, and retention.", "analytics", [
    ["engagement", "Engagement", "Likes, comments, follows, and listens."],
    ["growth", "Growth", "Signups and new creator relationships."],
    ["retention", "Retention", "Who comes back after joining."],
  ]),
  area("support", "Support", "Help tickets and articles for fans and creators.", "support", [
    ["tickets", "Tickets", "Questions sent to support."],
    ["articles", "Help articles", "Answers published in help."],
  ]),
];

export function sectionFromPathname(pathname: string): AdminSection {
  return (
    ADMIN_SECTIONS.find(
      (section) => section.slug !== "users" && (pathname === section.href || pathname.startsWith(`${section.href}/`)),
    ) ?? users
  );
}

export function getSection(slug: string): AdminSection | undefined {
  if (slug === "users") return undefined;
  return ADMIN_SECTIONS.find((section) => section.slug === slug);
}

export function getSectionPage(slug: string, page: string) {
  const section = getSection(slug);
  if (!section) return undefined;
  const item = section.nav.find((entry) => entry.slug === page);
  if (!item) return undefined;
  return { section, item };
}

export function isNavItemActive(pathname: string, item: AdminSectionNavItem) {
  if (pathname === item.href) return true;
  if (item.exact) return false;
  return pathname.startsWith(`${item.href}/`);
}
