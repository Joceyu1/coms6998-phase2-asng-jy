import Link from "next/link";
import { notFound } from "next/navigation";

import { Notice, PageHeader } from "@/components/admin";
import { ResourceContext } from "@/components/admin/resource-context";
import { DeleteResourceForm } from "@/components/admin/resource-form";
import { ResourceValue } from "@/components/admin/resource-value";
import { getResourceItem, getResources } from "@/lib/admin/resource-data";
import { getResource } from "@/lib/admin/resource-registry";

export default async function ResourceDetailPage({ params, searchParams }: {
  params: Promise<{ resource: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { resource, id } = await params;
  const definition = getResource(resource);
  if (!definition) notFound();
  const row = await getResourceItem(definition.key, id);
  if (!row) notFound();
  const query = await searchParams;
  const title = String(row.name || row.term || row.domain || row.email || row.output_title || definition.singular);
  const fields = (definition.detailFields || definition.fields.map((field) => ({ name: field.name, label: field.label, relation: field.relation }))).filter((field) => field.name !== "created_at" && field.name !== "updated_at");
  const steps = definition.key === "prompt-chains" ? await getResources("prompt-chain-steps", 1, "", row.id) : null;
  return <>
    <PageHeader eyebrow={definition.title} title={title} description={definition.description} action={<><Link className="button button-secondary" href={`/admin/${definition.key}`}>Back to list</Link>{definition.capabilities.update && <Link className="button" href={`/admin/${definition.key}/${row.id}/edit`}>Edit {definition.singular}</Link>}</>} />
    <ResourceContext resource={definition.key} />
    {(query.saved === "created" || query.saved === "updated") && <Notice tone="success" title="Changes saved">The {definition.singular} is up to date.</Notice>}
    <section className="panel"><h2>Record details</h2><dl className="details-list resource-details">{fields.map((field) => <div className="resource-detail-pair" key={field.name}><dt>{field.label}</dt><dd><ResourceValue row={row} field={field} detail /></dd></div>)}<div className="resource-detail-pair"><dt>Record ID</dt><dd><code>{row.id}</code></dd></div>{Boolean(row.created_at) && <div className="resource-detail-pair"><dt>Created · UTC</dt><dd><ResourceValue row={row} field={{ name: "created_at", label: "Created", kind: "date" }} detail /></dd></div>}{Boolean(row.updated_at) && <div className="resource-detail-pair"><dt>Updated · UTC</dt><dd><ResourceValue row={row} field={{ name: "updated_at", label: "Updated", kind: "date" }} detail /></dd></div>}</dl></section>
    {steps && <section className="panel resource-related"><div className="panel-header"><div><p className="eyebrow">From instruction to output</p><h2>Ordered prompt steps</h2></div><span className="badge">{steps.total} {steps.total === 1 ? "step" : "steps"}</span></div>{steps.rows.length ? <ol className="prompt-step-list">{steps.rows.map((step) => <li key={step.id}><span className="prompt-step-position">{String(step.position)}</span><div><div className="prompt-step-heading"><h3>{String(step.role || "Prompt")}</h3><Link className="text-link" href={`/admin/prompt-chain-steps/${step.id}`}>View step →</Link></div><p className="resource-long-text">{String(step.template || "No template recorded.")}</p>{Boolean(step.model_name) && <p className="field-hint">Model: {String(step.model_name)}</p>}</div></li>)}</ol> : <p className="field-hint">No prompt steps have been recorded for this chain.</p>}<div className="form-actions"><Link className="button button-secondary" href={`/admin/prompt-chain-steps?filter=${row.id}`}>View all chain steps</Link><Link className="button button-secondary" href="/admin/prompt-chain-mix">Configured chain mix</Link></div></section>}
    {definition.capabilities.delete && <DeleteResourceForm definition={definition} row={row} />}
  </>;
}
