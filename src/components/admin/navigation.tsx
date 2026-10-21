"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const destinations = [
  { href: "/admin", label: "Overview", icon: "overview" },
  { href: "/admin/media", label: "Media library", icon: "media" },
  { href: "/admin/profiles", label: "People", icon: "people" },
  { href: "/admin/ratings", label: "Community ratings", icon: "ratings" },
] as const;

function NavigationIcon({ icon }: { icon: string }) {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {icon === "overview" && <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>}
      {icon === "media" && <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 9h10M7 13h10M7 17h6" /></>}
      {icon === "people" && <><circle cx="9" cy="8" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M21 21v-3a6 6 0 0 0-3-5.2" /></>}
      {icon === "ratings" && <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" />}
    </svg>
  );
}

export function AdminNavigation() {
  const pathname = usePathname();
  return (
    <nav className="admin-navigation" aria-label="Administration">
      {destinations.map(({ href, label, icon }) => {
        const active = href === "/admin" ? pathname === href : pathname.startsWith(href + "/") || pathname === href;
        return <Link key={href} href={href} className={`nav-link${active ? " active" : ""}`} aria-current={active ? "page" : undefined}><NavigationIcon icon={icon} /><span>{label}</span>{active && <span className="nav-active-dot" aria-hidden="true" />}</Link>;
      })}
    </nav>
  );
}
