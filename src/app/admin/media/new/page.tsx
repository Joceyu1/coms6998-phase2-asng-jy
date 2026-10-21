import { PageHeader } from "@/components/admin";
import { MediaForm } from "@/components/media-form";
import { requireSuperadmin } from "@/lib/auth/session";

export default async function NewMediaPage() {
  await requireSuperadmin();
  return <><PageHeader eyebrow="Make room for a new creation" title="Create media" description="Register generated text and its source details. Only published records appear in the creation app's public collection." /><MediaForm /></>;
}
