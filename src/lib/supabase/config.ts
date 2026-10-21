export function getSupabaseConfig() {
  // Direct references let Next.js inline the public values for browser clients.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url?.trim() || !publishableKey?.trim()) {
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local or your deployment environment before creating a Supabase client.",
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be an absolute HTTP(S) URL.");
  }

  if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be an absolute HTTP(S) URL.");
  }

  return { url, publishableKey };
}
