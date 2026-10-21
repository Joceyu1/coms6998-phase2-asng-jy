import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  PRIVATE_CACHE_CONTROL,
  safeAdminPath,
} from "@/lib/auth/redirects";
import { hasGoogleIdentity, isSuperadminProfile } from "@/lib/auth/policy";
import { getSupabaseConfig } from "@/lib/supabase/config";

export async function proxy(request: NextRequest) {
  const isAdmin =
    request.nextUrl.pathname === "/admin" ||
    request.nextUrl.pathname.startsWith("/admin/");
  let response = NextResponse.next({ request });
  response.headers.set("Cache-Control", PRIVATE_CACHE_CONTROL);

  const pendingCookies = new Map<
    string,
    { name: string; value: string; options: CookieOptions }
  >();
  const pendingHeaders = new Headers({
    "Cache-Control": PRIVATE_CACHE_CONTROL,
  });

  function finish(nextResponse: NextResponse) {
    pendingCookies.forEach(({ name, value, options }) => {
      nextResponse.cookies.set(name, value, options);
    });
    pendingHeaders.forEach((value, name) => {
      nextResponse.headers.set(name, value);
    });
    return nextResponse;
  }

  function loginRedirect(error?: string) {
    const destination = new URL("/login", request.url);
    destination.searchParams.set(
      "next",
      safeAdminPath(request.nextUrl.pathname + request.nextUrl.search),
    );
    if (error) destination.searchParams.set("error", error);
    return finish(NextResponse.redirect(destination));
  }

  let config: ReturnType<typeof getSupabaseConfig>;
  try {
    config = getSupabaseConfig();
  } catch {
    return isAdmin ? loginRedirect("configuration") : finish(response);
  }

  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach((cookie) => {
          request.cookies.set(cookie.name, cookie.value);
          pendingCookies.set(cookie.name, cookie);
        });
        Object.entries(headers).forEach(([name, value]) => {
          pendingHeaders.set(name, value);
        });
        response = NextResponse.next({ request });
      },
    },
  });

  try {
    // getUser validates the session with Supabase before any identity is trusted
    // and refreshes cookies early enough to propagate them to the browser.
    const { data, error } = await supabase.auth.getUser();

    if (!isAdmin) return finish(response);
    if (error || !data.user) return loginRedirect();

    if (!hasGoogleIdentity(data.user)) {
      return finish(
        NextResponse.redirect(new URL("/access-denied", request.url)),
      );
    }

    const { data: profile, error: profileError } = await supabase
      .rpc("admin_current_profile")
      .maybeSingle();

    if (
      profileError ||
      !isSuperadminProfile(profile, data.user.id)
    ) {
      return finish(
        NextResponse.redirect(new URL("/access-denied", request.url)),
      );
    }

    return finish(response);
  } catch {
    // Service outages and malformed sessions cannot turn into authorization.
    return isAdmin ? loginRedirect("oauth_unavailable") : finish(response);
  }
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
