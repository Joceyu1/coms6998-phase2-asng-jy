import Link from "next/link";

import { EmptyState, PageHeader } from "@/components/admin";
import { Pagination } from "@/components/pagination";
import { getVotes } from "@/lib/admin/data";
import { displayDate, shortId } from "@/lib/admin/format";
import { pageNumber } from "@/lib/admin/validation";

export default async function RatingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const page = pageNumber((await searchParams).page);
  const data = await getVotes(page);
  return (
    <>
      <PageHeader eyebrow="Listen to your community" title="Votes & ratings" description="An individual record of every upvote and downvote. Ballots are read-only; this admin never rewrites a user's opinion." />
      <section className="panel">
        {data.rows.length === 0 ? <EmptyState title="The conversation is just beginning" description="Votes will appear as the community rates published creations." /> : <div className="table-wrap"><table className="data-table"><thead><tr><th scope="col">Vote</th><th scope="col">Creation</th><th scope="col">Voter ID</th><th scope="col">Date · UTC</th></tr></thead><tbody>{data.rows.map((vote) => <tr key={vote.id}><td><span className={`badge ${vote.value === 1 ? "status-published" : "status-failed"}`}>{vote.value === 1 ? "+1 Upvote" : "−1 Downvote"}</span></td><td><Link className="text-link" href={`/admin/media/${vote.generation_id}`}>{shortId(vote.generation_id)}</Link></td><td><code>{vote.user_id}</code></td><td><time dateTime={vote.created_at}>{displayDate(vote.created_at)}</time></td></tr>)}</tbody></table></div>}
        <Pagination page={page} total={data.total} base="/admin/ratings" />
      </section>
    </>
  );
}
