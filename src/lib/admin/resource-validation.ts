import { getResource, type ResourceDefinition } from "./resource-registry.ts";

export function validDomain(value: string): boolean {
  return value.length <= 253 && value.split(".").length >= 2 && value.split(".").every((part) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(part));
}
export function validEmail(value: string): boolean {
  const parts = value.split("@");
  return value.length <= 254 && parts.length === 2 && parts[0].length >= 1 && parts[0].length <= 64 && /^[a-z0-9.!#$%&'*+\-/=?^_`{|}~]+$/i.test(parts[0]) && !parts[0].startsWith(".") && !parts[0].endsWith(".") && !parts[0].includes("..") && validDomain(parts[1]);
}
export function validProviderUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash && /^[a-z0-9.-]+$/i.test(url.hostname) && !/[\s<>\\]/.test(value);
  } catch { return false; }
}
export function validateResourceForm(definition: ResourceDefinition, form: FormData) {
  const errors: Record<string, string> = {};
  const data: Record<string, string | boolean | number | null> = {};
  const allowed = new Set(["resource", "id", "confirmation", ...definition.fields.map((field) => field.name)]);
  for (const name of form.keys()) {
    if (!allowed.has(name) && !name.startsWith("$ACTION_")) errors.form = "Unexpected form fields were submitted. Refresh and try again.";
  }
  for (const field of definition.fields) {
    const entries = form.getAll(field.name);
    if (entries.length > 1) { errors[field.name] = "Submit one value for this field."; continue; }
    const value = form.get(field.name);
    if (field.type === "checkbox") {
      if (value !== null && value !== "on" && value !== "true" && value !== "1") errors[field.name] = "Choose a valid checkbox value.";
      data[field.name] = value !== null;
      continue;
    }
    if (value !== null && typeof value !== "string") { errors[field.name] = "A text value is required."; continue; }
    let text = (typeof value === "string" ? value : "").trim();
    if (["slug", "domain", "email"].includes(field.name)) text = text.toLowerCase();
    if (!text) {
      if (field.required) errors[field.name] = `${field.label} is required.`;
      data[field.name] = null;
      continue;
    }
    if (field.maxLength && [...text].length > field.maxLength) errors[field.name] = `Use ${field.maxLength} characters or fewer.`;
    if (field.type === "number") {
      const number = /^\d+$/.test(text) ? Number(text) : NaN;
      if (!Number.isSafeInteger(number) || number < (field.min ?? 0) || number > (field.max ?? Number.MAX_SAFE_INTEGER)) errors[field.name] = `Enter a whole number from ${field.min ?? 0} to ${field.max ?? Number.MAX_SAFE_INTEGER}.`;
      else data[field.name] = number;
    } else if (field.type === "select") {
      if (field.relation && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)) errors[field.name] = "Choose a valid record.";
      if (field.options && !field.options.some((option) => option.value === text)) errors[field.name] = "Choose an available option.";
      data[field.name] = text.toLowerCase();
    } else {
      data[field.name] = text;
    }
    if (field.name === "slug" && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(text)) errors[field.name] = "Use lowercase letters and numbers, with single hyphens between words.";
    if (field.name === "domain" && !validDomain(text)) errors[field.name] = "Enter a bare domain such as columbia.edu.";
    if (field.name === "email" && !validEmail(text)) errors[field.name] = "Enter a valid email address.";
    if (field.name === "base_url" && !validProviderUrl(text)) errors[field.name] = "Enter an HTTPS base URL without credentials, query parameters, or fragments.";
  }
  return Object.keys(errors).length ? { ok: false as const, errors } : { ok: true as const, data };
}
export function canMutateResource(resource: unknown, operation: "create" | "update" | "delete") {
  return getResource(resource)?.capabilities[operation] === true;
}

export type MixInput = { id: string; weight: number; is_active: boolean };
export function validateMixForm(ids: string[], form: FormData) {
  const errors: Record<string, string> = {};
  const rows: MixInput[] = [];
  const allowed = new Set(ids.flatMap((id) => [`weight_${id}`, `active_${id}`]));
  for (const key of form.keys()) if (!allowed.has(key) && !key.startsWith("$ACTION_")) errors.form = "The mix changed or contains an unknown allocation. Refresh and try again.";
  for (const id of ids) {
    const field = `weight_${id}`;
    const raw = form.get(field);
    const weight = typeof raw === "string" && /^\d+$/.test(raw.trim()) ? Number(raw.trim()) : NaN;
    const active = form.get(`active_${id}`);
    if (form.getAll(field).length !== 1 || !Number.isInteger(weight) || weight < 0 || weight > 1000) errors[field] = "Enter a whole number from 0 to 1000.";
    if (form.getAll(`active_${id}`).length > 1 || (active !== null && active !== "on" && active !== "true" && active !== "1")) errors[`active_${id}`] = "Choose a valid allocation status.";
    rows.push({ id, weight, is_active: active !== null });
  }
  if (!rows.some((row) => row.is_active && row.weight > 0)) errors.form = "Keep at least one active chain with a positive weight.";
  return Object.keys(errors).length ? { ok: false as const, errors } : { ok: true as const, rows };
}
