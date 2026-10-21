import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { approvalPercent, isUuid, pageNumber, searchTerm, validateMedia } from "../src/lib/admin/validation.ts";

function form(overrides = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({ artist_id: "nas", mood: "Reflective", scene: "City at dusk", prompt: "Write a short liner note.", title: "Evening", caption: "A generated note.", model: "Recorded model", status: "published", ...overrides })) data.set(key, value);
  return data;
}

describe("media publication boundaries", () => {
  it("accepts a complete published record and trims input", () => {
    const result = validateMedia(form({ title: "  Evening  " }));
    assert.equal(result.ok, true); assert.equal(result.data.title, "Evening");
  });
  it("requires title, generated text, and provenance before publishing", () => {
    const result = validateMedia(form({ title: "", caption: " ", model: "" }));
    assert.equal(result.ok, false);
    assert.deepEqual(Object.keys(result.errors).sort(), ["caption", "model", "title"]);
  });
  it("allows a pending record with empty generated content", () => {
    const result = validateMedia(form({ status: "pending", title: "", caption: "", model: "" }));
    assert.equal(result.ok, true); assert.equal(result.data.caption, null);
  });
  it("rejects unknown statuses and unsupported artist identifiers", () => {
    const result = validateMedia(form({ status: "admin", artist_id: "unknown" }));
    assert.equal(result.ok, false); assert.ok(result.errors.status); assert.ok(result.errors.artist_id);
  });
  it("enforces source database lengths and required prompt metadata", () => {
    const result = validateMedia(form({ prompt: "a".repeat(5001), caption: "a".repeat(901), mood: "", scene: "x".repeat(81) }));
    assert.equal(result.ok, false);
    for (const key of ["prompt", "caption", "mood", "scene"]) assert.ok(result.errors[key]);
  });
  it("ignores attempted creator and superadmin field injection", () => {
    const result = validateMedia(form({ user_id: "attacker", is_superadmin: "true" }));
    assert.equal(result.ok, true);
    assert.equal("user_id" in result.data, false); assert.equal("is_superadmin" in result.data, false);
  });
});

describe("metrics and bounded navigation", () => {
  it("distinguishes no votes from a zero-percent approval score", () => {
    assert.equal(approvalPercent(0, 0), null); assert.equal(approvalPercent(0, 2), 0);
    assert.equal(approvalPercent(3, 1), 75);
  });
  it("rejects malformed ids before making a database request", () => {
    assert.equal(isUuid("22d08406-af74-4e95-8bd8-0fa24ffde26a"), true);
    assert.equal(isUuid("../../profiles"), false); assert.equal(isUuid(null), false);
  });
  it("bounds pagination and search terms", () => {
    for (const invalid of ["0", "-1", "1.5", "Infinity", "10001", ["2"]]) assert.equal(pageNumber(invalid), 1);
    assert.equal(pageNumber("2"), 2); assert.equal(searchTerm(" x "), "x");
    assert.equal(searchTerm("x".repeat(101)).length, 100);
  });
});
