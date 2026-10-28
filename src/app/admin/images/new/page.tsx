import { PageHeader } from "@/components/admin";
import { ImageForm } from "@/components/admin/image-manager";
import { requireSuperadmin } from "@/lib/auth/session";

export default async function NewImagePage() {
  await requireSuperadmin();
  return <><PageHeader eyebrow="Grow the collection" title="Upload an image" description="Add a JPG, PNG, or WebP image to private storage." /><ImageForm /></>;
}
