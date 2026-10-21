"use client";

import Link from "next/link";
import { useActionState } from "react";

import { createMediaAction, deleteMediaAction, updateMediaAction } from "@/lib/admin/actions";
import type { ActionState, Media } from "@/lib/admin/types";
import { ARTIST_IDS } from "@/lib/admin/validation";

export function MediaForm({ media }: { media?: Media }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    media ? updateMediaAction : createMediaAction,
    {},
  );

  function error(name: keyof NonNullable<ActionState["errors"]>) {
    return state.errors?.[name] ? <span className="field-error" id={`${name}-error`}>{state.errors[name]}</span> : null;
  }
  const invalid = (name: keyof NonNullable<ActionState["errors"]>) => ({
    "aria-invalid": Boolean(state.errors?.[name]),
    "aria-describedby": state.errors?.[name] ? `${name}-error` : undefined,
  });

  return (
    <form action={action} className="panel form-panel">
      {media && <input type="hidden" name="id" value={media.id} />}
      {state.message && <p role="alert" className="form-message">{state.message}</p>}
      <div className="form-grid">
        <label className="field" htmlFor="title">Title
          <input id="title" name="title" maxLength={90} defaultValue={media?.title ?? ""} placeholder="A title for this generated note" {...invalid("title")} />{error("title")}
        </label>
        <label className="field" htmlFor="status">Status
          <select id="status" name="status" defaultValue={media?.status ?? "pending"} {...invalid("status")}>
            <option value="pending">Pending</option><option value="published">Published</option><option value="failed">Failed</option>
          </select>{error("status")}
        </label>
        <label className="field" htmlFor="artist_id">Artist identifier
          <select id="artist_id" name="artist_id" defaultValue={media?.artist_id ?? ""} required {...invalid("artist_id")}>
            <option value="" disabled>Choose an identifier</option>
            {ARTIST_IDS.map((id) => <option key={id} value={id}>{id}</option>)}
          </select>{error("artist_id")}
        </label>
        <label className="field" htmlFor="model">AI model
          <input id="model" name="model" maxLength={100} defaultValue={media?.model ?? ""} placeholder="Model used to generate the text" {...invalid("model")} />{error("model")}
        </label>
        <label className="field" htmlFor="mood">Mood
          <input id="mood" name="mood" required maxLength={80} defaultValue={media?.mood ?? ""} {...invalid("mood")} />{error("mood")}
        </label>
        <label className="field" htmlFor="scene">Scene
          <input id="scene" name="scene" required maxLength={80} defaultValue={media?.scene ?? ""} {...invalid("scene")} />{error("scene")}
        </label>
        <label className="field field-full" htmlFor="prompt">Generation prompt
          <textarea id="prompt" name="prompt" required rows={5} maxLength={5000} defaultValue={media?.prompt ?? ""} {...invalid("prompt")} />{error("prompt")}
        </label>
        <label className="field field-full" htmlFor="caption">Generated text
          <textarea id="caption" name="caption" rows={7} maxLength={900} defaultValue={media?.caption ?? ""} placeholder="Paste or edit the AI-generated liner note" {...invalid("caption")} />{error("caption")}
          <span className="field-hint">Published notes require a title, generated text, and model. This admin manages records; generation happens in the creation app.</span>
        </label>
      </div>
      <div className="form-actions">
        <button className="button" type="submit" disabled={pending}>{pending ? "Saving…" : media ? "Save changes" : "Create media"}</button>
        <Link className="button button-secondary" href={media ? `/admin/media/${media.id}` : "/admin/media"}>Cancel</Link>
      </div>
      <span role="status" className="sr-only">{pending ? "Saving media" : ""}</span>
    </form>
  );
}

export function DeleteMediaForm({ media }: { media: Media }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(deleteMediaAction, {});
  return (
    <section className="panel danger-zone" aria-labelledby="delete-heading">
      <h2 id="delete-heading">Delete this media</h2>
      <p>Deleting permanently removes this note and its associated votes. This cannot be undone.</p>
      <form action={action} className="delete-form">
        <input type="hidden" name="id" value={media.id} />
        <label className="field" htmlFor="confirmation">Type DELETE to confirm
          <input id="confirmation" name="confirmation" required autoComplete="off" pattern="DELETE" aria-describedby="delete-description" />
        </label>
        <span id="delete-description" className="field-hint">Only this record and its votes will be removed.</span>
        {(state.message || state.errors?.confirmation) && <p role="alert" className="field-error">{state.message ?? state.errors?.confirmation}</p>}
        <button type="submit" className="button button-danger" disabled={pending}>{pending ? "Deleting…" : "Permanently delete"}</button>
      </form>
    </section>
  );
}
