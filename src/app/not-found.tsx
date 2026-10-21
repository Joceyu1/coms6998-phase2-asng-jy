import Link from "next/link";

export default function NotFound() {
  return <main className="standalone-page"><section className="panel"><p className="eyebrow">404</p><h1>This page isn’t in the collection.</h1><p>Check the address or return to your workspace.</p><Link href="/admin" className="button">Go to dashboard</Link></section></main>;
}
