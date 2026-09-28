import Link from "next/link";

export type SettingsPill = { id: string; label: string; href: string };

export function SettingsPills({
  pills,
  active,
  label,
}: {
  pills: SettingsPill[];
  active: string;
  label: string;
}) {
  return (
    <nav className="settings-pills" aria-label={label}>
      {pills.map((pill) => (
        <Link
          key={pill.id}
          href={pill.href}
          className={`settings-pills__pill${pill.id === active ? " is-active" : ""}`}
          aria-current={pill.id === active ? "page" : undefined}
        >
          {pill.label}
        </Link>
      ))}
    </nav>
  );
}
