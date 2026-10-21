import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  hasGoogleIdentity,
  isSuperadminProfile,
  type SuperadminProfile,
} from "./policy";

export { hasGoogleIdentity, type SuperadminProfile } from "./policy";

/** React's cache is scoped to a render request; it never shares sessions across users. */
export const getAuthenticatedUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  return { supabase, user: error ? null : data.user };
});

/** Re-check this guard in every server data entry point, including Server Actions. */
export const requireSuperadmin = cache(async () => {
  const { supabase, user } = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  if (!hasGoogleIdentity(user)) {
    redirect("/access-denied");
  }

  const { data: row, error } = await supabase
    .rpc("admin_current_profile")
    .maybeSingle();

  // Missing schema, inaccessible rows, missing profiles, and false/null roles
  // all deny access. A browser can never grant itself the superadmin role.
  if (error || !isSuperadminProfile(row, user.id)) {
    redirect("/access-denied");
  }

  const profile: SuperadminProfile = { id: user.id, is_superadmin: true };
  return { supabase, user, profile };
});
