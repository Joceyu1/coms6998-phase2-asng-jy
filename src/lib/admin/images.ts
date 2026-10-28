"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireSuperadmin } from "@/lib/auth/session";
import { isUuid } from "./validation";
import { IMAGE_BUCKET, MAX_IMAGE_BYTES, isManagedImagePath, validateImageBytes, validateImageFields, type ImageActionState } from "./image-validation";

export type AdminImage = {
  id: string;
  name: string;
  display_name: string;
  alt_text: string;
  mime_type: string | null;
  size: number | null;
  created_at: string;
  updated_at: string;
  referenced_profiles: number;
  signed_url?: string;
};

type AdminClient = Awaited<ReturnType<typeof requireSuperadmin>>["supabase"];

async function signedImage(supabase: AdminClient, image: AdminImage): Promise<AdminImage> {
  if (!isManagedImagePath(image.name)) return image;
  const { data, error } = await supabase.storage.from(IMAGE_BUCKET).createSignedUrl(image.name, 300);
  return error || !data ? image : { ...image, signed_url: data.signedUrl };
}

async function imageRecord(supabase: AdminClient, id: string): Promise<AdminImage | null> {
  const { data, error } = await supabase.rpc("admin_image_item", { p_id: id });
  if (error) {
    console.error("Admin image read failed", { code: error.code });
    throw new Error("Images are temporarily unavailable. Check the approved image database configuration.");
  }
  return data as AdminImage | null;
}

export async function getImages(page: number, search: string): Promise<{ rows: AdminImage[]; total: number }> {
  const { supabase } = await requireSuperadmin();
  const { data, error } = await supabase.rpc("admin_images_list", { p_page: page, p_search: search });
  if (error) {
    console.error("Admin image list failed", { code: error.code });
    throw new Error("Images are temporarily unavailable. Check the approved image database configuration.");
  }
  const result = data as { rows: AdminImage[]; total: number };
  return { total: result.total, rows: await Promise.all(result.rows.map((image) => signedImage(supabase, image))) };
}

export async function getImage(id: string): Promise<AdminImage | null> {
  const { supabase } = await requireSuperadmin();
  if (!isUuid(id)) return null;
  const image = await imageRecord(supabase, id.toLowerCase());
  return image ? signedImage(supabase, image) : null;
}

async function readImageFile(value: FormDataEntryValue | null, required: boolean) {
  if (!(value instanceof File) || value.size === 0) return required ? { error: "Choose an image to upload." } : {};
  if (value.size > MAX_IMAGE_BYTES) return { error: "Choose an image no larger than 2 MiB." };
  const bytes = new Uint8Array(await value.arrayBuffer());
  const result = validateImageBytes(bytes, value.type);
  return result.ok ? { bytes, format: result.format } : { error: result.error };
}

export async function createImageAction(_previous: ImageActionState, form: FormData): Promise<ImageActionState> {
  const { supabase, user } = await requireSuperadmin();
  const fields = validateImageFields(form);
  if (!fields.ok) return { message: "Please check the highlighted fields.", errors: fields.errors };
  const file = await readImageFile(form.get("file"), true);
  if (file.error || !file.bytes || !file.format) return { errors: { file: file.error ?? "Choose an image to upload." } };

  const path = `${user.id}/admin/${crypto.randomUUID()}.${file.format.extension}`;
  const { data, error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, file.bytes, { contentType: file.format.mime, cacheControl: "60", upsert: false });
  if (error || !data || !isUuid(data.id)) {
    console.error("Admin image upload failed", { code: error && "statusCode" in error ? error.statusCode : undefined });
    return { message: "The image could not be uploaded. Check image storage setup and try again." };
  }
  const { error: metadataError } = await supabase.rpc("admin_image_metadata_update", { p_id: data.id, p_display_name: fields.data.display_name, p_alt_text: fields.data.alt_text });
  if (metadataError) {
    // Only remove the new object created by this action, never an existing image.
    await supabase.storage.from(IMAGE_BUCKET).remove([path]);
    console.error("Admin image metadata failed", { code: metadataError.code });
    return { message: "The image details could not be saved. Refresh the library before retrying." };
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin/images/${data.id}?saved=created`);
}

export async function updateImageAction(_previous: ImageActionState, form: FormData): Promise<ImageActionState> {
  const { supabase } = await requireSuperadmin();
  const rawId = form.get("id");
  if (!isUuid(rawId)) return { message: "This image identifier is invalid." };
  const id = rawId.toLowerCase();
  const fields = validateImageFields(form);
  if (!fields.ok) return { message: "Please check the highlighted fields.", errors: fields.errors };
  const image = await imageRecord(supabase, id);
  if (!image || !isManagedImagePath(image.name)) return { message: "This image is unavailable or its storage path cannot be managed." };
  const file = await readImageFile(form.get("file"), false);
  if (file.error) return { errors: { file: file.error } };

  if (file.bytes && file.format) {
    const { error } = await supabase.storage.from(IMAGE_BUCKET).update(image.name, file.bytes, { contentType: file.format.mime, cacheControl: "60", upsert: false });
    if (error) return { message: "The replacement image could not be saved. Please try again." };
  }
  const { data, error } = await supabase.rpc("admin_image_metadata_update", { p_id: id, p_display_name: fields.data.display_name, p_alt_text: fields.data.alt_text });
  if (error || data !== id) {
    console.error("Admin image metadata update failed", { code: error?.code });
    revalidatePath("/admin", "layout");
    return { message: file.bytes ? "The file was replaced, but its name and description could not be saved. Refresh and try saving the details again." : "The image details could not be saved. Please refresh and try again." };
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin/images/${id}?saved=updated`);
}

export async function deleteImageAction(_previous: ImageActionState, form: FormData): Promise<ImageActionState> {
  const { supabase } = await requireSuperadmin();
  const rawId = form.get("id");
  if (!isUuid(rawId)) return { message: "This image identifier is invalid." };
  const id = rawId.toLowerCase();
  if (form.get("confirmation") !== "DELETE") return { errors: { confirmation: "Type DELETE to confirm permanent removal." } };
  const image = await imageRecord(supabase, id);
  if (!image || !isManagedImagePath(image.name)) return { message: "This image is unavailable or its storage path cannot be managed." };
  const { data, error } = await supabase.storage.from(IMAGE_BUCKET).remove([image.name]);
  if (error || !data?.some((removed) => removed.name === image.name)) return { message: "The image could not be deleted. Refresh the page and try again." };
  revalidatePath("/admin", "layout");
  redirect("/admin/images?deleted=1");
}
