import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/admin";
import { ResourceContext } from "@/components/admin/resource-context";
import { ResourceForm } from "@/components/admin/resource-form";
import { getResourceItem, getResourceOptions } from "@/lib/admin/resource-data";
import { getResource } from "@/lib/admin/resource-registry";

export default async function EditResourcePage({ params }: { params: Promise<{ resource: string; id: string }> }) {
  const { resource, id } = await params;
  const definition = getResource(resource);
  if (!definition || !definition.capabilities.update) notFound();
  const row = await getResourceItem(definition.key, id);
  if (!row) notFound();
  const options = await getResourceOptions(definition.key);
  return <><PageHeader eyebrow={definition.title} title={`Edit ${definition.singular}`} description={definition.description} action={<Link className="button button-secondary" href={`/admin/${definition.key}/${row.id}`}>Back to record</Link>} /><ResourceContext resource={definition.key} /><ResourceForm key={`${definition.key}:${row.id}`} definition={definition} row={row} options={options} /></>;
}
