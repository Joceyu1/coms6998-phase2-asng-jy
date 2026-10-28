import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getResource, resourceKeys } from "../src/lib/admin/resource-registry.ts";
import { canMutateResource, validDomain, validEmail, validProviderUrl, validateMixForm, validateResourceForm } from "../src/lib/admin/resource-validation.ts";

const providerId = "11111111-1111-4111-8111-111111111111";
const chainId = "22222222-2222-4222-8222-222222222222";
function form(values) {
  const result = new FormData();
  for (const [key, value] of Object.entries(values)) if (value !== null) result.append(key, value);
  return result;
}

describe("resource whitelist and capabilities", () => {
  it("rejects prototype keys and unknown resources", () => {
    for (const key of ["__proto__", "constructor", "toString", "profiles;drop table", "images", null, {}]) assert.equal(getResource(key), null);
  });
  it("keeps observability and prompt definitions read-only", () => {
    for (const key of ["prompt-chains", "prompt-chain-steps", "generation-requests", "llm-responses"]) {
      for (const operation of ["create", "update", "delete"]) assert.equal(canMutateResource(key, operation), false);
    }
    for (const key of resourceKeys.filter((key) => !["prompt-chains", "prompt-chain-steps", "generation-requests", "llm-responses"].includes(key))) {
      for (const operation of ["create", "update", "delete"]) assert.equal(canMutateResource(key, operation), true);
    }
  });
});

describe("catalog forms", () => {
  it("normalizes domains and emails without accepting URLs or wildcards", () => {
    const domain = validateResourceForm(getResource("allowed-signup-domains"), form({ domain: "  Columbia.EDU  ", is_active: "on", notes: "  Approved domain  " }));
    assert.equal(domain.ok, true);
    assert.deepEqual(domain.data, { domain: "columbia.edu", is_active: true, notes: "Approved domain" });
    const email = validateResourceForm(getResource("whitelisted-emails"), form({ email: "  User+Admin@Columbia.EDU  " }));
    assert.equal(email.ok, true);
    assert.equal(email.data.email, "user+admin@columbia.edu");
    assert.equal(email.data.is_active, false);
    for (const invalid of ["*.columbia.edu", "https://columbia.edu", "@columbia.edu", "columbia.edu/path", "columbia.edu:443", "localhost", "-x.edu", "x-.edu", "x..edu", "columbia.edu."]) assert.equal(validDomain(invalid), false, invalid);
  });
  it("rejects malformed email local parts, multiple at signs, and domain injection", () => {
    for (const invalid of ["a@@example.com", ".a@example.com", "a.@example.com", "a..b@example.com", "a b@example.com", "x@https://example.com", "<a>@example.com", `${"a".repeat(65)}@example.com`]) assert.equal(validEmail(invalid), false, invalid);
    assert.equal(validEmail("listener+notes@example.com"), true);
  });
  it("keeps credentials out of provider URLs", () => {
    assert.equal(validProviderUrl("https://api.example.com/v1"), true);
    for (const invalid of ["http://example.com", "javascript:alert(1)", "https://user:secret@example.com/v1", "https://example.com?key=secret", "https://example.com/#secret", "https://exa mple.com"]) assert.equal(validProviderUrl(invalid), false, invalid);
    const definition = getResource("llm-providers");
    assert.equal(validateResourceForm(definition, form({ name: "Provider", slug: "two--hyphens" })).ok, false);
    assert.equal(validateResourceForm(definition, form({ name: "Provider", slug: "two-words" })).ok, true);
  });
  it("validates model references and integer capacities", () => {
    const valid = { provider_id: providerId, name: "Gemini", model_key: "example-model", context_window: "32000", supports_images: "on", is_active: "on" };
    const result = validateResourceForm(getResource("llm-models"), form(valid));
    assert.equal(result.ok, true);
    assert.equal(result.data.context_window, 32000);
    assert.equal(result.data.supports_images, true);
    for (const invalid of ["Infinity", "1e6", "0", "-1", "1.5", "2000001"]) {
      const result = validateResourceForm(getResource("llm-models"), form({ ...valid, context_window: invalid }));
      assert.equal(result.ok, false, invalid);
      assert.ok(result.errors.context_window);
    }
    assert.equal(validateResourceForm(getResource("llm-models"), form({ ...valid, provider_id: "not-a-uuid" })).ok, false);
  });
  it("rejects unexpected privilege fields, duplicate values, and file objects", () => {
    const base = { term: "Texture", definition: "A description of a sound", is_active: "on" };
    const extra = validateResourceForm(getResource("terms"), form({ ...base, is_superadmin: "true" }));
    assert.equal(extra.ok, false);
    assert.ok(extra.errors.form);
    const duplicate = form(base); duplicate.append("term", "Another term");
    assert.equal(validateResourceForm(getResource("terms"), duplicate).ok, false);
    const file = form(base); file.set("definition", new File(["content"], "definition.txt"));
    assert.equal(validateResourceForm(getResource("terms"), file).ok, false);
    assert.equal(validateResourceForm(getResource("terms"), form({ ...base, is_active: "admin" })).ok, false);
  });
  it("enforces required text and actual character bounds", () => {
    const base = { prompt: "A scene", output: "A generated response", model_id: providerId, chain_id: chainId };
    assert.equal(validateResourceForm(getResource("generation-examples"), form(base)).ok, true);
    assert.equal(validateResourceForm(getResource("generation-examples"), form({ ...base, output: " " })).ok, false);
    assert.equal(validateResourceForm(getResource("generation-examples"), form({ ...base, output: "x".repeat(20001) })).ok, false);
    assert.equal(validateResourceForm(getResource("terms"), form({ term: "🎵".repeat(120), definition: "An example" })).ok, true);
  });
});

describe("atomic prompt mix input", () => {
  it("accepts relative weights without pretending they are percentages", () => {
    const result = validateMixForm([providerId, chainId], form({ [`weight_${providerId}`]: "1000", [`active_${providerId}`]: "on", [`weight_${chainId}`]: "35", [`active_${chainId}`]: "on" }));
    assert.equal(result.ok, true);
    assert.deepEqual(result.rows.map((row) => row.weight), [1000, 35]);
  });
  it("rejects unknown allocations, missing values, decimals, and a fully paused mix", () => {
    const base = { [`weight_${providerId}`]: "2", [`active_${providerId}`]: "on" };
    assert.equal(validateMixForm([providerId], form({ ...base, [`weight_${chainId}`]: "1" })).ok, false);
    for (const weight of ["", "1.5", "-1", "1001", "Infinity"]) assert.equal(validateMixForm([providerId], form({ ...base, [`weight_${providerId}`]: weight })).ok, false);
    assert.equal(validateMixForm([providerId], form({ [`weight_${providerId}`]: "2" })).ok, false);
    assert.equal(validateMixForm([providerId], form({ ...base, [`weight_${providerId}`]: "0" })).ok, false);
    const duplicate = form(base); duplicate.append(`weight_${providerId}`, "3");
    assert.equal(validateMixForm([providerId], duplicate).ok, false);
  });
});
