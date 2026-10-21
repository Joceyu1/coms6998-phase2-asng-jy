import Link from "next/link";
import { PrismMark } from "@/components/admin";

export default function AccessDeniedPage() {
  return <main className="access-denied-page"><div className="access-denied-card"><PrismMark /><p className="eyebrow">ACCESS RESTRICTED</p><h1>This workspace is invite-only.</h1><p>Your account does not currently have superadmin access. Ask the project owner to approve your profile through the trusted database dashboard.</p><p className="muted">If you signed in with a different account, sign out and use your approved Google account.</p><div className="form-actions"><form action="/auth/signout" method="post"><button className="button" type="submit">Sign out</button></form><Link className="button button-secondary" href="/login">Return to sign-in</Link></div></div></main>;
}
