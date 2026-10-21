import type { User } from "@supabase/supabase-js";

export type SuperadminProfile = {
  id: string;
  is_superadmin: true;
};

/** Only server-verified Auth metadata is used; user-editable metadata is ignored. */
export function hasGoogleIdentity(user: User): boolean {
  return (
    user.app_metadata.provider === "google" &&
    user.identities?.some((identity) => identity.provider === "google") === true
  );
}

/** A role must be the actual boolean true on the authenticated user's own row. */
export function isSuperadminProfile(
  profile: unknown,
  userId: string,
): profile is SuperadminProfile {
  return (
    typeof profile === "object" &&
    profile !== null &&
    "id" in profile &&
    profile.id === userId &&
    "is_superadmin" in profile &&
    profile.is_superadmin === true
  );
}
