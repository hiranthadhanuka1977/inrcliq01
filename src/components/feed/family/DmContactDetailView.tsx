"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { DmContactStatus, dmContactSafetyStatus } from "@/components/guardian/family-center/DmContactStatus";
import type { ChildDmContactDetailData } from "@/lib/guardian/child-detail";
import type { DmContactGuardianSettings } from "@/lib/guardian/dm-contact-controls";

function GuardianSettingRow({
  label,
  description,
  checked,
  onChange,
  tone = "default",
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  tone?: "default" | "danger";
}) {
  return (
    <li className={`dm-contact-detail__setting dm-contact-detail__setting--${tone}`}>
      <div className="dm-contact-detail__setting-copy">
        <strong className="dm-contact-detail__setting-label">{label}</strong>
        <p className="dm-contact-detail__setting-desc">{description}</p>
      </div>
      <label className="dm-contact-detail__toggle">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className="dm-contact-detail__toggle-track" aria-hidden="true">
          <span className="dm-contact-detail__toggle-thumb" />
        </span>
        <span className="sr-only">{label}</span>
      </label>
    </li>
  );
}

export default function DmContactDetailView({ data }: { data: ChildDmContactDetailData }) {
  const { child, contact, activity } = data;
  const [settings, setSettings] = useState<DmContactGuardianSettings>(data.settings);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const status = dmContactSafetyStatus(contact.id);
  const backHref = `/family-circle/accounts/${child.id}#child-detail-dm`;

  async function updateSetting(key: keyof DmContactGuardianSettings, value: boolean) {
    const previous = settings;
    const next = { ...settings, [key]: value };
    setSettings(next);
    setSettingsError(null);

    try {
      const response = await fetch(`/api/family-circle/accounts/${child.id}/dm/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });

      if (!response.ok) {
        throw new Error("Could not save setting.");
      }

      const payload = (await response.json()) as { settings: DmContactGuardianSettings };
      setSettings(payload.settings);
    } catch {
      setSettings(previous);
      setSettingsError("Could not save that setting. Please try again.");
    }
  }

  const activityByDay = activity.reduce<Record<string, typeof activity>>((groups, item) => {
    const bucket = groups[item.dayLabel] ?? [];
    bucket.push(item);
    groups[item.dayLabel] = bucket;
    return groups;
  }, {});

  return (
    <section className="family-portal-panel dm-contact-detail" aria-labelledby="dm-contact-detail-name">
      <div className="child-detail__card">
        <header className="child-detail__header">
          <Link href={backHref} className="child-detail__back">
            ← Direct messaging
          </Link>
          <p className="child-detail__eyebrow">
            {child.fullName} · {child.handleLabel}
          </p>
        </header>

        <div className="dm-contact-detail__hero">
          <span
            className="child-detail__avatar"
            style={{ "--story-color": contact.avatarColor } as CSSProperties}
            aria-hidden="true"
          >
            {contact.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={contact.avatarUrl} alt="" width={72} height={72} />
            ) : (
              contact.avatarInitials
            )}
          </span>
          <div className="dm-contact-detail__hero-copy">
            <h1 className="child-detail__name" id="dm-contact-detail-name">
              {contact.name}
            </h1>
            <p className="child-detail__handle">{contact.handle}</p>
            {contact.lastActiveLabel ? (
              <p className="dm-contact-detail__meta">{contact.lastActiveLabel}</p>
            ) : null}
          </div>
          <DmContactStatus status={status} />
        </div>

        <section className="dm-contact-detail__section" aria-labelledby="dm-contact-activity">
          <h2 id="dm-contact-activity" className="child-detail__section-title">
            Conversation activity
          </h2>
          <p className="dm-contact-detail__intro">
            Safe activity summary for this thread — message content is never shown here.
          </p>
          <div className="family-center__activity-log dm-contact-detail__activity-log">
            <ul className="family-center__activity-log-list">
              {Object.entries(activityByDay).map(([dayLabel, items]) => (
                <li key={dayLabel}>
                  <div className="family-center__activity-log-day">{dayLabel}</div>
                  <ul className="dm-contact-detail__activity-items">
                    {items.map((item) => (
                      <li key={item.id} className="family-center__activity-log-row">
                        <div className="family-center__activity-log-main">
                          <span
                            className={`family-center__activity-type family-center__activity-type--${item.type === "message" ? "request" : item.type === "media" ? "safety" : item.type === "reaction" ? "control" : "account"}`}
                          >
                            {item.type}
                          </span>
                          <div className="family-center__activity-log-copy">
                            <p className="family-center__activity-log-title">
                              <span className="family-center__activity-log-event">{item.title}</span>
                            </p>
                            <p className="family-center__activity-log-detail">{item.detail}</p>
                          </div>
                          <time className="family-center__activity-time">{item.timeAgo}</time>
                        </div>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="dm-contact-detail__section" aria-labelledby="dm-contact-settings">
          <h2 id="dm-contact-settings" className="child-detail__section-title">
            Guardian settings
          </h2>
          <p className="dm-contact-detail__intro">
            Manage how {child.firstName} can interact with {contact.name}. Changes apply immediately.
          </p>
          {settingsError ? <p className="dm-contact-detail__error">{settingsError}</p> : null}
          <ul className="dm-contact-detail__settings">
            <GuardianSettingRow
              label="Restrict direct messaging"
              description={`Prevent ${child.firstName} from sending new messages to ${contact.name}.`}
              checked={settings.dmRestricted}
              onChange={(value) => updateSetting("dmRestricted", value)}
            />
            <GuardianSettingRow
              label="Require approval for messages"
              description={`New messages to ${contact.name} must be approved before they are sent.`}
              checked={settings.requiresApproval}
              onChange={(value) => updateSetting("requiresApproval", value)}
            />
            <GuardianSettingRow
              label="Block this contact"
              description={`Stop ${child.firstName} from messaging or receiving messages from ${contact.name}.`}
              checked={settings.blocked}
              onChange={(value) => updateSetting("blocked", value)}
              tone="danger"
            />
          </ul>
        </section>

        {contact.href ? (
          <div className="dm-contact-detail__actions">
            <Link href={contact.href} className="btn btn--secondary">
              View public profile
            </Link>
          </div>
        ) : null}

        <p className="child-detail__dm-note">
          You see activity and control outcomes for this conversation — not private message content.
        </p>
      </div>
    </section>
  );
}
