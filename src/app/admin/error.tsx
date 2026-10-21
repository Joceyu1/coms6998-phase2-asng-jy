"use client";

export default function AdminError({ reset }: { reset: () => void }) {
  return <section className="panel" role="alert"><p className="eyebrow">Something needs attention</p><h1>We couldn’t load this view.</h1><p>The database may be temporarily unavailable or its approved admin configuration may still be pending.</p><button type="button" className="button" onClick={reset}>Try again</button></section>;
}
