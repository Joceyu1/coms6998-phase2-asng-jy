import type { MediaInput } from "./types";

// Existing generations.artist_id database constraint; these are identifiers,
// not a copy of the creation application's catalog or generation features.
export const ARTIST_IDS = [
  "tribe", "de-la", "wu-tang", "nas", "guy", "bell-biv", "janet", "prodigy",
  "orbital", "808", "tlc", "xscape", "swv", "en-vogue", "jodeci", "hi-five",
  "la-boyz", "eyc", "bobby-brown", "inner-city", "underground-resistance",
  "mary-j-blige", "jeff-mills", "2-unlimited", "snap", "culture-beat",
  "real-mccoy", "dead-or-alive", "dave-rodgers", "sinitta",
] as const;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function pageNumber(value: unknown): number {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) && page >= 1 && page <= 10000 ? page : 1;
}

export function searchTerm(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 100) : "";
}

export function validateMedia(form: FormData):
  | { ok: true; data: MediaInput }
  | { ok: false; errors: Partial<Record<keyof MediaInput, string>> } {
  const text = (name: string) => {
    const value = form.get(name);
    return typeof value === "string" ? value.trim() : "";
  };
  const errors: Partial<Record<keyof MediaInput, string>> = {};
  const artist_id = text("artist_id");
  const mood = text("mood");
  const scene = text("scene");
  const prompt = text("prompt");
  const title = text("title");
  const caption = text("caption");
  const model = text("model");
  const status = text("status");

  if (!(ARTIST_IDS as readonly string[]).includes(artist_id)) {
    errors.artist_id = "Choose a supported artist identifier.";
  }
  for (const [field, value, max] of [
    ["mood", mood, 80], ["scene", scene, 80], ["prompt", prompt, 5000],
  ] as const) {
    if (!value || value.length > max) errors[field] = `Enter between 1 and ${max} characters.`;
  }
  if (title.length > 90) errors.title = "Use 90 characters or fewer.";
  if (caption.length > 900) errors.caption = "Use 900 characters or fewer.";
  if (model.length > 100) errors.model = "Use 100 characters or fewer.";
  if (!["pending", "published", "failed"].includes(status)) {
    errors.status = "Choose a valid publication status.";
  }
  if (status === "published") {
    if (!title) errors.title = "Published media needs a title.";
    if (!caption) errors.caption = "Published media needs generated text.";
    if (!model) errors.model = "Published media needs a model name.";
  }

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    data: {
      artist_id, mood, scene, prompt,
      title: title || null, caption: caption || null, model: model || null,
      status: status as MediaInput["status"],
    },
  };
}

export function approvalPercent(upvotes: number, downvotes: number): number | null {
  const total = upvotes + downvotes;
  return total > 0 ? Math.round((upvotes / total) * 100) : null;
}
