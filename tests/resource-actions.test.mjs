import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

import * as registry from "../src/lib/admin/resource-registry.ts";
import * as resourceValidation from "../src/lib/admin/resource-validation.ts";
import * as validation from "../src/lib/admin/validation.ts";

// Execute the production modules, replacing only authentication, transport,
// caching, and navigation boundaries. No credentials or live databases are used.
function compile(path) {
  return ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
}

const actionSource = compile("../src/lib/admin/resource-actions.ts");
const dataSource = compile("../src/lib/admin/data.ts");
const resourceDataSource = compile("../src/lib/admin/resource-data.ts");
const recordId = "11111111-1111-4111-8111-111111111111";
const otherId = "22222222-2222-4222-8222-222222222222";
const firstMixId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const secondMixId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const mixRows = [
  { id: firstMixId, chain_id: recordId, chain_name: "First chain", weight: 1, is_active: true },
  { id: secondMixId, chain_id: otherId, chain_name: "Second chain", weight: 0, is_active: false },
];

class BoundaryRedirect extends Error {
  constructor(location) {
    super(`Redirect: ${location}`);
    this.location = location;
  }
}

function form(values) {
  const result = new FormData();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null) result.append(key, String(value));
  }
  return result;
}

function termForm(values = {}) {
  return form({
    resource: "terms", term: "  Contrast  ", definition: "  A difference in tone.  ",
    category: "", is_active: "on", ...values,
  });
}

function mixForm({ firstWeight = "4", firstActive = true, secondWeight = "0", secondActive = false } = {}) {
  return form({
    [`weight_${firstMixId}`]: firstWeight,
    [`active_${firstMixId}`]: firstActive ? "on" : undefined,
    [`weight_${secondMixId}`]: secondWeight,
    [`active_${secondMixId}`]: secondActive ? "on" : undefined,
  });
}

function harness(options = {}) {
  const calls = [];
  let authorizations = 0;
  const supabase = {
    async rpc(name, args) {
      calls.push({ operation: "rpc", name, args });
      if (name === "admin_week7_mix") {
        return {
          data: options.mixReadError ? null : { rows: options.mixRows ?? mixRows, total: (options.mixRows ?? mixRows).length },
          error: options.mixReadError ?? null,
        };
      }
      if (options.rpcThrows) throw options.rpcThrows;
      return {
        data: Object.hasOwn(options, "data") ? options.data : recordId,
        error: options.error ?? null,
      };
    },
  };
  async function requireSuperadmin() {
    authorizations += 1;
    calls.push({ operation: "authorize" });
    if (options.denied || options.denyAuthorization === authorizations) {
      throw new BoundaryRedirect(options.denied ?? "/access-denied");
    }
    return { supabase, user: { id: "server-authenticated-admin" }, profile: { is_superadmin: true } };
  }
  function load(source, dependencies) {
    const compiled = { exports: {} };
    const requireMock = (name) => {
      assert.ok(Object.hasOwn(dependencies, name), `Unexpected import: ${name}`);
      return dependencies[name];
    };
    new Function("require", "module", "exports", "console", source)(
      requireMock, compiled, compiled.exports,
      { error(...args) { calls.push({ operation: "log", args }); } },
    );
    return compiled.exports;
  }
  const auth = { requireSuperadmin };
  const data = load(dataSource, {
    "server-only": {}, "@/lib/auth/session": auth, "./validation": validation,
  });
  const resourceData = load(resourceDataSource, {
    "server-only": {}, "./data": data, "./validation": validation, "./resource-registry": registry,
  });
  const actions = load(actionSource, {
    "next/cache": { revalidatePath(path, type) { calls.push({ operation: "revalidate", path, type }); } },
    "next/navigation": { redirect(location) { calls.push({ operation: "redirect", location }); throw new BoundaryRedirect(location); } },
    "@/lib/auth/session": auth,
    "./resource-registry": registry,
    "./resource-validation": resourceValidation,
    "./resource-data": resourceData,
    "./validation": validation,
  });
  return {
    ...actions, calls,
    mutations: () => calls.filter((call) => call.operation === "rpc" && call.name !== "admin_week7_mix"),
    rpcs: () => calls.filter((call) => call.operation === "rpc"),
    effects: () => calls.filter((call) => call.operation === "redirect" || call.operation === "revalidate"),
  };
}

async function redirected(action, expected) {
  await assert.rejects(action, (error) => error instanceof BoundaryRedirect && error.location === expected);
}

test("every resource mutation authorizes before resource lookup, validation, or database access", async () => {
  for (const denied of ["/login", "/access-denied"]) {
    for (const [action, input] of [
      ["saveResourceAction", termForm()],
      ["deleteResourceAction", form({ resource: "terms", id: recordId, confirmation: "DELETE" })],
      ["updatePromptMixAction", mixForm()],
    ]) {
      const app = harness({ denied });
      await redirected(() => app[action]({}, input), denied);
      assert.deepEqual(app.calls, [{ operation: "authorize" }]);
    }
  }
});

test("forged create, update, and delete submissions cannot mutate any read-only resource", async () => {
  for (const resource of ["prompt-chains", "prompt-chain-steps", "generation-requests", "llm-responses"]) {
    for (const [action, fields] of [
      ["saveResourceAction", { resource }],
      ["saveResourceAction", { resource, id: recordId }],
      ["deleteResourceAction", { resource, id: recordId, confirmation: "DELETE" }],
    ]) {
      const app = harness();
      assert.match((await app[action]({}, form(fields))).message, /read-only/);
      assert.deepEqual(app.calls, [{ operation: "authorize" }]);
    }
  }
});

test("unknown resources, inherited object names, and table-like inputs never become RPC targets", async () => {
  for (const resource of ["__proto__", "constructor", "profiles", "public.terms", "terms;drop table profiles"]) {
    for (const action of ["saveResourceAction", "deleteResourceAction"]) {
      const app = harness();
      assert.match((await app[action]({}, form({ resource, id: recordId, confirmation: "DELETE" }))).message, /Unknown resource/);
      assert.equal(app.rpcs().length, 0);
      assert.equal(app.effects().length, 0);
    }
  }
});

test("invalid update/delete identifiers stop before RPC execution", async () => {
  for (const id of ["not-a-uuid", "../other", "", "https://attacker.example/"]) {
    const deletion = harness();
    assert.match((await deletion.deleteResourceAction({}, form({ resource: "terms", id, confirmation: "DELETE" }))).message, /identifier is invalid/);
    assert.equal(deletion.rpcs().length, 0);
    if (id) {
      const update = harness();
      assert.match((await update.saveResourceAction({}, termForm({ id }))).message, /identifier is invalid/);
      assert.equal(update.rpcs().length, 0);
    }
  }
});

test("field injection and duplicate field values fail validation before mutations", async () => {
  for (const field of ["is_superadmin", "created_at", "user_id", "__proto__"]) {
    const app = harness();
    const input = termForm();
    input.append(field, "attacker supplied");
    const result = await app.saveResourceAction({}, input);
    assert.ok(result.errors?.form);
    assert.equal(app.rpcs().length, 0);
  }
  const app = harness();
  const duplicate = termForm();
  duplicate.append("definition", "Second value");
  assert.ok((await app.saveResourceAction({}, duplicate)).errors?.definition);
  assert.equal(app.rpcs().length, 0);
});

test("resource creation uses the guarded client and exact validated SQL payload", async () => {
  const app = harness();
  const input = termForm();
  input.append("$ACTION_REF_test", "framework metadata");
  await redirected(() => app.saveResourceAction({}, input), `/admin/terms/${recordId}?saved=created`);
  assert.deepEqual(app.rpcs(), [{
    operation: "rpc", name: "admin_week7_save",
    args: { p_resource: "terms", p_id: null, p_data: { term: "Contrast", definition: "A difference in tone.", category: null, is_active: true } },
  }]);
  assert.deepEqual(app.effects(), [
    { operation: "revalidate", path: "/admin", type: "layout" },
    { operation: "redirect", location: `/admin/terms/${recordId}?saved=created` },
  ]);
  assert.equal(app.calls[0].operation, "authorize");
});

test("resource updates normalize the identifier and cannot alter record ownership metadata", async () => {
  const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const app = harness({ data: id });
  await redirected(() => app.saveResourceAction({}, termForm({ id: id.toUpperCase() })), `/admin/terms/${id}?saved=updated`);
  assert.deepEqual(app.rpcs()[0].args, {
    p_resource: "terms", p_id: id,
    p_data: { term: "Contrast", definition: "A difference in tone.", category: null, is_active: true },
  });
});

test("catalog route names map only to their whitelisted SQL resources", async () => {
  for (const [resource, expected, fields] of [
    ["llm-providers", "llm_providers", { name: "Provider", slug: "provider", base_url: "https://provider.example/v1", description: "", is_active: "on" }],
    ["llm-models", "llm_models", { provider_id: recordId, name: "Model", model_key: "model-v1", context_window: "1024", supports_images: "on", is_active: "on" }],
    ["generation-examples", "ai_generation_examples", { prompt: "A sample request", output: "A sample completion", model_id: "", chain_id: "", is_active: "on" }],
    ["allowed-signup-domains", "allowed_signup_domains", { domain: "EXAMPLE.EDU", is_active: "on", notes: "" }],
    ["whitelisted-emails", "whitelisted_emails", { email: " Person+Test@Example.edu ", is_active: "on", notes: "" }],
  ]) {
    const app = harness();
    await redirected(() => app.saveResourceAction({}, form({ resource, ...fields })), `/admin/${resource}/${recordId}?saved=created`);
    assert.equal(app.rpcs()[0].name, "admin_week7_save");
    assert.equal(app.rpcs()[0].args.p_resource, expected);
    assert.equal(app.rpcs()[0].args.p_id, null);
    assert.ok(!Object.hasOwn(app.rpcs()[0].args.p_data, "resource"));
  }
});

test("deletion requires exact confirmation and sends only the selected resource and id", async () => {
  for (const confirmation of [undefined, "delete", "DELETE "]) {
    const app = harness();
    const result = await app.deleteResourceAction({}, form({ resource: "terms", id: recordId, confirmation }));
    assert.ok(result.errors?.confirmation);
    assert.equal(app.rpcs().length, 0);
  }
  const app = harness();
  await redirected(() => app.deleteResourceAction({}, form({ resource: "terms", id: recordId, confirmation: "DELETE" })), "/admin/terms?deleted=1");
  assert.deepEqual(app.rpcs(), [{ operation: "rpc", name: "admin_week7_delete", args: { p_resource: "terms", p_id: recordId } }]);
});

test("duplicate, stale-reference, and authorization errors return useful messages without cache effects", async () => {
  for (const [action, code, expected] of [
    ["saveResourceAction", "23505", /already exists/],
    ["saveResourceAction", "23503", /selected record is no longer available/],
    ["deleteResourceAction", "23503", /still referenced/],
    ["saveResourceAction", "42501", /authorization could not be confirmed/],
  ]) {
    const app = harness({ error: { code, message: "Private database diagnostic must stay out of the form" } });
    const input = action === "saveResourceAction" ? termForm() : form({ resource: "terms", id: recordId, confirmation: "DELETE" });
    const result = await app[action]({}, input);
    assert.match(result.message, expected);
    assert.ok(!result.message.includes("Private database diagnostic"));
    assert.deepEqual(app.effects(), []);
  }
});

test("unexpected save/delete RPC results never navigate or announce a successful mutation", async () => {
  for (const data of [null, "invalid-id", true]) {
    const app = harness({ data });
    assert.match((await app.saveResourceAction({}, termForm())).message, /could not be saved/);
    assert.deepEqual(app.effects(), []);
  }
  for (const action of ["saveResourceAction", "deleteResourceAction"]) {
    const app = harness({ data: otherId });
    const input = action === "saveResourceAction" ? termForm({ id: recordId }) : form({ resource: "terms", id: recordId, confirmation: "DELETE" });
    assert.match((await app[action]({}, input)).message, /could not be saved|could not be deleted/);
    assert.deepEqual(app.effects(), []);
  }
});

test("mix updates read authorized known allocations and submit them in one atomic RPC", async () => {
  const app = harness();
  const input = mixForm({ firstWeight: "900", secondWeight: "250", secondActive: true });
  await redirected(() => app.updatePromptMixAction({}, input), "/admin/prompt-chain-mix?saved=1");
  assert.deepEqual(app.rpcs(), [
    { operation: "rpc", name: "admin_week7_mix", args: undefined },
    { operation: "rpc", name: "admin_week7_mix_update", args: { p_items: [
      { id: firstMixId, weight: 900, is_active: true },
      { id: secondMixId, weight: 250, is_active: true },
    ] } },
  ]);
  assert.deepEqual(app.calls.slice(0, 2), [{ operation: "authorize" }, { operation: "authorize" }]);
  assert.deepEqual(app.effects(), [
    { operation: "revalidate", path: "/admin", type: "layout" },
    { operation: "redirect", location: "/admin/prompt-chain-mix?saved=1" },
  ]);
});

test("a missing active checkbox means a paused allocation, not an implicitly active row", async () => {
  const app = harness();
  await redirected(() => app.updatePromptMixAction({}, mixForm()), "/admin/prompt-chain-mix?saved=1");
  assert.deepEqual(app.mutations()[0].args.p_items, [
    { id: firstMixId, weight: 4, is_active: true },
    { id: secondMixId, weight: 0, is_active: false },
  ]);
});

test("unknown allocation ids and missing, repeated, or malformed weights never mutate the mix", async () => {
  const inputs = [];
  const unknown = mixForm(); unknown.append(`weight_${recordId}`, "8"); inputs.push(unknown);
  const missing = mixForm(); missing.delete(`weight_${secondMixId}`); inputs.push(missing);
  const repeated = mixForm(); repeated.append(`weight_${firstMixId}`, "2"); inputs.push(repeated);
  for (const firstWeight of ["-1", "1001", "Infinity", "1.5", ""]) inputs.push(mixForm({ firstWeight }));
  for (const input of inputs) {
    const app = harness();
    const result = await app.updatePromptMixAction({}, input);
    assert.ok(result.errors && Object.keys(result.errors).length > 0);
    assert.deepEqual(app.rpcs().map((call) => call.name), ["admin_week7_mix"]);
    assert.deepEqual(app.effects(), []);
  }
});

test("a mix needs an active positive allocation and rejects forged checkbox values", async () => {
  for (const input of [
    mixForm({ firstWeight: "0" }),
    mixForm({ firstActive: false }),
    mixForm({ firstWeight: "0", secondWeight: "0", secondActive: true }),
  ]) {
    const app = harness();
    assert.ok((await app.updatePromptMixAction({}, input)).errors?.form);
    assert.equal(app.mutations().length, 0);
  }
  const app = harness();
  const input = mixForm(); input.set(`active_${firstMixId}`, "false");
  assert.ok((await app.updatePromptMixAction({}, input)).errors?.[`active_${firstMixId}`]);
  assert.equal(app.mutations().length, 0);
});

test("revoked access at the mix data boundary prevents even the allocation read", async () => {
  const app = harness({ denyAuthorization: 2 });
  await redirected(() => app.updatePromptMixAction({}, mixForm()), "/access-denied");
  assert.equal(app.rpcs().length, 0);
  assert.deepEqual(app.effects(), []);
});

test("mix read/write failures cannot cause success redirects or cache revalidation", async () => {
  const failedRead = harness({ mixReadError: { code: "42501" } });
  await assert.rejects(() => failedRead.updatePromptMixAction({}, mixForm()), /temporarily unavailable/);
  assert.equal(failedRead.mutations().length, 0);
  assert.deepEqual(failedRead.effects(), []);
  const failedWrite = harness({ error: { code: "40001" } });
  assert.match((await failedWrite.updatePromptMixAction({}, mixForm())).message, /mix could not be saved/);
  assert.deepEqual(failedWrite.effects(), []);
});
