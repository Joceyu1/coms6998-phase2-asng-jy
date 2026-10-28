"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const groups = [
  { label: "Community", destinations: [
    { href: "/admin", label: "Overview", icon: "overview" },
    { href: "/admin/media", label: "Media library", icon: "media" },
    { href: "/admin/profiles", label: "People", icon: "people" },
    { href: "/admin/ratings", label: "Community ratings", icon: "ratings" },
    { href: "/admin/images", label: "Images", icon: "image" },
  ] },
  { label: "Prompt workspace", destinations: [
    { href: "/admin/prompt-chains", label: "Prompt chains", icon: "chain" },
    { href: "/admin/prompt-chain-steps", label: "Chain steps", icon: "steps" },
    { href: "/admin/prompt-chain-mix", label: "Chain mix", icon: "mix" },
    { href: "/admin/terms", label: "Terms", icon: "terms" },
    { href: "/admin/generation-examples", label: "AI examples", icon: "media" },
  ] },
  { label: "Observability", destinations: [
    { href: "/admin/generation-requests", label: "Generation requests", icon: "requests" },
    { href: "/admin/llm-responses", label: "LLM responses", icon: "responses" },
  ] },
  { label: "Configuration", destinations: [
    { href: "/admin/llm-providers", label: "LLM providers", icon: "provider" },
    { href: "/admin/llm-models", label: "LLM models", icon: "model" },
    { href: "/admin/allowed-signup-domains", label: "Signup domains", icon: "domain" },
    { href: "/admin/whitelisted-emails", label: "Email whitelist", icon: "email" },
  ] },
] as const;

function NavigationIcon({ icon }: { icon: string }) {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {icon === "overview" && <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>}
      {icon === "media" && <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 9h10M7 13h10M7 17h6" /></>}
      {icon === "people" && <><circle cx="9" cy="8" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M21 21v-3a6 6 0 0 0-3-5.2" /></>}
      {icon === "ratings" && <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" />}
      {icon === "image" && <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8" cy="8" r="1.5" /><path d="m3 17 6-6 4 4 3-3 5 5" /></>}
      {icon === "chain" && <><path d="m10 14 4-4M8 16l-1 1a4.2 4.2 0 0 1-6-6l4-4a4.2 4.2 0 0 1 6 0M16 8l1-1a4.2 4.2 0 0 1 6 6l-4 4a4.2 4.2 0 0 1-6 0" transform="translate(1 -1) scale(.9)" /></>}
      {icon === "steps" && <><path d="M9 5h12M9 12h12M9 19h12" /><circle cx="4" cy="5" r="1" /><circle cx="4" cy="12" r="1" /><circle cx="4" cy="19" r="1" /></>}
      {icon === "mix" && <><path d="M4 8h16M4 16h16" /><circle cx="9" cy="8" r="3" /><circle cx="15" cy="16" r="3" /></>}
      {icon === "terms" && <><path d="M4 4h7a3 3 0 0 1 3 3v14a4 4 0 0 0-4-3H4ZM20 4h-3a3 3 0 0 0-3 3v14a4 4 0 0 1 4-3h2Z" /></>}
      {icon === "requests" && <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h4" /></>}
      {icon === "responses" && <><path d="M21 11a8 8 0 0 1-8 8H5l-3 3V5a3 3 0 0 1 3-3h8a8 8 0 0 1 8 9Z" /><path d="M7 8h8M7 12h5" /></>}
      {(icon === "provider" || icon === "model") && <><rect x="4" y="4" width="16" height="16" rx={icon === "model" ? 5 : 2} /><path d="M8 8h8v8H8ZM9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3" /></>}
      {icon === "domain" && <><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3 12h18M5 6h14M5 18h14" /></>}
      {icon === "email" && <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 6 9 7 9-7" /></>}
    </svg>
  );
}

export function AdminNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const destinations = groups.flatMap((group) => [...group.destinations]);
  const current = destinations.find(({ href }) => href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(href + "/"))?.href || "/admin";
  return (
    <nav className="admin-navigation" aria-label="Administration">
      <div className="mobile-navigation"><label htmlFor="workspace-page">Workspace pages<select id="workspace-page" value={current} onChange={(event) => { const destination = event.target.value; if (destinations.some((item) => item.href === destination)) router.push(destination); }}>{groups.map((group) => <optgroup key={group.label} label={group.label}>{group.destinations.map(({ href, label }) => <option key={href} value={href}>{label}</option>)}</optgroup>)}</select></label></div>
      <div className="navigation-groups">{groups.map((group) => <div className="nav-group" key={group.label}><p className="nav-group-title">{group.label}</p>{group.destinations.map(({ href, label, icon }) => {
          const active = current === href;
          return <Link key={href} href={href} className={`nav-link${active ? " active" : ""}`} aria-current={active ? "page" : undefined}><NavigationIcon icon={icon} /><span>{label}</span>{active && <span className="nav-active-dot" aria-hidden="true" />}</Link>;
        })}</div>)}</div>
    </nav>
  );
}
