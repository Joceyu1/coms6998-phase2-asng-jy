import Link from "next/link";

import { displayDate } from "@/lib/admin/format";
import type { ResourceRow } from "@/lib/admin/resource-registry";

type DisplayField = {
  key?: string;
  name?: string;
  label: string;
  kind?: string;
  relation?: string;
  labelKey?: string;
};

const labels: Record<string, string> = {
  source_snapshot: "Source snapshot",
  service_role_generation: "Generation record",
  stored_completion: "Saved completion",
};

export function ResourceValue({ row, field, detail = false }: {
  row: ResourceRow;
  field: DisplayField;
  detail?: boolean;
}) {
  const name = field.name || field.key || "";
  const value = row[name];
  if (value === null || value === undefined || value === "") {
    return <span className="resource-missing">Not recorded</span>;
  }
  if (field.kind === "boolean" || typeof value === "boolean") {
    return <span className={`badge ${value ? "status-published" : ""}`}>{value ? "Yes" : "No"}</span>;
  }
  if (field.kind === "date" || name.endsWith("_at")) {
    return <time dateTime={String(value)}>{displayDate(String(value))}</time>;
  }
  if (field.kind === "json" || (typeof value === "object" && value !== null)) {
    return detail ? <pre className="resource-json">{JSON.stringify(value, null, 2)}</pre> : <span>Structured response</span>;
  }
  const text = typeof value === "number" ? value.toLocaleString() : labels[String(value)] || String(value);
  if (field.relation && typeof value === "string") {
    const label = field.labelKey && row[field.labelKey] ? String(row[field.labelKey]) : text;
    return <Link className="text-link" href={`/admin/${field.relation}/${encodeURIComponent(value)}`}>{label}</Link>;
  }
  if (field.kind === "badge" || name === "status") {
    const status = ["published", "pending", "failed"].includes(String(value)) ? ` status-${value}` : "";
    return <span className={`badge${status}`}>{text}</span>;
  }
  return <span className={detail ? "resource-long-text" : "resource-cell-text"}>{text}</span>;
}
