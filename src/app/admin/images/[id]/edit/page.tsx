import { notFound } from "next/navigation";

import { PageHeader } from "@/components/admin";
import { ImageForm } from "@/components/admin/image-manager";
import { getImage } from "@/lib/admin/images";
import { isManagedImagePath } from "@/lib/admin/image-validation";

export default async function EditImagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const image = await getImage(id);
  if (!image || !isManagedImagePath(image.name)) notFound();
  return <><PageHeader eyebrow="A thoughtful update" title={`Edit ${image.display_name}`} description="Change the name and description, or replace the image while keeping its address." /><ImageForm image={image} /></>;
}
