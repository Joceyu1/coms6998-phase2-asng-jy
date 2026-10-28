"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { createImageAction, deleteImageAction, updateImageAction, type AdminImage } from "@/lib/admin/images";
import type { ImageActionState } from "@/lib/admin/image-validation";

export function ImageForm({ image }: { image?: AdminImage }) {
  const [state, action, pending] = useActionState<ImageActionState, FormData>(image ? updateImageAction : createImageAction, {});
  // React resets uncontrolled form fields when an action resolves, including
  // validation failures. Keep entered metadata while the user corrects a file.
  const [displayName, setDisplayName] = useState(image?.display_name ?? "");
  const [altText, setAltText] = useState(image?.alt_text ?? "");
  const error = (key: keyof NonNullable<ImageActionState["errors"]>) => state.errors?.[key] ? <span id={`${key}-error`} className="field-error">{state.errors[key]}</span> : null;
  const invalid = (key: keyof NonNullable<ImageActionState["errors"]>) => ({ "aria-invalid": Boolean(state.errors?.[key]), "aria-describedby": state.errors?.[key] ? `${key}-error` : undefined });
  return <form action={action} className="panel form-panel">
    {image && <input type="hidden" name="id" value={image.id} />}
    {state.message && <p role="alert" className="form-message">{state.message}</p>}
    <div className="form-grid">
      <label className="field field-full" htmlFor="display_name">Image name<input id="display_name" name="display_name" required maxLength={160} value={displayName} onChange={(event) => setDisplayName(event.target.value)} {...invalid("display_name")} />{error("display_name")}</label>
      <label className="field field-full" htmlFor="alt_text">Image description<input id="alt_text" name="alt_text" maxLength={300} value={altText} onChange={(event) => setAltText(event.target.value)} placeholder="Describe the image for someone who cannot see it" {...invalid("alt_text")} />{error("alt_text")}</label>
      <label className="field field-full" htmlFor="file">{image ? "Replace image (optional)" : "Image file"}<input id="file" name="file" type="file" accept="image/jpeg,image/png,image/webp" required={!image} {...invalid("file")} />{error("file")}<span className="field-hint">JPG, PNG, or WebP · maximum 2 MiB. {image ? "Leave this empty to update only the name and description. Replacing a profile image keeps its existing address." : "Images stay in private storage and are visible here through temporary links."}</span></label>
    </div>
    <div className="form-actions"><button type="submit" className="button" disabled={pending}>{pending ? "Saving image…" : image ? "Save image" : "Upload image"}</button><Link className="button button-secondary" href={image ? `/admin/images/${image.id}` : "/admin/images"}>Cancel</Link></div>
    <p className="sr-only" role="status">{pending ? "Saving image" : ""}</p>
  </form>;
}

export function DeleteImageForm({ image }: { image: AdminImage }) {
  const [state, action, pending] = useActionState<ImageActionState, FormData>(deleteImageAction, {});
  return <section className="panel danger-zone" aria-labelledby="delete-image-heading">
    <h2 id="delete-image-heading">Delete this image</h2>
    <p>This permanently deletes the stored file and its details. {image.referenced_profiles > 0 ? `${image.referenced_profiles} profile${image.referenced_profiles === 1 ? " uses" : "s use"} this image; the avatar will be cleared.` : "No profiles currently use this image."}</p>
    <form action={action} className="delete-form"><input type="hidden" name="id" value={image.id} /><label htmlFor="confirmation" className="field">Type DELETE to confirm<input id="confirmation" name="confirmation" required autoComplete="off" pattern="DELETE" aria-invalid={Boolean(state.errors?.confirmation)} /></label>{(state.message || state.errors?.confirmation) && <p role="alert" className="field-error">{state.message ?? state.errors?.confirmation}</p>}<button type="submit" className="button button-danger" disabled={pending}>{pending ? "Deleting…" : "Permanently delete image"}</button></form>
  </section>;
}
