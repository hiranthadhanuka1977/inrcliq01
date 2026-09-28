import Link from "next/link";

export type DashboardTab = "users" | "feed";

const TABS: { id: DashboardTab; label: string; href: string }[] = [
  { id: "users", label: "Users", href: "/settings/dashboard" },
  { id: "feed", label: "Feed", href: "/settings/dashboard?tab=feed" },
];

export function parseDashboardTab(value: string | undefined): DashboardTab {
  return value === "feed" ? "feed" : "users";
}

export function DashboardPills({ active }: { active: DashboardTab }) {
  return (
    <nav className="settings-pills" aria-label="Dashboard views">
      {TABS.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          className={`settings-pills__pill${tab.id === active ? " is-active" : ""}`}
          aria-current={tab.id === active ? "page" : undefined}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
