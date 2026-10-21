import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  applicationOrigin,
  isSameOriginPost,
  PRIVATE_CACHE_CONTROL,
} from "@/lib/auth/redirects";

export async function POST(request: Request) {
  const origin = applicationOrigin(request);
  if (!origin || !isSameOriginPost(request)) {
    return NextResponse.json(
      { error: "This request must originate from the application." },
      { status: 403, headers: { "Cache-Control": PRIVATE_CACHE_CONTROL } },
    );
  }

  let failed = false;
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });
    failed = error !== null;
  } catch {
    failed = true;
  }

  const response = NextResponse.redirect(
    new URL(failed ? "/login?error=signout_failed" : "/login", origin),
    303,
  );
  response.headers.set("Cache-Control", PRIVATE_CACHE_CONTROL);
  return response;
}
