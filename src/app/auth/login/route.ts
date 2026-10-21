import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import {
  applicationOrigin,
  isSameOriginPost,
  PRIVATE_CACHE_CONTROL,
} from "@/lib/auth/redirects";

function loginError(origin: string, code: string) {
  const destination = new URL("/login", origin);
  destination.searchParams.set("error", code);
  const response = NextResponse.redirect(destination, 303);
  response.headers.set("Cache-Control", PRIVATE_CACHE_CONTROL);
  return response;
}

export async function POST(request: Request) {
  const origin = applicationOrigin(request);
  if (!origin || !isSameOriginPost(request)) {
    return NextResponse.json(
      { error: "This request must originate from the application." },
      { status: 403, headers: { "Cache-Control": PRIVATE_CACHE_CONTROL } },
    );
  }

  // Supabase matches the entire redirect URL, including its query string.
  // Keep this identical to the exact callback entered in the allowlist;
  // the callback sends authenticated users to /admin by default.
  const callback = new URL("/auth/callback", origin);

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return loginError(origin, "configuration");
  }

  try {
    const config = getSupabaseConfig();
    const settingsResponse = await fetch(`${config.url}/auth/v1/settings`, {
      headers: { apikey: config.publishableKey },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!settingsResponse.ok) {
      return loginError(origin, "oauth_unavailable");
    }
    const settings = (await settingsResponse.json()) as {
      external?: { google?: boolean };
    };
    if (settings.external?.google !== true) {
      return loginError(origin, "google_disabled");
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callback.toString(),
        queryParams: { prompt: "select_account" },
      },
    });

    if (error || !data.url) {
      return loginError(origin, "oauth_unavailable");
    }

    const response = NextResponse.redirect(data.url, 303);
    response.headers.set("Cache-Control", PRIVATE_CACHE_CONTROL);
    return response;
  } catch {
    return loginError(origin, "oauth_unavailable");
  }
}
