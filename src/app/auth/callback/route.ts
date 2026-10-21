import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { hasGoogleIdentity } from "@/lib/auth/policy";
import {
  applicationOrigin,
  PRIVATE_CACHE_CONTROL,
  safeAdminPath,
} from "@/lib/auth/redirects";

function redirectTo(origin: string, path: string) {
  const response = NextResponse.redirect(new URL(path, origin), 303);
  response.headers.set("Cache-Control", PRIVATE_CACHE_CONTROL);
  return response;
}

export async function GET(request: Request) {
  const origin = applicationOrigin(request);
  if (!origin) {
    return NextResponse.json(
      { error: "The request host is invalid." },
      { status: 400, headers: { "Cache-Control": PRIVATE_CACHE_CONTROL } },
    );
  }
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code || url.searchParams.has("error")) {
    return redirectTo(origin, "/login?error=callback_failed");
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return redirectTo(origin, "/login?error=callback_failed");
    }

    const { data, error: userError } = await supabase.auth.getUser();
    if (userError || !data.user) {
      return redirectTo(origin, "/login?error=callback_failed");
    }

    if (!hasGoogleIdentity(data.user)) {
      await supabase.auth.signOut({ scope: "local" });
      return redirectTo(origin, "/login?error=google_required");
    }

    // The destination's server guard checks the database role again before
    // rendering any admin data. Authentication alone never grants access.
    return redirectTo(origin, safeAdminPath(url.searchParams.get("next")));
  } catch {
    return redirectTo(origin, "/login?error=callback_failed");
  }
}
