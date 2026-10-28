"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { updatePromptMixAction } from "@/lib/admin/resource-actions";
import type { ResourceActionState } from "@/lib/admin/resource-registry";

type MixRow = { id: string; chain_id: string; chain_name: string; weight: number; is_active: boolean; updated_at: string };
const colors = ["#8b70f2", "#22b8a0", "#ed9472", "#e3b54f", "#6a9dd0", "#bc79a9"];

export function PromptMixForm({ rows }: { rows: MixRow[] }) {
  const [state, action, pending] = useActionState<ResourceActionState, FormData>(updatePromptMixAction, {});
  const [weights, setWeights] = useState<Record<string, string>>(() => Object.fromEntries(rows.map((row) => [row.id, String(row.weight)])));
  const [active, setActive] = useState<Record<string, boolean>>(() => Object.fromEntries(rows.map((row) => [row.id, row.is_active])));
  const values = rows.map((row) => ({ ...row, value: active[row.id] && Number.isFinite(Number(weights[row.id])) ? Math.min(1000, Math.max(0, Number(weights[row.id]))) : 0 }));
  const total = values.reduce((sum, row) => sum + row.value, 0);

  return <form action={action} className="panel mix-panel">
    <div className="panel-header"><div><p className="eyebrow">Allocation preview</p><h2>Relative chain weights</h2></div><span className="badge">{values.filter((row) => row.value > 0).length} allocated</span></div>
    <p className="field-hint">Weights describe a relative allocation. For example, weights 2 and 1 correspond to shares of about 67% and 33%. They do not need to add up to 100.</p>
    {state.message && <p role="alert" className="form-message">{state.message}</p>}
    {(state.errors?.mix || state.errors?.form) && <p className="field-error" role="alert">{state.errors.mix || state.errors.form}</p>}
    <figure className="mix-preview"><figcaption>Configured allocation preview</figcaption>{total > 0 ? <><div className="distribution-track" aria-hidden="true">{values.map((row, index) => row.value > 0 ? <span key={row.id} style={{ width: `${row.value / total * 100}%`, backgroundColor: colors[index % colors.length] }} /> : null)}</div><ul className="distribution-legend">{values.map((row, index) => <li key={row.id}><span><span className="legend-dot" style={{ backgroundColor: colors[index % colors.length] }} />{row.chain_name}</span><strong>{total > 0 ? Math.round(row.value / total * 100) : 0}%</strong></li>)}</ul></> : <p className="mix-unallocated">No positive active allocation. Enable a chain and give it a weight above zero.</p>}</figure>
    <div className="mix-records">{rows.map((row, index) => {
      const error = state.errors?.[`weight_${row.id}`] || state.errors?.[row.id];
      return <div className="mix-record" key={row.id}><div className="mix-record-heading"><span className="mix-chain-dot" style={{ backgroundColor: colors[index % colors.length] }} aria-hidden="true" /><div><h3><Link className="text-link" href={`/admin/prompt-chains/${row.chain_id}`}>{row.chain_name}</Link></h3><p className="field-hint">{active[row.id] ? "Included in configured allocation" : "Excluded from configured allocation"}</p></div></div><label className="resource-checkbox-label" htmlFor={`mix-active-${row.id}`}><input id={`mix-active-${row.id}`} name={`active_${row.id}`} type="checkbox" checked={active[row.id]} onChange={(event) => setActive((value) => ({ ...value, [row.id]: event.target.checked }))} />Active</label><label className="field mix-weight-field" htmlFor={`mix-weight-${row.id}`}>Weight<input id={`mix-weight-${row.id}`} name={`weight_${row.id}`} type="number" min={0} max={1000} step={1} required value={weights[row.id]} onChange={(event) => setWeights((value) => ({ ...value, [row.id]: event.target.value }))} aria-invalid={Boolean(error)} aria-describedby={error ? `mix-weight-error-${row.id}` : undefined} />{error && <span id={`mix-weight-error-${row.id}`} className="field-error">{error}</span>}</label></div>;
    })}</div>
    <div className="form-actions"><button className="button" type="submit" disabled={pending}>{pending ? "Saving mix…" : "Save configured mix"}</button><span className="field-hint">All displayed weights are saved together.</span></div>
    <span className="sr-only" role="status">{pending ? "Saving configured chain mix" : ""}</span>
  </form>;
}
