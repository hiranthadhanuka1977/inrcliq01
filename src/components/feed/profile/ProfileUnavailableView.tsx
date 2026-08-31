"use client";

import Link from "next/link";
import LeftNav from "@/components/feed/LeftNav";
import MobileNav from "@/components/feed/MobileNav";
import PageBodyClass from "@/components/feed/PageBodyClass";

export default function ProfileUnavailableView() {
  return (
    <>
      <PageBodyClass pageClass="page-profile" />
      <div className="app-shell page-profile">
        <LeftNav />
        <main className="main-content profile-page profile-unavailable-page" id="main">
          <div className="profile-unavailable">
            <div className="profile-unavailable__card">
              <span className="profile-unavailable__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                  <line x1="4" y1="4" x2="20" y2="20" />
                </svg>
              </span>
              <h1 className="profile-unavailable__title">This account is no longer on InrCliq</h1>
              <p className="profile-unavailable__copy">
                The profile you&apos;re looking for isn&apos;t available. This person may have deleted
                their account or removed their public profile.
              </p>
              <div className="profile-unavailable__actions">
                <Link href="/feed" className="btn btn--secondary btn--sm">
                  Back to feed
                </Link>
              </div>
            </div>
          </div>
        </main>
        <MobileNav />
      </div>
    </>
  );
}
