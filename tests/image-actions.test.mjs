import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

import * as validation from "../src/lib/admin/image-validation.ts";
import { isUuid } from "../src/lib/admin/validation.ts";

const userId = "11111111-1111-4111-8111-111111111111";
const imageId = "22222222-2222-4222-8222-22222222abcd";
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64");
const compiled = ts.transpileModule(readFileSync(new URL("../src/lib/admin/images.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;

function form({ file = false } = {}) {
  const result = new FormData(); result.set("id", imageId); result.set("display_name", "City skyline"); result.set("alt_text", "A skyline at dusk"); result.set("confirmation", "DELETE");
  if (file) result.set("file", new File([png], "skyline.png", { type: "image/png" }));
  return result;
}

function harness({ denied = false, path = `${userId}/avatar`, metadataFailure = false, emptyDelete = false } = {}) {
  const calls = [];
  const image = { id: imageId, name: path, display_name: "Avatar", alt_text: "", mime_type: "image/png", size: png.length, referenced_profiles: 1 };
  const bucket = {
    async upload(name, bytes, options) { calls.push({ upload: name, bytes: bytes.length, options }); return { data: { id: imageId, path: name }, error: null }; },
    async update(name, bytes, options) { calls.push({ update: name, bytes: bytes.length, options }); return { data: { id: imageId, path: name }, error: null }; },
    async remove(names) { calls.push({ remove: names }); return { data: emptyDelete ? [] : names.map((name) => ({ name })), error: null }; },
    async createSignedUrl(name, seconds) { calls.push({ sign: name, seconds }); return { data: { signedUrl: "https://storage.example.test/private-image" }, error: null }; },
  };
  const supabase = {
    storage: { from(name) { assert.equal(name, "avatars"); return bucket; } },
    async rpc(name, args) {
      calls.push({ rpc: name, args });
      if (name === "admin_image_item") return { data: image, error: null };
      if (name === "admin_images_list") return { data: { rows: [image], total: 1 }, error: null };
      if (name === "admin_image_metadata_update") return metadataFailure ? { data: null, error: { code: "42501" } } : { data: imageId, error: null };
      throw new Error(`Unexpected RPC ${name}`);
    },
  };
  const deniedError = new Error("Google superadmin required");
  const dependencies = {
    "next/cache": { revalidatePath(path, kind) { calls.push({ revalidate: path, kind }); } },
    "next/navigation": { redirect(location) { const error = new Error("redirect"); error.location = location; throw error; } },
    "@/lib/auth/session": { async requireSuperadmin() { calls.push({ guard: true }); if (denied) throw deniedError; return { user: { id: userId }, supabase }; } },
    "./validation": { isUuid },
    "./image-validation": validation,
  };
  const compiledModule = { exports: {} };
  new Function("require", "module", "exports", "crypto", "console", compiled)((name) => { assert.ok(Object.hasOwn(dependencies, name), `Unexpected import ${name}`); return dependencies[name]; }, compiledModule, compiledModule.exports, { randomUUID: () => imageId }, { error() {} });
  return { api: compiledModule.exports, calls, deniedError };
}

test("every image read and mutation authorizes before Storage or RPC access", async () => {
  for (const operation of [
    (api) => api.getImages(1, ""),
    (api) => api.getImage(imageId),
    (api) => api.createImageAction({}, form({ file: true })),
    (api) => api.updateImageAction({}, form()),
    (api) => api.deleteImageAction({}, form()),
  ]) {
    const app = harness({ denied: true });
    await assert.rejects(() => operation(app.api), (error) => error === app.deniedError);
    assert.deepEqual(app.calls, [{ guard: true }]);
  }
});

test("a new upload gets a server-generated private path and validated MIME", async () => {
  const app = harness(); const submitted = form({ file: true }); submitted.set("bucket", "public"); submitted.set("path", "arbitrary/file.svg");
  await assert.rejects(() => app.api.createImageAction({}, submitted), (error) => error.location === `/admin/images/${imageId}?saved=created`);
  const upload = app.calls.find((call) => call.upload);
  assert.equal(upload.upload, `${userId}/admin/${imageId}.png`);
  assert.equal(upload.options.contentType, "image/png"); assert.equal(upload.options.upsert, false);
  assert.ok(app.calls.some((call) => call.rpc === "admin_image_metadata_update"));
});

test("failed new-upload metadata only cleans up the newly created object", async () => {
  const app = harness({ metadataFailure: true });
  const result = await app.api.createImageAction({}, form({ file: true }));
  assert.match(result.message, /details could not be saved/);
  assert.deepEqual(app.calls.find((call) => call.remove).remove, [`${userId}/admin/${imageId}.png`]);
});

test("metadata-only changes keep existing image bytes and normalize the identifier", async () => {
  const app = harness(); const submitted = form(); submitted.set("id", imageId.toUpperCase());
  await assert.rejects(() => app.api.updateImageAction({}, submitted), (error) => error.location === `/admin/images/${imageId}?saved=updated`);
  assert.equal(app.calls.some((call) => call.update || call.upload || call.remove), false);
  assert.equal(app.calls.find((call) => call.rpc === "admin_image_metadata_update").args.p_id, imageId);
});

test("replacements use the looked-up storage path and report partial metadata failures", async () => {
  const app = harness({ metadataFailure: true }); const submitted = form({ file: true }); submitted.set("path", `${userId}/admin/forged.png`);
  const result = await app.api.updateImageAction({}, submitted);
  assert.equal(app.calls.find((call) => call.update).update, `${userId}/avatar`);
  assert.match(result.message, /file was replaced, but/);
  assert.equal(app.calls.some((call) => call.remove), false);
});

test("deletion requires confirmation and ignores forged bucket/path fields", async () => {
  const denied = harness(); const missing = form(); missing.set("confirmation", "");
  assert.match((await denied.api.deleteImageAction({}, missing)).errors.confirmation, /Type DELETE/);
  assert.deepEqual(denied.calls, [{ guard: true }]);
  const app = harness(); const submitted = form(); submitted.set("bucket", "another-bucket"); submitted.set("path", "another/path");
  await assert.rejects(() => app.api.deleteImageAction({}, submitted), (error) => error.location === "/admin/images?deleted=1");
  assert.deepEqual(app.calls.find((call) => call.remove).remove, [`${userId}/avatar`]);
});

test("unmanaged stored paths and invalid image data cannot reach Storage writes", async () => {
  const legacy = harness({ path: "unrelated/legacy.svg" });
  assert.match((await legacy.api.deleteImageAction({}, form())).message, /cannot be managed/);
  assert.equal(legacy.calls.some((call) => call.remove), false);
  const app = harness(); const submitted = form(); submitted.set("file", new File(["<svg/>"], "spoof.png", { type: "image/png" }));
  assert.ok((await app.api.createImageAction({}, submitted)).errors.file);
  assert.equal(app.calls.some((call) => call.upload), false);
});

test("an empty Storage deletion result cannot report success or invalidate pages", async () => {
  const app = harness({ emptyDelete: true });
  const result = await app.api.deleteImageAction({}, form());
  assert.match(result.message, /could not be deleted/);
  assert.equal(app.calls.some((call) => call.revalidate), false);
});
