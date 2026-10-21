"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireSuperadmin } from "@/lib/auth/session";
import type { ActionState } from "./types";
import { isUuid, validateMedia } from "./validation";

export async function createMediaAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { supabase } = await requireSuperadmin();
  const result = validateMedia(form);
  if (!result.ok) return { message: "Please check the highlighted fields.", errors: result.errors };

  const { data: id, error } = await supabase.rpc("admin_create_media", { p_data: result.data });
  if (error || !isUuid(id)) {
    console.error("Admin create failed", { code: error?.code });
    return { message: "The media could not be created. Please try again or check database setup." };
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin/media/${id}?saved=created`);
}

export async function updateMediaAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { supabase } = await requireSuperadmin();
  const rawId = form.get("id");
  if (!isUuid(rawId)) return { message: "This media identifier is invalid." };
  const id = rawId.toLowerCase();
  const result = validateMedia(form);
  if (!result.ok) return { message: "Please check the highlighted fields.", errors: result.errors };

  const { data: updated, error } = await supabase.rpc("admin_update_media", { p_id: id, p_data: result.data });
  if (error || updated !== id) {
    console.error("Admin update failed", { code: error?.code });
    return { message: "The media could not be updated. It may have been removed; refresh and try again." };
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin/media/${id}?saved=updated`);
}

export async function deleteMediaAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { supabase } = await requireSuperadmin();
  const rawId = form.get("id");
  if (!isUuid(rawId)) return { message: "This media identifier is invalid." };
  const id = rawId.toLowerCase();
  if (form.get("confirmation") !== "DELETE") {
    return { errors: { confirmation: "Type DELETE to confirm permanent removal." } };
  }
  const { data: deleted, error } = await supabase.rpc("admin_delete_media", { p_id: id });
  if (error || deleted !== id) {
    console.error("Admin delete failed", { code: error?.code });
    return { message: "The media could not be deleted. Refresh the page and try again." };
  }
  revalidatePath("/admin", "layout");
  redirect("/admin/media?deleted=1");
}
