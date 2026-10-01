import Link from "next/link";
import type { ReactNode } from "react";
import { DashboardCard, StatCard, formatCount } from "@/components/settings/DashboardParts";
import { SettingsTabs, type SettingsTab } from "@/components/settings/SettingsTabs";
import { UserFeedPostsMenu } from "@/components/settings/UserFeedPostsMenu";
import { getCountryLabel } from "@/lib/constants/locations";
import {
  APPROVAL_STATUS_LABELS,
  ONBOARDING_STEP_LABELS,
  SIGNUP_METHOD_LABELS,
} from "@/lib/settings/dashboard";
import type { SettingsUserDetail } from "@/lib/settings/user-detail";

const PROFILE_SOURCE_LABELS: Record<string, string> = {
  "profile-json": "Seeded creator profile",
  stub: "Basic profile",
  "handle-setup": "Set up by the user",
  "ai-user": "AI user profile",
};

const CREATOR_SOURCE_LABELS: Record<string, string> = {
  "feed-json": "Seeded feed creator",
  "profile-json": "Seeded creator profile",
  "first-post-auto": "Created on first post",
  "seller-tools-auto": "Created from Seller Tools",
  "profile-json-auto": "Created on first subscription",
};

const PROVIDER_LABELS: Record<string, string> = { google: "Google" };

function formatTimestamp(date: Date) {
  const iso = date.toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}

function atHandle(handle: string) {
  return `@${handle.replace(/^@/, "")}`;
}

function excerpt(text: string, length = 90) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "No text";
  return clean.length > length ? `${clean.slice(0, length - 1)}…` : clean;
}

function Prop({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="settings-props__row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function UserLinks({ users }: { users: { id: string; name: string; email: string }[] }) {
  return (
    <ul className="settings-props__links">
      {users.map((user) => (
        <li key={user.id}>
          <Link href={`/settings/users/${user.id}`}>{user.name !== "—" ? user.name : user.email}</Link>
          <span className="settings-props__note"> · {user.email}</span>
        </li>
      ))}
    </ul>
  );
}

function onboardingLabel(step: string | null) {
  if (!step) return "Not recorded";
  if (step === "complete") return "Complete";
  return ONBOARDING_STEP_LABELS[step] ?? step;
}

function loginOptions(user: SettingsUserDetail) {
  const options = [
    ...(user.hasPassword ? ["Password"] : []),
    ...user.loginProviders.map((provider) => PROVIDER_LABELS[provider] ?? provider),
  ];
  return options.length ? options.join(", ") : "Email code only";
}

function AccountPanel({ user }: { user: SettingsUserDetail }) {
  const location = [user.region, user.country ? getCountryLabel(user.country) : null]
    .filter(Boolean)
    .join(", ");

  return (
    <dl className="settings-props">
      <Prop label="User ID">
        <code>{user.id}</code>
      </Prop>
      <Prop label="Email">
        {user.email}
        <span className="settings-props__note">
          {" · "}
          {user.emailVerifiedAt ? `verified ${formatTimestamp(user.emailVerifiedAt)}` : "not verified"}
        </span>
      </Prop>
      <Prop label="Handle">{user.handle ? atHandle(user.handle) : "Not set"}</Prop>
      <Prop label="Account type">{user.accountTypeLabel}</Prop>
      <Prop label="Age zone">
        {user.ageZoneLabel}
        {user.ageZoneIsStored ? null : (
          <span className="settings-props__note"> · assumed from account type</span>
        )}
      </Prop>
      <Prop label="Date of birth">
        {user.dateOfBirth ? user.dateOfBirth.toLocaleDateString("en-CA") : "Not recorded"}
      </Prop>
      <Prop label="Location">{location || "Not recorded"}</Prop>
      <Prop label="Sign-up method">
        {user.signupMethod ? (SIGNUP_METHOD_LABELS[user.signupMethod] ?? user.signupMethod) : "Not recorded"}
      </Prop>
      <Prop label="Onboarding">{onboardingLabel(user.onboardingStep)}</Prop>
      <Prop label="Signs in with">{loginOptions(user)}</Prop>
      <Prop label="Joined">{formatTimestamp(user.createdAt)}</Prop>
      <Prop label="Last updated">{formatTimestamp(user.updatedAt)}</Prop>
    </dl>
  );
}

function ProfilePanel({ profile }: { profile: SettingsUserDetail["profile"] }) {
  if (!profile) return <p className="settings-card__hint">This user has no public profile.</p>;

  return (
    <dl className="settings-props">
      <Prop label="Profile page">
        {profile.slug ? (
          <Link href={`/feed/profile/${profile.slug}`} target="_blank">
            /feed/profile/{profile.slug}
          </Link>
        ) : (
          "No profile URL"
        )}
      </Prop>
      <Prop label="Display name">{profile.displayName}</Prop>
      <Prop label="Handle">{atHandle(profile.handle)}</Prop>
      <Prop label="Verified">{profile.verified ? "Yes" : "No"}</Prop>
      <Prop label="Profile type">{PROFILE_SOURCE_LABELS[profile.source] ?? profile.source}</Prop>
      <Prop label="Followers shown">{profile.followersLabel ?? "0"}</Prop>
      <Prop label="Subscription">{profile.subscriptionPriceLabel ?? "None"}</Prop>
      <Prop label="Bio">{profile.bio || "None"}</Prop>
    </dl>
  );
}

function CreatorPanel({ creator }: { creator: SettingsUserDetail["creator"] }) {
  if (!creator) {
    return (
      <p className="settings-card__hint">
        No creator identity yet. One is created the first time the user posts.
      </p>
    );
  }

  return (
    <dl className="settings-props">
      <Prop label="Shown as">
        {creator.name} <span className="settings-props__note">{atHandle(creator.handle)}</span>
      </Prop>
      <Prop label="Created as">{CREATOR_SOURCE_LABELS[creator.source] ?? creator.source}</Prop>
      <Prop label="Verified">{creator.verified ? "Yes" : "No"}</Prop>
      <Prop label="Followers">{formatCount(creator.followers)}</Prop>
      <Prop label="Subscribers">{formatCount(creator.activeSubscribers)} active</Prop>
    </dl>
  );
}

function FamilyPanel({ user }: { user: SettingsUserDetail }) {
  return (
    <dl className="settings-props">
      {user.guardians.length ? (
        <Prop label="Parents">
          <UserLinks users={user.guardians} />
        </Prop>
      ) : null}
      {user.children.length ? (
        <Prop label="Children">
          <UserLinks users={user.children} />
        </Prop>
      ) : null}
      {user.approvalRequests.length ? (
        <Prop label="Approval requests">
          <ul className="settings-props__links">
            {user.approvalRequests.map((request) => (
              <li key={request.id}>
                {APPROVAL_STATUS_LABELS[request.status] ?? request.status}
                <span className="settings-props__note">
                  {" · "}
                  {request.role === "child" ? `to ${request.parentEmail}` : `for ${request.child.name}`}
                  {" · sent "}
                  {formatTimestamp(request.sentAt)}
                </span>
              </li>
            ))}
          </ul>
        </Prop>
      ) : null}
    </dl>
  );
}

export function UserDetail({ user }: { user: SettingsUserDetail }) {
  const back = user.isAiUser
    ? { href: "/settings/users?tab=ai", label: "AI Users" }
    : user.isDemo
      ? { href: "/settings/users?tab=demo", label: "Demo users" }
      : { href: "/settings/users", label: "Users" };
  const hasFamily =
    user.guardians.length > 0 || user.children.length > 0 || user.approvalRequests.length > 0;
  const tabs: SettingsTab[] = [
    { id: "account", label: "Account", content: <AccountPanel user={user} /> },
    { id: "profile", label: "Public profile", content: <ProfilePanel profile={user.profile} /> },
    { id: "creator", label: "Creator identity", content: <CreatorPanel creator={user.creator} /> },
    ...(hasFamily ? [{ id: "family", label: "Family", content: <FamilyPanel user={user} /> }] : []),
  ];

  return (
    <div className="settings-panel">
      <p className="settings-back">
        <Link href={back.href}>← {back.label}</Link>
      </p>

      <div className="settings-panel__head">
        <h1 className="settings-panel__title">{user.name !== "—" ? user.name : user.email}</h1>
        <p className="settings-panel__subtitle">
          {user.email}
          <span className="settings-tag">{user.accountTypeLabel}</span>
          {user.isDemo ? <span className="settings-tag">Demo user</span> : null}
          {user.isAiUser ? <span className="settings-tag settings-tag--ai">AI user</span> : null}
        </p>
      </div>

      <div className="settings-dashboard">
        <div className="settings-stats">
          <StatCard
            label="Feed posts"
            value={user.activity.feedPosts}
            detail={`${formatCount(user.activity.hiddenPosts)} posts hidden from their own feed`}
            icon="posts"
            tone="blue"
          />
          <StatCard
            label="Following"
            value={user.activity.following}
            detail={`${formatCount(user.activity.activeSubscriptions)} active subscriptions`}
            icon="heart"
            tone="rose"
          />
          <StatCard
            label="Chat threads"
            value={user.activity.chatThreads}
            detail="Direct message conversations"
            icon="mail"
            tone="violet"
          />
          <StatCard
            label="Signed in now"
            value={user.activeSessions}
            detail="Active sessions"
            icon="activity"
            tone="teal"
          />
        </div>

        <SettingsTabs tabs={tabs} label="User details" />

        <DashboardCard
          title="Feed posts"
          icon="posts"
          action={
            <UserFeedPostsMenu
              userId={user.id}
              userName={user.name !== "—" ? user.name : user.email}
              postCount={user.posts.length}
            />
          }
        >
          {user.posts.length ? (
            <div className="settings-table-wrap">
              <table className="settings-table">
                <thead>
                  <tr>
                    <th scope="col">Posted</th>
                    <th scope="col">Post</th>
                    <th scope="col">Type</th>
                    <th scope="col">Category</th>
                    <th scope="col" className="settings-table__number">
                      Likes
                    </th>
                    <th scope="col" className="settings-table__number">
                      Comments
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {user.posts.map((post) => (
                    <tr key={post.id}>
                      <td className="settings-table__nowrap">{formatTimestamp(post.postedAt)}</td>
                      <td>
                        <Link href={`/settings/feed-mgmt?q=${encodeURIComponent(post.id)}`}>
                          {excerpt(post.text)}
                        </Link>
                        {post.membersOnly ? <span className="settings-tag">Members only</span> : null}
                      </td>
                      <td>{post.kind}</td>
                      <td>{post.category}</td>
                      <td className="settings-table__number">{formatCount(post.likes)}</td>
                      <td className="settings-table__number">{formatCount(post.comments)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="settings-card__hint">This user hasn&apos;t posted yet.</p>
          )}
        </DashboardCard>
      </div>
    </div>
  );
}
