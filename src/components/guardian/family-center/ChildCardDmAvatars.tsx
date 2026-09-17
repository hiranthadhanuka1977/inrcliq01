"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import type { FamilyCenterChild } from "@/lib/guardian/family-center";

type DmContact = FamilyCenterChild["dmContacts"][number];

export function ChildCardDmAvatars({
  childId,
  contacts,
}: {
  childId: string;
  contacts: DmContact[];
}) {
  if (contacts.length === 0) return null;

  const visible = contacts.slice(0, 3);
  const detailHref = `/family-circle/accounts/${childId}#child-detail-dm`;
  const label = `${contacts.length} direct message contact${contacts.length === 1 ? "" : "s"}`;

  return (
    <Link
      href={detailHref}
      className="family-center__child-dm"
      aria-label={`View ${label}`}
      title="View direct message contacts"
    >
      <span className="family-center__child-dm-avatars" aria-hidden="true">
        {visible.map((contact) => (
          <span
            key={contact.id}
            className="family-center__child-dm-avatar"
            style={{ "--story-color": contact.avatarColor } as CSSProperties}
            title={contact.name}
          >
            {contact.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={contact.avatarUrl} alt="" width={32} height={32} />
            ) : (
              contact.avatarInitials
            )}
          </span>
        ))}
        <span className="family-center__child-dm-avatar family-center__child-dm-avatar--more">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </span>
      </span>
    </Link>
  );
}
