import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState, Notice, PageHeader } from "@/components/admin";
import { ResourceContext } from "@/components/admin/resource-context";
import { ResourceValue } from "@/components/admin/resource-value";
import { Pagination } from "@/components/pagination";
import { getResources } from "@/lib/admin/resource-data";
import { getResource } from "@/lib/admin/resource-registry";
import { isUuid, pageNumber, searchTerm } from "@/lib/admin/validation";

export default async function ResourceListPage({ params, searchParams }: {
  params: Promise<{ resource: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { resource } = await params;
  const definition = getResource(resource);
  if (!definition) notFound();
  const query = await searchParams;
  const page = pageNumber(query.page);
  const q = searchTerm(query.q);
  const filter = definition.key === "prompt-chain-steps" && isUuid(query.filter) ? query.filter : "";
  const result = await getResources(definition.key, page, q, filter);
  const base = `/admin/${definition.key}`;

  return <>
    <PageHeader eyebrow="Your administration workspace" title={definition.title} description={definition.description} action={definition.capabilities.create ? <Link className="button" href={`${base}/new`}>+ Create {definition.singular}</Link> : undefined} />
    <ResourceContext resource={definition.key} />
    {query.deleted === "1" && <Notice tone="success" title="Record deleted">The {definition.singular} was removed.</Notice>}
    {filter && <Notice title="Showing one prompt chain">{result.rows[0]?.chain_name ? String(result.rows[0].chain_name) : "The steps below belong to the selected chain."} <Link className="text-link" href={base}>Show all chains →</Link></Notice>}
    <form action={base} className="filter-form">{filter && <input type="hidden" name="filter" value={filter} />}<label className="field" htmlFor="resource-search">Search {definition.title.toLowerCase()}<input id="resource-search" name="q" type="search" maxLength={100} defaultValue={q} placeholder={`Find ${definition.title.toLowerCase()}`} /></label><button className="button button-secondary" type="submit">Search</button></form>
    <section className="panel">
      {result.rows.length === 0 ? <EmptyState title={q ? "No matching records" : `No ${definition.title.toLowerCase()} yet`} description={q ? "Try a different search term." : definition.capabilities.create ? `Create a ${definition.singular} to start this collection.` : "Records appear here when they are saved by the generation workflow."} action={definition.capabilities.create ? <Link className="button" href={`${base}/new`}>Create {definition.singular}</Link> : undefined} /> : <div className="table-wrap"><table className="data-table resource-table"><thead><tr>{definition.columns.map((column) => <th key={column.key} scope="col">{column.label}</th>)}<th scope="col"><span className="sr-only">Open record</span></th></tr></thead><tbody>{result.rows.map((row) => <tr key={row.id}>{definition.columns.map((column) => <td key={column.key}><ResourceValue row={row} field={column} /></td>)}<td className="resource-row-action"><Link className="text-link" href={`${base}/${row.id}`}>View <span aria-hidden="true">→</span><span className="sr-only"> {definition.singular}</span></Link></td></tr>)}</tbody></table></div>}
      <Pagination page={page} total={result.total} base={base} filters={{ q, ...(filter ? { filter } : {}) }} />
    </section>
  </>;
}
