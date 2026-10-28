export const resourceKeys = [
  "prompt-chains", "prompt-chain-steps", "terms", "generation-requests",
  "generation-examples", "llm-models", "llm-providers", "llm-responses",
  "allowed-signup-domains", "whitelisted-emails",
] as const;

export type ResourceKey = typeof resourceKeys[number];
export type ResourceRow = { id: string; [key: string]: unknown };
export type ResourceOption = { value: string; label: string };
export type ResourceOptions = Record<string, ResourceOption[]>;
export type ResourceActionState = { message?: string; errors?: Record<string, string> };
export type ResourceField = {
  name: string; label: string;
  type: "text" | "textarea" | "email" | "url" | "number" | "checkbox" | "select";
  required?: boolean; maxLength?: number; min?: number; max?: number; step?: number;
  options?: ResourceOption[]; relation?: ResourceKey; hint?: string;
  defaultValue?: string | number | boolean | null;
};
export type ResourceDetailField = {
  name: string; label: string;
  kind?: "text" | "longtext" | "json" | "date" | "boolean" | "number" | "badge";
  relation?: string; labelKey?: string;
};
export type ResourceDefinition = {
  key: ResourceKey; dbResource: string; title: string; singular: string; description: string;
  capabilities: { create: boolean; update: boolean; delete: boolean };
  fields: ResourceField[];
  columns: { key: string; label: string; kind?: "text" | "date" | "boolean" | "number" | "badge"; relation?: string; labelKey?: string }[];
  detailFields: ResourceDetailField[];
};

const writable = { create: true, update: true, delete: true };
const readOnly = { create: false, update: false, delete: false };
const active: ResourceField = { name: "is_active", label: "Active", type: "checkbox", defaultValue: true };
const timestamps: ResourceDetailField[] = [{ name: "created_at", label: "Created", kind: "date" }, { name: "updated_at", label: "Updated", kind: "date" }];
const details = (fields: ResourceField[]): ResourceDetailField[] => fields.map((field) => ({
  name: field.name, label: field.label,
  kind: field.type === "textarea" ? "longtext" : field.type === "checkbox" ? "boolean" : field.type === "number" ? "number" : "text",
  relation: field.relation,
  labelKey: field.relation === "llm-providers" ? "provider_name" : field.relation === "llm-models" ? "model_name" : field.relation === "prompt-chains" ? "chain_name" : undefined,
}));
function catalog(key: ResourceKey, dbResource: string, title: string, singular: string, description: string, fields: ResourceField[], columns: ResourceDefinition["columns"]): ResourceDefinition {
  return { key, dbResource, title, singular, description, capabilities: writable, fields, columns, detailFields: [...details(fields), ...timestamps] };
}
const providers = catalog("llm-providers", "llm_providers", "LLM providers", "LLM provider", "The services behind your models. Store provider metadata here; credentials stay in secure environment settings.", [
  { name: "name", label: "Provider name", type: "text", required: true, maxLength: 120 },
  { name: "slug", label: "Identifier", type: "text", required: true, maxLength: 80, hint: "Lowercase letters, numbers, and hyphens." },
  { name: "base_url", label: "API base URL", type: "url", maxLength: 2048, hint: "HTTPS only. Leave out credentials and query parameters." },
  { name: "description", label: "Description", type: "textarea", maxLength: 2000 }, active,
], [{ key: "name", label: "Provider" }, { key: "slug", label: "Identifier" }, { key: "is_active", label: "Active", kind: "boolean" }]);
const models = catalog("llm-models", "llm_models", "LLM models", "LLM model", "Manage model identifiers and capabilities without storing API keys.", [
  { name: "provider_id", label: "Provider", type: "select", relation: "llm-providers", required: true },
  { name: "name", label: "Model name", type: "text", required: true, maxLength: 120 },
  { name: "model_key", label: "Provider model identifier", type: "text", required: true, maxLength: 160 },
  { name: "context_window", label: "Context window (tokens)", type: "number", min: 1, max: 2000000, step: 1, hint: "Optional documented capacity; this is not measured usage." },
  { name: "supports_images", label: "Supports image input", type: "checkbox", defaultValue: false }, active,
], [{ key: "name", label: "Model" }, { key: "provider_id", label: "Provider", relation: "llm-providers", labelKey: "provider_name" }, { key: "model_key", label: "Identifier" }, { key: "is_active", label: "Active", kind: "boolean" }]);
const terms = catalog("terms", "terms", "Terms", "term", "Keep a shared vocabulary for prompts and generated content.", [
  { name: "term", label: "Term", type: "text", required: true, maxLength: 120 },
  { name: "definition", label: "Definition", type: "textarea", required: true, maxLength: 5000 },
  { name: "category", label: "Category", type: "text", maxLength: 80 }, active,
], [{ key: "term", label: "Term" }, { key: "category", label: "Category" }, { key: "is_active", label: "Active", kind: "boolean" }]);
const examples = catalog("generation-examples", "ai_generation_examples", "Generation examples", "generation example", "Curate example inputs and outputs for your generation library.", [
  { name: "prompt", label: "Example prompt", type: "textarea", required: true, maxLength: 10000 },
  { name: "output", label: "Expected output", type: "textarea", required: true, maxLength: 20000 },
  { name: "model_id", label: "Model", type: "select", relation: "llm-models" },
  { name: "chain_id", label: "Prompt chain", type: "select", relation: "prompt-chains" }, active,
], [{ key: "prompt", label: "Prompt" }, { key: "model_id", label: "Model", relation: "llm-models", labelKey: "model_name" }, { key: "chain_id", label: "Chain", relation: "prompt-chains", labelKey: "chain_name" }, { key: "is_active", label: "Active", kind: "boolean" }]);
const domains = catalog("allowed-signup-domains", "allowed_signup_domains", "Allowed signup domains", "signup domain", "Manage the domain allowlist catalog. These entries never grant admin access; the creation app's existing Columbia Google policy remains in effect.", [
  { name: "domain", label: "Domain", type: "text", required: true, maxLength: 253, hint: "A bare domain, such as columbia.edu. No @, URL, or wildcard." }, active,
  { name: "notes", label: "Notes", type: "textarea", maxLength: 2000 },
], [{ key: "domain", label: "Domain" }, { key: "is_active", label: "Active", kind: "boolean" }, { key: "notes", label: "Notes" }]);
const emails = catalog("whitelisted-emails", "whitelisted_emails", "Whitelisted emails", "whitelisted email", "Manage explicit email allowlist records. An entry does not bypass the creation app's Google/domain checks or grant a superadmin role.", [
  { name: "email", label: "Email address", type: "email", required: true, maxLength: 254 }, active,
  { name: "notes", label: "Notes", type: "textarea", maxLength: 2000 },
], [{ key: "email", label: "Email" }, { key: "is_active", label: "Active", kind: "boolean" }, { key: "notes", label: "Notes" }]);

export const resources: Record<ResourceKey, ResourceDefinition> = {
  "llm-providers": providers, "llm-models": models, terms, "generation-examples": examples,
  "allowed-signup-domains": domains, "whitelisted-emails": emails,
  "prompt-chains": {
    key: "prompt-chains", dbResource: "prompt_chains", title: "Prompt chains", singular: "prompt chain",
    description: "Inspect registered prompt chains and their ordered steps. The initial chain is a snapshot of the creation app's prompt; catalog edits do not change its code-defined generation flow.",
    capabilities: readOnly, fields: [],
    columns: [{ key: "name", label: "Chain" }, { key: "source", label: "Source" }, { key: "is_active", label: "Active", kind: "boolean" }],
    detailFields: [{ name: "name", label: "Name" }, { name: "description", label: "Description", kind: "longtext" }, { name: "source", label: "Source" }, { name: "is_active", label: "Active", kind: "boolean" }, ...timestamps],
  },
  "prompt-chain-steps": {
    key: "prompt-chain-steps", dbResource: "prompt_chain_steps", title: "Prompt chain steps", singular: "prompt chain step",
    description: "Read each prompt's role, template, model, and position in its chain.", capabilities: readOnly, fields: [],
    columns: [{ key: "chain_id", label: "Chain", relation: "prompt-chains", labelKey: "chain_name" }, { key: "position", label: "Step", kind: "number" }, { key: "role", label: "Role", kind: "badge" }, { key: "model_id", label: "Model", relation: "llm-models", labelKey: "model_name" }],
    detailFields: [{ name: "chain_id", label: "Chain", relation: "prompt-chains", labelKey: "chain_name" }, { name: "position", label: "Position", kind: "number" }, { name: "role", label: "Role" }, { name: "template", label: "Prompt template", kind: "longtext" }, { name: "model_id", label: "Model", relation: "llm-models", labelKey: "model_name" }, ...timestamps],
  },
  "generation-requests": {
    key: "generation-requests", dbResource: "generation_requests", title: "Generation requests", singular: "generation request",
    description: "Requests reserved by the creation service after observability is enabled. Earlier records and manually added media are not invented as provider requests.", capabilities: readOnly, fields: [],
    columns: [{ key: "created_at", label: "Requested", kind: "date" }, { key: "status", label: "Status", kind: "badge" }, { key: "model_key", label: "Model" }, { key: "chain_id", label: "Chain", relation: "prompt-chains", labelKey: "chain_name" }],
    detailFields: [{ name: "status", label: "Status", kind: "badge" }, { name: "generation_id", label: "Media", relation: "media" }, { name: "user_id", label: "User ID" }, { name: "chain_id", label: "Chain", relation: "prompt-chains", labelKey: "chain_name" }, { name: "prompt", label: "Full prompt", kind: "longtext" }, { name: "model_key", label: "Recorded model" }, { name: "source", label: "Source" }, { name: "completed_at", label: "Completed", kind: "date" }, ...timestamps],
  },
  "llm-responses": {
    key: "llm-responses", dbResource: "llm_responses", title: "LLM responses", singular: "LLM response",
    description: "Saved, parsed completions from observed service requests. Raw provider payloads, token usage, and latency were not captured.", capabilities: readOnly, fields: [],
    columns: [{ key: "output_title", label: "Completion" }, { key: "model_key", label: "Model" }, { key: "created_at", label: "Recorded", kind: "date" }],
    detailFields: [{ name: "request_id", label: "Request", relation: "generation-requests" }, { name: "generation_id", label: "Media", relation: "media" }, { name: "model_key", label: "Model" }, { name: "output_title", label: "Title" }, { name: "output_text", label: "Saved output", kind: "longtext" }, { name: "response_data", label: "Parsed completion", kind: "json" }, { name: "source", label: "Source" }, ...timestamps],
  },
};

export function getResource(key: unknown): ResourceDefinition | null {
  return typeof key === "string" && Object.hasOwn(resources, key) ? resources[key as ResourceKey] : null;
}
