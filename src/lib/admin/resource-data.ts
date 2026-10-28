import "server-only";

import { adminRpc } from "./data";
import { isUuid } from "./validation";
import { getResource, type ResourceKey, type ResourceOptions, type ResourceRow } from "./resource-registry";
import type { PageResult } from "./types";

export type PromptMixRow = { id: string; chain_id: string; chain_name: string; weight: number; is_active: boolean; updated_at: string };
export type Week7Overview = {
  prompt_chains: number; prompt_chain_steps: number; generation_requests: number;
  llm_responses: number; active_models: number; active_providers: number;
  terms: number; generation_examples: number; allowed_domains: number; whitelisted_emails: number;
  request_statuses: { label: string; value: number }[];
  latest_requests: ResourceRow[];
};

export function getResources(resource: ResourceKey, page: number, search: string, filter = "") {
  const definition = getResource(resource);
  if (!definition) throw new Error("Unknown admin resource.");
  return adminRpc<PageResult<ResourceRow>>("admin_week7_list", {
    p_resource: definition.dbResource, p_page: page, p_search: search, p_filter: filter,
  });
}

export function getResourceItem(resource: ResourceKey, id: string) {
  const definition = getResource(resource);
  if (!definition) throw new Error("Unknown admin resource.");
  if (!isUuid(id)) return Promise.resolve(null);
  return adminRpc<ResourceRow | null>("admin_week7_item", { p_resource: definition.dbResource, p_id: id });
}

export async function getResourceOptions(resource: ResourceKey): Promise<ResourceOptions> {
  const definition = getResource(resource);
  if (!definition) throw new Error("Unknown admin resource.");
  const result: ResourceOptions = {};
  await Promise.all(definition.fields.filter((field) => field.relation).map(async (field) => {
    // The same whitelist and independent RPC guard apply to relation lookups.
    const related = field.relation!;
    const options: ResourceOptions[string] = [];
    let page = 1;
    let total = 0;
    do {
      const batch = await getResources(related, page, "");
      total = batch.total;
      for (const row of batch.rows) {
        const name = row.name ?? row.term ?? row.domain ?? row.email ?? row.id;
        const provider = typeof row.provider_name === "string" ? ` · ${row.provider_name}` : "";
        options.push({ value: row.id, label: `${String(name)}${provider}` });
      }
      page += 1;
    } while (options.length < total && page <= 100);
    result[field.name] = options;
  }));
  return result;
}

export function getPromptMix() {
  return adminRpc<PageResult<PromptMixRow>>("admin_week7_mix");
}

export function getWeek7Overview() {
  return adminRpc<Week7Overview>("admin_week7_overview");
}
