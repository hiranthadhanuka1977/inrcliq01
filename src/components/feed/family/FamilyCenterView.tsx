"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import LeftNav from "@/components/feed/LeftNav";
import MobileNav from "@/components/feed/MobileNav";
import ProtectionTierIcon from "@/components/guardian/ProtectionTierIcon";
import type { FamilyCenterData } from "@/lib/guardian/family-center";

function ChildCard({ child }: { child: FamilyCenterData["children"][number] }) {
  const avatar = (
    <span
      className="family-center__avatar"
      style={{ "--story-color": child.avatarColor } as CSSProperties}
      aria-hidden="true"
    >
      {child.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={child.avatarUrl} alt="" width={48} height={48} />
      ) : (
        child.avatarInitials
      )}
    </span>
  );

  const main = (
    <>
      {avatar}
      <span className="family-center__child-copy">
        <span className="family-center__child-name">{child.fullName}</span>
        <span className="family-center__child-meta">
          {child.handleLabel}
          {child.age != null ? ` · ${child.age} years old` : ""}
        </span>
        <span className="family-center__child-details">
          <span className="family-center__protection">
            <ProtectionTierIcon tier={child.protectionLevel} />
            <span>{child.protectionLevelLabel} protection</span>
          </span>
          <span className="family-center__child-linked">· Linked {child.linkedAtDisplay}</span>
        </span>
      </span>
      <span className="family-center__child-badges">
        <span className="family-center__status-badge">{child.statusLabel}</span>
      </span>
    </>
  );

  return (
    <li className="family-center__child">
      <div className="family-center__child-row">
        <Link href={`/feed/family-center/${child.id}`} className="family-center__child-main">
          {main}
        </Link>
        <Link
          href={child.messagesHref}
          className="family-center__child-message"
          aria-label={`Message ${child.fullName}`}
          title={`Message ${child.fullName}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </Link>
      </div>
    </li>
  );
}

export default function FamilyCenterView({
  data,
  firstName,
}: {
  data: FamilyCenterData;
  firstName: string | null;
}) {
  return (
    <div className="app-shell">
      <LeftNav firstName={firstName} />
      <main className="main-content family-center" id="main">
        <div className="family-center__card">
          <header className="family-center__header">
            <p className="family-center__eyebrow">Family Center</p>
            <h1 className="family-center__title">Your children</h1>
            <p className="family-center__subtitle">
              Manage linked minor accounts you have approved on InrCliq.
            </p>
          </header>

          {data.children.length === 0 ? (
            <section className="family-center__empty" aria-labelledby="family-center-empty">
              <h2 id="family-center-empty" className="family-center__empty-title">
                No linked children yet
              </h2>
              <p className="family-center__empty-copy">
                When you approve a minor&apos;s signup request, their account will appear here.
              </p>
            </section>
          ) : (
            <ul className="family-center__list" aria-label="Linked children">
              {data.children.map((child) => (
                <ChildCard key={child.id} child={child} />
              ))}
            </ul>
          )}

          <div className="family-center__actions">
            <Link href="/feed/me" className="btn btn--secondary">
              Back to profile
            </Link>
            <Link href="/feed" className="btn btn--secondary">
              Back to feed
            </Link>
          </div>
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
