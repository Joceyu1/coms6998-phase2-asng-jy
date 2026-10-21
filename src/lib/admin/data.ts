import "server-only";

import { requireSuperadmin } from "@/lib/auth/session";
import type { Dashboard, Media, PageResult, Profile, Vote } from "./types";
import { isUuid } from "./validation";

async function adminRpc<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  const { supabase } = await requireSuperadmin();
  const { data, error } = await supabase.rpc(name, args);
  if (error) {
    console.error("Admin data request failed", { operation: name, code: error.code });
    throw new Error("Admin data is temporarily unavailable. Check the approved database configuration.");
  }
  return data as T;
}

export function getDashboard() {
  return adminRpc<Dashboard>("admin_dashboard");
}

export function getProfiles(page: number, search: string) {
  return adminRpc<PageResult<Profile>>("admin_profiles", { p_page: page, p_search: search });
}

export function getMedia(page: number, search: string, status: string) {
  return adminRpc<PageResult<Media>>("admin_media", { p_page: page, p_search: search, p_status: status });
}

export async function getMediaItem(id: string) {
  await requireSuperadmin();
  if (!isUuid(id)) return null;
  return adminRpc<Media | null>("admin_media_item", { p_id: id });
}

export function getVotes(page: number) {
  return adminRpc<PageResult<Vote>>("admin_votes", { p_page: page });
}
