import { PrismMark } from "@/components/admin";

const messages: Record<string, string> = {
  configuration: "Sign-in is not configured yet. Contact the workspace administrator.",
  google_disabled: "Google sign-in is not enabled yet. The project owner needs to enable Google in Supabase Authentication settings.",
  oauth_unavailable: "Google sign-in is currently unavailable. Please try again after the administrator checks the sign-in configuration.",
  callback_failed: "We couldn’t complete your sign-in. Please try again.",
  google_required: "Use your approved Google account to access this workspace.",
  signout_failed: "We couldn’t finish signing you out. Please try again.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string | string[] }> }) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : undefined;
  const message = error
    ? Object.hasOwn(messages, error)
      ? messages[error]
      : "Sign-in could not be completed. Please try again."
    : undefined;
  return (
    <main className="auth-page">
      <section className="auth-story" aria-label="Prism Admin">
        <div className="brand"><PrismMark /><span>prism<span className="brand-subtitle">ADMIN STUDIO</span></span></div>
        <div className="auth-story-copy"><p className="eyebrow">YOUR CREATIVE COMMUNITY, IN FOCUS</p><h1>A clearer view.<br />A thoughtful touch.</h1><p>Understand what your community creates, discover what resonates, and keep your media library in good hands.</p></div>
        <div className="prism-art" aria-hidden="true"><div className="art-grid" /><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><div className="art-prism" /><span className="art-point point-one" /><span className="art-point point-two" /></div>
        <span className="auth-story-footer">COMS6998 · Phase 2</span>
      </section>
      <section className="auth-form-side"><div className="auth-card"><span className="auth-access-label"><span className="security-dot" />PRIVATE WORKSPACE</span><h2>Welcome to Prism.</h2><p className="auth-intro">Sign in to your administration workspace.</p>{message && <p className="auth-error" role="alert">{message}</p>}<form action="/auth/login" method="post"><input type="hidden" name="next" value="/admin" /><button className="google-button" type="submit"><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.89-1.74 2.98-4.3 2.98-7.36Z" /><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.61-2.41l-3.24-2.51c-.9.6-2.05.96-3.37.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A10 10 0 0 0 12 22Z" /><path fill="#FBBC05" d="M6.41 13.92a6 6 0 0 1 0-3.84V7.49H3.07a10 10 0 0 0 0 9.02l3.34-2.59Z" /><path fill="#EA4335" d="M12 5.96c1.47 0 2.79.51 3.82 1.5l2.87-2.87A9.61 9.61 0 0 0 12 2a10 10 0 0 0-8.93 5.49l3.34 2.59A6 6 0 0 1 12 5.96Z" /></svg>Continue with Google<span aria-hidden="true">→</span></button></form><div className="auth-divider" /><p className="auth-security-note"><span aria-hidden="true">◈</span><span>Access is limited to approved superadmins. Signing in alone does not grant administrator access.</span></p></div><p className="auth-footer">A considered space for the people behind the platform.</p></section>
    </main>
  );
}
