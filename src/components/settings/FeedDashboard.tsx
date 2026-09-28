import Link from "next/link";
import {
  BreakdownList,
  DailyTrend,
  DashboardCard,
  StatCard,
  formatCount,
  formatShortDate,
  percent,
} from "@/components/settings/DashboardParts";
import type { SettingsFeedSummary } from "@/lib/settings/feed-dashboard";

export function FeedDashboard({ summary }: { summary: SettingsFeedSummary }) {
  const trendTotal = summary.dailyPosts.reduce((sum, day) => sum + day.count, 0);
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
        />
        <StatCard
          label="Posted this week"
          value={summary.postsLast7Days}
          detail={`${formatCount(summary.postsLast30Days)} in the last 30 days`}
        />
        <StatCard
          label="Creators posting"
          value={summary.creatorsWithPosts}
          detail={`${formatCount(summary.follows)} follows · ${formatCount(summary.activeSubscriptions)} active subscriptions`}
        />
        <StatCard
          label="Members-only posts"
          value={summary.membersOnlyPosts}
          detail={`${percent(summary.membersOnlyPosts, summary.totalPosts)}% of all posts`}
        />
        <StatCard
          label="Hidden by viewers"
          value={summary.hiddenByViewers}
          detail="Times someone removed a post from their feed"
        />
      </div>

      <DashboardCard title={`Posts per day, last ${summary.dailyPosts.length} days`} wide>
        <p className="settings-card__hint">
          {formatCount(trendTotal)} posts dated in this period (by post date, UTC days).
        </p>
        <DailyTrend days={summary.dailyPosts} noun={["post", "posts"]} />
      </DashboardCard>

      <div className="settings-dashboard__grid">
        <DashboardCard title="Categories">
          <BreakdownList segments={summary.categories} total={summary.totalPosts} />
        </DashboardCard>

        <DashboardCard title="Post types">
          <BreakdownList segments={summary.mediaKinds} total={summary.totalPosts} />
        </DashboardCard>

        <DashboardCard title="Engagement">
          <BreakdownList segments={engagementSegments} total={engagementTotal} />
          <p className="settings-card__hint">Totals across all posts, including the demo counts on seeded posts.</p>
        </DashboardCard>

        <DashboardCard title="Most active creators">
          <ul className="settings-ranking">
            {summary.topCreators.map((creator) => (
              <li key={creator.id} className="settings-ranking__row">
                <span className="settings-ranking__who">
                  {creator.slug ? <Link href={`/feed/profile/${creator.slug}`}>{creator.name}</Link> : creator.name}
                  <span className="settings-ranking__handle">{creator.handle}</span>
                </span>
                <span className="settings-ranking__meta">
                  {creator.seeded ? <span className="settings-tag">Seeded</span> : null}
                  <strong>{formatCount(creator.posts)}</strong>
                </span>
              </li>
            ))}
          </ul>
        </DashboardCard>
      </div>

      <DashboardCard title="Latest member posts" wide>
        <RecentMemberPostsTable posts={summary.recentMemberPosts} />
      </DashboardCard>
    </div>
  );
}

function RecentMemberPostsTable({ posts }: { posts: SettingsFeedSummary["recentMemberPosts"] }) {
  if (posts.length === 0) {
    return <p className="settings-card__hint">Members haven&apos;t posted yet.</p>;
  }

  return (
    <div className="settings-table-wrap">
      <table className="settings-table">
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
                {post.excerpt}
                {post.membersOnly ? <span className="settings-tag">Members only</span> : null}
              </td>
              <td>
                {post.authorName}
                <span className="settings-ranking__handle">{post.authorHandle}</span>
              </td>
              <td>{post.category}</td>
              <td>{post.kind}</td>
              <td>{formatShortDate(post.postedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
