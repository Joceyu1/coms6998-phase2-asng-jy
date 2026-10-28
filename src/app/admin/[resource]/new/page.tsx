import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/admin";
import { ResourceContext } from "@/components/admin/resource-context";
import { ResourceForm } from "@/components/admin/resource-form";
import { getResourceOptions } from "@/lib/admin/resource-data";
import { getResource } from "@/lib/admin/resource-registry";

export default async function NewResourcePage({ params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params;
  const definition = getResource(resource);
  if (!definition || !definition.capabilities.create) notFound();
  const options = await getResourceOptions(definition.key);
  return <><PageHeader eyebrow="Add to your workspace" title={`Create ${definition.singular}`} description={definition.description} action={<Link className="button button-secondary" href={`/admin/${definition.key}`}>Back to {definition.title.toLowerCase()}</Link>} /><ResourceContext resource={definition.key} /><ResourceForm key={`${definition.key}:new`} definition={definition} options={options} /></>;
}
