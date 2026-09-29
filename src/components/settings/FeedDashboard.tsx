import Link from "next/link";
import {
  BreakdownList,
  DailyTrend,
  DashboardAvatar,
  DashboardCard,
  StatCard,
  formatCount,
  formatShortDate,
} from "@/components/settings/DashboardParts";
import type { SettingsFeedSummary } from "@/lib/settings/feed-dashboard";

export function FeedDashboard({ summary }: { summary: SettingsFeedSummary }) {
  const engagementSegments = [
    { key: "likes", label: "Likes", count: summary.engagement.likes },
    { key: "comments", label: "Comments", count: summary.engagement.comments },
    { key: "shares", label: "Shares", count: summary.engagement.shares },
  ];
  const engagementTotal = engagementSegments.reduce((sum, row) => sum + row.count, 0);

  if (summary.totalPosts === 0) {
    return <p className="settings-empty">No posts yet.</p>;
  }

  return (
    <div className="settings-dashboard">
      <div className="settings-stats">
        <StatCard
          label="Total posts"
          value={summary.totalPosts}
          detail={`${formatCount(summary.memberPosts)} by members · ${formatCount(summary.seededPosts)} seeded`}
          icon="posts"
          tone="blue"
          meter={{ value: summary.memberPosts, total: summary.totalPosts, label: "by members" }}
        />
        <StatCard
          label="Posted this week"
          value={summary.postsLast7Days}
          detail={`${formatCount(summary.postsLast30Days)} in the last 30 days`}
          icon="calendar"
          tone="green"
          trend={summary.dailyPosts.slice(-7)}
        />
        <StatCard
          label="Creators posting"
          value={summary.creatorsWithPosts}
          detail={`${formatCount(summary.follows)} follows · ${formatCount(summary.activeSubscriptions)} active subscriptions`}
          icon="users"
          tone="violet"
        />
        <StatCard
          label="Members-only posts"
          value={summary.membersOnlyPosts}
          detail="Visible to subscribers only"
          icon="lock"
          tone="amber"
          meter={{ value: summary.membersOnlyPosts, total: summary.totalPosts, label: "of all posts" }}
        />
        <StatCard
          label="Hidden by viewers"
          value={summary.hiddenByViewers}
          detail="Times someone removed a post from their feed"
          icon="eyeOff"
          tone="rose"
        />
      </div>

      <DashboardCard title={`Posts per day, last ${summary.dailyPosts.length} days`} icon="chart">
        <p className="settings-card__hint">Posts by post date (UTC). Hover a bar for the exact count.</p>
        <DailyTrend days={summary.dailyPosts} noun={["post", "posts"]} />
      </DashboardCard>

      <div className="settings-dashboard__grid settings-dashboard__grid--pairs">
        <DashboardCard title="Categories" icon="tag">
          <BreakdownList segments={summary.categories} total={summary.totalPosts} />
        </DashboardCard>

        <DashboardCard title="Post types" icon="image">
          <BreakdownList segments={summary.mediaKinds} total={summary.totalPosts} />
        </DashboardCard>

        <DashboardCard title="Engagement" icon="heart">
          <BreakdownList segments={engagementSegments} total={engagementTotal} />
          <p className="settings-card__hint">Totals across all posts, including the demo counts on seeded posts.</p>
        </DashboardCard>

        <DashboardCard title="Most active creators" icon="star">
          <TopCreatorsList creators={summary.topCreators} />
        </DashboardCard>
      </div>

      <DashboardCard
        title="Latest member posts"
        icon="posts"
        action={
          <Link href="/settings/feed-mgmt" className="settings-dash-card__action">
            Open Feed Mgmt
          </Link>
        }
      >
        <RecentMemberPostsTable posts={summary.recentMemberPosts} />
      </DashboardCard>
    </div>
  );
}

function TopCreatorsList({ creators }: { creators: SettingsFeedSummary["topCreators"] }) {
  const top = Math.max(1, ...creators.map((creator) => creator.posts));

  return (
    <ol className="settings-ranking">
      {creators.map((creator, index) => (
        <li key={creator.id} className="settings-ranking__row">
          <span className="settings-ranking__rank">{index + 1}</span>
          <DashboardAvatar name={creator.name} />
          <span className="settings-ranking__who">
            <span className="settings-ranking__name">
              {creator.slug ? <Link href={`/feed/profile/${creator.slug}`}>{creator.name}</Link> : creator.name}
              {creator.seeded ? <span className="settings-tag">Seeded</span> : null}
            </span>
            <span className="settings-ranking__handle">{creator.handle}</span>
            <span className="settings-ranking__track" aria-hidden="true">
              <span className="settings-ranking__fill" style={{ width: `${(creator.posts / top) * 100}%` }} />
            </span>
          </span>
          <span className="settings-ranking__count">
            <strong>{formatCount(creator.posts)}</strong>
            <span>{creator.posts === 1 ? "post" : "posts"}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function RecentMemberPostsTable({ posts }: { posts: SettingsFeedSummary["recentMemberPosts"] }) {
  if (posts.length === 0) {
    return <p className="settings-card__hint">Members haven&apos;t posted yet.</p>;
  }

  return (
    <div className="settings-table-wrap">
      <table className="settings-table settings-table--dash">
        <thead>
          <tr>
            <th scope="col">Post</th>
            <th scope="col">Author</th>
            <th scope="col">Category</th>
            <th scope="col">Type</th>
            <th scope="col">Posted</th>
          </tr>
        </thead>
        <tbody>
          {posts.map((post) => (
            <tr key={post.id}>
              <td>
                <Link href={`/settings/feed-mgmt?q=${encodeURIComponent(post.id)}`}>{post.excerpt}</Link>
                {post.membersOnly ? <span className="settings-tag">Members only</span> : null}
              </td>
              <td>
                <span className="settings-person">
                  <DashboardAvatar name={post.authorName} />
                  <span>
                    {post.authorName}
                    <span className="settings-ranking__handle">{post.authorHandle}</span>
                  </span>
                </span>
              </td>
              <td>
                <span className="settings-tag settings-tag--flush">{post.category}</span>
              </td>
              <td>
                <span className="settings-tag settings-tag--flush">{post.kind}</span>
              </td>
              <td className="settings-table__nowrap settings-table__muted">{formatShortDate(post.postedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
