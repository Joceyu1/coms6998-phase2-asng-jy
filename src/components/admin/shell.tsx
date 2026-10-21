import type { ReactNode } from "react";
import Link from "next/link";
import { AdminNavigation } from "./navigation";

export function PrismMark() {
  return <svg className="prism-mark" width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true"><rect width="36" height="36" rx="11" fill="currentColor" /><path d="m18 7 11 20H7L18 7Z" fill="white" fillOpacity=".95" /><path d="m18 7 3 20H7L18 7Z" fill="#C4B5FD" /><path d="m18 7 11 20h-8L18 7Z" fill="#99F6E4" /></svg>;
}

export function AdminShell({ children, userEmail }: { children: ReactNode; userEmail?: string }) {
  return (
    <div className="admin-app">
      <a className="skip-link" href="#admin-content">Skip to content</a>
      <aside className="sidebar">
        <Link className="brand" href="/admin" aria-label="Prism Admin overview"><PrismMark /><span>prism<span className="brand-subtitle">ADMIN STUDIO</span></span></Link>
        <p className="sidebar-label">WORKSPACE</p>
        <AdminNavigation />
        <div className="sidebar-bottom">
          <div className="sidebar-note"><span className="security-dot" />Superadmin workspace</div>
          <div className="session-user"><span className="session-avatar" aria-hidden="true">{userEmail?.charAt(0).toUpperCase() || "A"}</span><div><strong>Administrator</strong><span title={userEmail}>{userEmail || "Approved Google account"}</span></div></div>
          <form action="/auth/signout" method="post"><button className="sidebar-signout" type="submit">Sign out <span aria-hidden="true">↗</span></button></form>
        </div>
      </aside>
      <div className="admin-workspace">
        <header className="workspace-header"><span>Workspace <span aria-hidden="true">/</span> <strong>Administration</strong></span><span className="access-badge"><span aria-hidden="true">◈</span> Restricted access</span><form className="mobile-signout" action="/auth/signout" method="post"><button type="submit">Sign out</button></form></header>
        <main id="admin-content" className="admin-main">{children}</main>
        <footer className="workspace-footer"><span>Prism Admin</span><span>COMS6998 · Phase 2</span></footer>
      </div>
    </div>
  );
}
