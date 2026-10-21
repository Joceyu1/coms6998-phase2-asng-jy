import Link from "next/link";

import { EmptyState, Notice, PageHeader } from "@/components/admin";
import { Pagination } from "@/components/pagination";
import { getMedia } from "@/lib/admin/data";
import { displayDate } from "@/lib/admin/format";
import { pageNumber, searchTerm } from "@/lib/admin/validation";

export default async function MediaPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const page = pageNumber(params.page); const q = searchTerm(params.q);
  const status = typeof params.status === "string" && ["pending", "published", "failed"].includes(params.status) ? params.status : "";
  const data = await getMedia(page, q, status);
  return (
    <>
      <PageHeader eyebrow="Ideas, made tangible" title="Media library" description="Create, inspect, edit, and remove AI-generated notes from the shared collection." action={<Link className="button" href="/admin/media/new">+ Create media</Link>} />
      {params.deleted === "1" && <Notice title="Media deleted" tone="success">The record and its associated votes were removed.</Notice>}
      <form className="filter-form" action="/admin/media"><label className="field" htmlFor="media-search">Search media<input id="media-search" name="q" type="search" maxLength={100} defaultValue={q} placeholder="Search titles or generated text" /></label><label className="field" htmlFor="media-status">Status<select id="media-status" name="status" defaultValue={status}><option value="">All statuses</option><option value="published">Published</option><option value="pending">Pending</option><option value="failed">Failed</option></select></label><button className="button button-secondary" type="submit">Apply filters</button></form>
      {data.rows.length === 0 ? <section className="panel"><EmptyState title="Room for your next idea" description={q || status ? "No media matches these filters." : "Add an AI-generated note to begin building your collection."} action={<Link className="button" href="/admin/media/new">Create media</Link>} /></section> : <div className="media-grid">{data.rows.map((media) => <article className="panel media-card" key={media.id}><div className="media-card-top"><span className={`badge status-${media.status}`}>{media.status}</span><span className="field-hint">{media.artist_id}</span></div><h2><Link href={`/admin/media/${media.id}`}>{media.title || "Untitled creation"}</Link></h2><p className="media-excerpt">{media.caption || "This creation has no generated text yet."}</p><div className="media-tags"><span>{media.mood}</span><span>{media.scene}</span></div><div className="media-card-footer"><time dateTime={media.created_at}>{displayDate(media.created_at)}</time><Link className="text-link" href={`/admin/media/${media.id}/edit`}>Edit →</Link></div></article>)}</div>}
      <Pagination page={page} total={data.total} base="/admin/media" filters={{ q, status }} />
    </>
  );
}
