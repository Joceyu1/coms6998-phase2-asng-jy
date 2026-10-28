import Image from "next/image";
import Link from "next/link";

import { EmptyState, Notice, PageHeader } from "@/components/admin";
import { Pagination } from "@/components/pagination";
import { getImages } from "@/lib/admin/images";
import { imageSize } from "@/lib/admin/image-validation";
import { pageNumber, searchTerm } from "@/lib/admin/validation";

export default async function ImagesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams; const page = pageNumber(params.page); const q = searchTerm(params.q);
  const images = await getImages(page, q);
  return <>
    <PageHeader eyebrow="A place for every picture" title="Image library" description="View and manage private uploaded images, including profile avatars." action={<Link className="button" href="/admin/images/new">+ Upload image</Link>} />
    {params.deleted === "1" && <Notice title="Image deleted" tone="success">The stored image and its details were removed. Profiles that used it no longer reference it.</Notice>}
    <form className="filter-form" action="/admin/images"><label htmlFor="image-search" className="field">Search images<input id="image-search" name="q" type="search" maxLength={100} defaultValue={q} placeholder="Search names, paths, or descriptions" /></label><button className="button button-secondary" type="submit">Search</button></form>
    {images.rows.length === 0 ? <section className="panel"><EmptyState title={q ? "No matching images" : "Your image collection starts here"} description={q ? "Try a different search." : "Existing profile images and new uploads appear here. Images remain private."} action={<Link className="button" href="/admin/images/new">Upload image</Link>} /></section> : <div className="image-grid">{images.rows.map((image) => <article className="panel image-card" key={image.id}>
      <Link href={`/admin/images/${image.id}`} aria-label={`View ${image.display_name}`}>{image.signed_url ? <Image src={image.signed_url} alt={image.alt_text || image.display_name} width={640} height={480} unoptimized className="image-card-preview" referrerPolicy="no-referrer" /> : <div className="image-preview-placeholder">Preview unavailable</div>}</Link>
      <h2><Link className="text-link" href={`/admin/images/${image.id}`}>{image.display_name}</Link></h2><p className="field-hint">{imageSize(image.size)} · {image.mime_type?.replace("image/", "").toUpperCase() || "Image"}</p>{image.alt_text && <p>{image.alt_text}</p>}<div className="image-card-footer"><span className="badge">{image.referenced_profiles > 0 ? "Profile image" : "Private upload"}</span><Link className="text-link" href={`/admin/images/${image.id}/edit`}>Edit →</Link></div>
    </article>)}</div>}
    <Pagination page={page} total={images.total} base="/admin/images" filters={{ q }} />
  </>;
}
