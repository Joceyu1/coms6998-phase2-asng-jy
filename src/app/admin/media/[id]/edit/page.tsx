import { notFound } from "next/navigation";

import { PageHeader } from "@/components/admin";
import { MediaForm } from "@/components/media-form";
import { getMediaItem } from "@/lib/admin/data";

export default async function EditMediaPage({ params }: { params: Promise<{ id: string }> }) {
  const media = await getMediaItem((await params).id);
  if (!media) notFound();
  return <><PageHeader eyebrow="Keep the collection considered" title="Edit media" description="Update content and publication status. The original creator and creation date are preserved." /><MediaForm media={media} /></>;
}
