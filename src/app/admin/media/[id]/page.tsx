import Link from "next/link";
import { notFound } from "next/navigation";

import { Notice, PageHeader } from "@/components/admin";
import { DeleteMediaForm } from "@/components/media-form";
import { getMediaItem } from "@/lib/admin/data";
import { displayDate } from "@/lib/admin/format";

export default async function MediaDetailPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const media = await getMediaItem(id);
  if (!media) notFound();
  const query = await searchParams;
  return (
    <>
      <PageHeader eyebrow="Inside the creation" title={media.title || "Untitled creation"} description={`${media.artist_id} · ${media.mood} · ${media.scene}`} action={<Link className="button" href={`/admin/media/${media.id}/edit`}>Edit media</Link>} />
      {(query.saved === "created" || query.saved === "updated") && <Notice title="Changes saved" tone="success">The media record is up to date.</Notice>}
      <div className="page-grid">
        <section className="panel"><div className="panel-header"><h2>Generated text</h2><span className={`badge status-${media.status}`}>{media.status}</span></div><p className="generated-text">{media.caption || "No generated text has been added."}</p></section>
        <section className="panel"><h2>Record details</h2><dl className="details-list"><dt>Model</dt><dd>{media.model || "Not recorded"}</dd><dt>Created · UTC</dt><dd>{displayDate(media.created_at)}</dd><dt>Creator ID</dt><dd><code>{media.user_id}</code></dd><dt>Media ID</dt><dd><code>{media.id}</code></dd></dl></section>
      </div>
      <section className="panel"><h2>Generation prompt</h2><p className="generated-text">{media.prompt}</p></section>
      <DeleteMediaForm media={media} />
    </>
  );
}
