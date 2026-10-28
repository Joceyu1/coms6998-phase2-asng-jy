"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireSuperadmin } from "@/lib/auth/session";
import { getResource, type ResourceActionState } from "./resource-registry";
import { validateMixForm, validateResourceForm } from "./resource-validation";
import { getPromptMix } from "./resource-data";
import { isUuid } from "./validation";

function mutationMessage(code: string | undefined, operation: "save" | "delete") {
  if (code === "23505") return "A record with that identifier already exists. Choose a different value.";
  if (code === "23503") return operation === "delete" ? "This record is still referenced. Remove or change its references before deleting it." : "A selected record is no longer available. Refresh and choose it again.";
  if (code === "42501") return "Administrator authorization could not be confirmed. Sign in again.";
  return `The record could not be ${operation === "save" ? "saved" : "deleted"}. Refresh and try again.`;
}

export async function saveResourceAction(_previous: ResourceActionState, form: FormData): Promise<ResourceActionState> {
  const { supabase } = await requireSuperadmin();
  const definition = getResource(form.get("resource"));
  if (!definition) return { message: "Unknown resource." };
  const rawId = form.get("id");
  const updating = rawId !== null && rawId !== "";
  if (!definition.capabilities[updating ? "update" : "create"]) return { message: "This resource is read-only." };
  if (updating && !isUuid(rawId)) return { message: "This record identifier is invalid." };
  const validated = validateResourceForm(definition, form);
  if (!validated.ok) return { message: "Please check the highlighted fields.", errors: validated.errors };
  const id = updating ? (rawId as string).toLowerCase() : null;
  const { data, error } = await supabase.rpc("admin_week7_save", {
    p_resource: definition.dbResource, p_id: id, p_data: validated.data,
  });
  if (error || !isUuid(data) || (updating && data !== id)) {
    console.error("Admin resource save failed", { resource: definition.key, code: error?.code });
    return { message: mutationMessage(error?.code, "save") };
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin/${definition.key}/${data}?saved=${updating ? "updated" : "created"}`);
}

export async function deleteResourceAction(_previous: ResourceActionState, form: FormData): Promise<ResourceActionState> {
  const { supabase } = await requireSuperadmin();
  const definition = getResource(form.get("resource"));
  if (!definition) return { message: "Unknown resource." };
  if (!definition.capabilities.delete) return { message: "This resource is read-only." };
  const rawId = form.get("id");
  if (!isUuid(rawId)) return { message: "This record identifier is invalid." };
  if (form.get("confirmation") !== "DELETE") return { errors: { confirmation: "Type DELETE to confirm permanent removal." } };
  const id = rawId.toLowerCase();
  const { data, error } = await supabase.rpc("admin_week7_delete", { p_resource: definition.dbResource, p_id: id });
  if (error || data !== id) {
    console.error("Admin resource delete failed", { resource: definition.key, code: error?.code });
    return { message: mutationMessage(error?.code, "delete") };
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin/${definition.key}?deleted=1`);
}

export async function updatePromptMixAction(_previous: ResourceActionState, form: FormData): Promise<ResourceActionState> {
  const { supabase } = await requireSuperadmin();
  const current = await getPromptMix();
  const result = validateMixForm(current.rows.map((row) => row.id), form);
  if (!result.ok) return { message: "Please check the allocations.", errors: result.errors };
  const { error } = await supabase.rpc("admin_week7_mix_update", { p_items: result.rows });
  if (error) {
    console.error("Admin mix update failed", { code: error.code });
    return { message: "The mix could not be saved. Refresh to load the current chains and try again." };
  }
  revalidatePath("/admin", "layout");
  redirect("/admin/prompt-chain-mix?saved=1");
}
