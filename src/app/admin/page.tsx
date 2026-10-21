import Link from "next/link";

import { ActivityChart, DistributionChart, EmptyState, PageHeader, StatCard } from "@/components/admin";
import { getDashboard } from "@/lib/admin/data";
import { approvalPercent } from "@/lib/admin/validation";

export default async function DashboardPage() {
  const data = await getDashboard();
  const approval = approvalPercent(data.upvotes, data.downvotes);
  const colors: Record<string, string> = { published: "#22b8a0", pending: "#8b70f2", failed: "#ed9472" };
  return (
    <>
      <PageHeader eyebrow="Your community, at a glance" title="A little perspective." description="The people, creations, and conversations behind your AI media." action={<Link href="/admin/media/new" className="button">+ Create media</Link>} />
      <div className="stats-grid">
        <StatCard label="Community" value={data.total_profiles.toLocaleString()} detail="Registered profiles" tone="violet" />
        <StatCard label="Media library" value={data.total_media.toLocaleString()} detail={`${data.published_media.toLocaleString()} published`} tone="teal" />
        <StatCard label="Votes cast" value={data.total_votes.toLocaleString()} detail={`${data.upvotes.toLocaleString()} up · ${data.downvotes.toLocaleString()} down`} tone="amber" />
        <StatCard label="Community approval" value={approval === null ? "—" : `${approval}%`} detail={approval === null ? "Waiting for the first vote" : "Upvotes as a share of all votes"} tone="rose" />
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-header"><div><p className="eyebrow">Community pulse</p><h2>Every vote tells a story</h2></div><span className="badge">Last 7 days · UTC</span></div>
          <ActivityChart points={data.activity.map((point) => ({ ...point, label: new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(new Date(`${point.label}T12:00:00Z`)) }))} />
        </section>
        <section className="panel">
          <div className="panel-header"><div><p className="eyebrow">Library health</p><h2>From idea to published</h2></div></div>
          <DistributionChart items={data.types.map((item) => ({ ...item, color: colors[item.label] ?? "#8b70f2" }))} />
          <p className="field-hint">{data.unrated_media.toLocaleString()} creations are still waiting for their first vote.</p>
        </section>
      </div>
      <section className="panel">
        <div className="panel-header"><div><p className="eyebrow">The conversation starters</p><h2>Most engaged creations</h2></div><Link href="/admin/ratings" className="text-link">Explore votes →</Link></div>
        {data.top_media.length === 0 ? <EmptyState title="A blank canvas" description="Your most engaging creations will appear here once votes arrive." /> : (
          <div className="table-wrap"><table className="data-table"><thead><tr><th scope="col">Creation</th><th scope="col">Status</th><th scope="col">Votes</th><th scope="col">Approval</th></tr></thead><tbody>
            {data.top_media.map((media) => {
              const percentage = approvalPercent(media.upvotes, media.downvotes);
              return <tr key={media.id}><td><Link className="text-link" href={`/admin/media/${media.id}`}>{media.title || "Untitled creation"}</Link></td><td><span className={`badge status-${media.status}`}>{media.status}</span></td><td>{media.votes.toLocaleString()}</td><td>{percentage === null ? "—" : `${percentage}%`}</td></tr>;
            })}
          </tbody></table></div>
        )}
      </section>
    </>
  );
}
