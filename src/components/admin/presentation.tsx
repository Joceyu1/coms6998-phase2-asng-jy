import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <header className="page-header"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p className="page-description">{description}</p>}</div>{action && <div className="page-actions">{action}</div>}</header>;
}

export function StatCard({ label, value, detail, tone = "violet" }: { label: string; value: string; detail?: string; tone?: "violet" | "teal" | "amber" | "rose" }) {
  return <section className={`stat-card tone-${tone}`}><div className="stat-heading"><h2>{label}</h2><span className="stat-decoration" aria-hidden="true">↗</span></div><p className="stat-value">{value}</p>{detail && <p className="stat-detail">{detail}</p>}</section>;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="empty-state"><span className="empty-symbol" aria-hidden="true">◈</span><h3>{title}</h3><p>{description}</p>{action && <div className="empty-action">{action}</div>}</div>;
}

export function Notice({ title, children, tone = "info" }: { title: string; children: ReactNode; tone?: "info" | "error" | "success" }) {
  return <section className={`notice notice-${tone}`} role={tone === "error" ? "alert" : "status"}><span className="notice-icon" aria-hidden="true">{tone === "error" ? "!" : tone === "success" ? "✓" : "i"}</span><div><h2>{title}</h2><div className="notice-content">{children}</div></div></section>;
}
