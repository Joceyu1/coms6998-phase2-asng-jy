"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { deleteResourceAction, saveResourceAction } from "@/lib/admin/resource-actions";
import type { ResourceActionState, ResourceDefinition, ResourceOptions, ResourceRow } from "@/lib/admin/resource-registry";

export function ResourceForm({ definition, row, options }: {
  definition: ResourceDefinition;
  row?: ResourceRow;
  options: ResourceOptions;
}) {
  const [state, action, pending] = useActionState<ResourceActionState, FormData>(saveResourceAction, {});
  const [values, setValues] = useState<Record<string, string | boolean>>(() => Object.fromEntries(definition.fields.map((field) => {
    const value = row ? row[field.name] : field.defaultValue;
    return [field.name, field.type === "checkbox" ? value === true : value === null || value === undefined ? "" : String(value)];
  })));
  const unavailableRelations = definition.fields.filter((field) => field.required && field.relation && !(options[field.name]?.length));

  return <form action={action} className="panel form-panel resource-form">
    <input type="hidden" name="resource" value={definition.key} />
    {row && <input type="hidden" name="id" value={row.id} />}
    {state.message && <p className="form-message" role="alert">{state.message}</p>}
    {state.errors?.form && <p className="field-error" role="alert">{state.errors.form}</p>}
    {unavailableRelations.length > 0 && <div className="notice notice-info"><div><h2>A related record is needed first</h2><p>{unavailableRelations.map((field) => field.label).join(", ")} has no available records. Add the related record before saving this form.</p>{unavailableRelations.map((field) => <Link className="text-link" key={field.name} href={`/admin/${field.relation}`}>Manage {field.label.toLowerCase()} →</Link>)}</div></div>}
    <div className="form-grid">
      {definition.fields.map((field) => {
        const id = `resource-${field.name}`;
        const error = state.errors?.[field.name];
        const hintId = `${id}-hint`;
        const errorId = `${id}-error`;
        const describedBy = [field.hint ? hintId : "", error ? errorId : ""].filter(Boolean).join(" ") || undefined;
        const common = { id, name: field.name, required: field.required, "aria-invalid": Boolean(error), "aria-describedby": describedBy };
        const value = values[field.name];
        const text = typeof value === "string" ? value : "";
        const updateText = (next: string) => setValues((current) => ({ ...current, [field.name]: next }));
        const choices = field.relation ? options[field.name] || [] : field.options || [];
        const full = field.type === "textarea";
        return <label key={field.name} className={`field${full ? " field-full" : ""}${field.type === "checkbox" ? " resource-checkbox-field" : ""}`} htmlFor={id}>
          {field.type === "checkbox" ? <span className="resource-checkbox-label"><input {...common} type="checkbox" checked={value === true} onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.checked }))} />{field.label}</span> : <span className="resource-field-label">{field.label}{field.required && <span className="required-label">Required</span>}</span>}
          {field.type === "textarea" ? <textarea {...common} rows={field.name === "output" ? 8 : 5} maxLength={field.maxLength} value={text} onChange={(event) => updateText(event.target.value)} /> : field.type === "select" || field.relation ? <select {...common} value={text} onChange={(event) => updateText(event.target.value)}><option value="">{field.required ? `Choose ${field.label.toLowerCase()}` : "None"}</option>{choices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}</select> : field.type !== "checkbox" ? <input {...common} type={field.type} value={text} onChange={(event) => updateText(event.target.value)} maxLength={field.maxLength} min={field.min} max={field.max} step={field.step} autoComplete={field.type === "email" ? "off" : undefined} /> : null}
          {field.hint && <span className="field-hint" id={hintId}>{field.hint}</span>}
          {error && <span className="field-error" id={errorId}>{error}</span>}
        </label>;
      })}
    </div>
    <div className="form-actions"><button type="submit" className="button" disabled={pending || unavailableRelations.length > 0}>{pending ? "Saving…" : row ? "Save changes" : `Create ${definition.singular}`}</button><Link className="button button-secondary" href={row ? `/admin/${definition.key}/${row.id}` : `/admin/${definition.key}`}>Cancel</Link></div>
    <span className="sr-only" role="status">{pending ? "Saving record" : ""}</span>
  </form>;
}

export function DeleteResourceForm({ definition, row }: { definition: ResourceDefinition; row: ResourceRow }) {
  const [state, action, pending] = useActionState<ResourceActionState, FormData>(deleteResourceAction, {});
  return <section className="panel danger-zone" aria-labelledby="resource-delete-heading"><h2 id="resource-delete-heading">Delete this {definition.singular}</h2><p>This permanently removes the record. A record still used by related data cannot be deleted.</p><form action={action} className="delete-form"><input type="hidden" name="resource" value={definition.key} /><input type="hidden" name="id" value={row.id} /><label className="field" htmlFor="resource-delete-confirmation">Type DELETE to confirm<input id="resource-delete-confirmation" name="confirmation" required pattern="DELETE" autoComplete="off" /></label>{(state.message || state.errors?.confirmation) && <p className="field-error" role="alert">{state.message || state.errors?.confirmation}</p>}<button type="submit" className="button button-danger" disabled={pending}>{pending ? "Deleting…" : "Permanently delete"}</button></form></section>;
}
