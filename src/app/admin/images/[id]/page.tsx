import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Notice, PageHeader } from "@/components/admin";
import { DeleteImageForm } from "@/components/admin/image-manager";
import { displayDate } from "@/lib/admin/format";
import { getImage } from "@/lib/admin/images";
import { imageSize, isManagedImagePath } from "@/lib/admin/image-validation";

export default async function ImageDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params; const image = await getImage(id); if (!image) notFound();
  const query = await searchParams; const managed = isManagedImagePath(image.name);
  return <>
    <PageHeader eyebrow="Inside the image" title={image.display_name} description={image.alt_text || "A private image in your application’s collection."} action={managed && <Link className="button" href={`/admin/images/${image.id}/edit`}>Edit image</Link>} />
    {(query.saved === "created" || query.saved === "updated") && <Notice title="Image saved" tone="success">The image and its details are up to date.</Notice>}
    <div className="image-detail-layout"><section className="panel">{image.signed_url ? <Image src={image.signed_url} alt={image.alt_text || image.display_name} width={1200} height={900} unoptimized priority className="image-detail-preview" referrerPolicy="no-referrer" /> : <div className="image-preview-placeholder">Preview unavailable. Refresh to request a new private viewing link.</div>}<p className="field-hint">Viewing links expire after five minutes. The image stays private.</p></section><section className="panel"><h2>Image details</h2><dl className="details-list"><dt>Format</dt><dd>{image.mime_type || "Not recorded"}</dd><dt>Size</dt><dd>{imageSize(image.size)}</dd><dt>Uploaded · UTC</dt><dd>{displayDate(image.created_at)}</dd><dt>Updated · UTC</dt><dd>{displayDate(image.updated_at)}</dd><dt>Profiles using this image</dt><dd>{image.referenced_profiles}</dd><dt>Storage path</dt><dd className="image-filename"><code>{image.name}</code></dd><dt>Image ID</dt><dd><code>{image.id}</code></dd></dl></section></div>
    {!managed ? <Notice title="Legacy image path">This image uses an unfamiliar storage address. Review its storage setup before editing or deleting it.</Notice> : <DeleteImageForm image={image} />}
  </>;
}
