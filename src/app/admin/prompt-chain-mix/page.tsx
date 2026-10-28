import Link from "next/link";

import { EmptyState, Notice, PageHeader, StatCard } from "@/components/admin";
import { PromptMixForm } from "@/components/admin/mix-form";
import { getPromptMix } from "@/lib/admin/resource-data";

export default async function PromptChainMixPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const mix = await getPromptMix();
  const active = mix.rows.filter((row) => row.is_active);
  const weight = active.reduce((sum, row) => sum + Number(row.weight), 0);
  return <>
    <PageHeader eyebrow="A balance of ideas" title="Configured chain mix" description="Read and update the relative weights assigned to recorded prompt chains." action={<Link className="button button-secondary" href="/admin/prompt-chains">Explore chains</Link>} />
    <Notice title="Configuration catalog">These weights describe the configured chain mix. The original generator does not consume this routing catalog, so changing it does not reroute existing generation requests.</Notice>
    {(query.saved === "updated" || query.saved === "1") && <Notice tone="success" title="Chain mix saved">The configured weights and active selections are up to date.</Notice>}
    <div className="stats-grid mix-stats"><StatCard label="Configured chains" value={mix.total.toLocaleString()} detail="Recorded allocation entries" /><StatCard label="Active chains" value={active.length.toLocaleString()} detail="Enabled in the configured mix" tone="teal" /><StatCard label="Active weight" value={weight.toLocaleString()} detail="Relative units, not a percentage" tone="amber" /></div>
    {mix.rows.length ? <PromptMixForm rows={mix.rows} /> : <section className="panel"><EmptyState title="No chain mix recorded" description="Configured allocations appear after prompt chains and their mix entries are saved." action={<Link className="button button-secondary" href="/admin/prompt-chains">Read prompt chains</Link>} /></section>}
  </>;
}
