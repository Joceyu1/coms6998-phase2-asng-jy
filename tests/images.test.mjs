import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MAX_IMAGE_BYTES, imageSize, isManagedImagePath, validateImageBytes, validateImageFields } from "../src/lib/admin/image-validation.ts";

const user = "11111111-1111-4111-8111-111111111111";
const object = "22222222-2222-4222-8222-222222222222";
const png = new Uint8Array(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64"));

describe("private image storage paths", () => {
  it("accepts actual avatars and generated manager paths", () => {
    assert.equal(isManagedImagePath(`${user}/avatar`), true);
    for (const extension of ["jpg", "png", "webp"]) assert.equal(isManagedImagePath(`${user}/admin/${object}.${extension}`), true);
  });
  it("rejects paths outside the fixed avatar shapes and encoded traversal", () => {
    for (const path of [null, {}, "avatars/foo.png", `${user}/../secret`, `${user}/admin/../../secret`, `${user}/admin/${object}.svg`, `${user}/avatar?download=1`, `${user}%2favatar`, `${user}/avatar/`, `/${user}/avatar`, `${user}\\avatar`, `https://example.com/${user}/avatar`]) assert.equal(isManagedImagePath(path), false);
  });
});

describe("image upload validation", () => {
  it("accepts a real PNG only when the declared MIME agrees", () => {
    assert.deepEqual(validateImageBytes(png, "image/png"), { ok: true, format: { mime: "image/png", extension: "png" } });
    assert.equal(validateImageBytes(png, "image/jpeg").ok, false);
    assert.equal(validateImageBytes(png, "text/html").ok, false);
  });
  it("rejects SVG, arbitrary data, empty and oversized uploads", () => {
    assert.equal(validateImageBytes(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>'), "image/png").ok, false);
    assert.equal(validateImageBytes(new Uint8Array(), "image/png").ok, false);
    assert.equal(validateImageBytes(new Uint8Array(MAX_IMAGE_BYTES + 1), "image/png").ok, false);
    assert.equal(validateImageBytes(new TextEncoder().encode("not an image"), "image/webp").ok, false);
  });
  it("rejects PNG dimensions that could exhaust a browser decoder", () => {
    const huge = png.slice(); new DataView(huge.buffer).setUint32(16, 100_000);
    assert.equal(validateImageBytes(huge, "image/png").ok, false);
  });
  it("handles malformed marker segments without throwing", () => {
    const truncatedMarkers = new Uint8Array(40).fill(255);
    truncatedMarkers[1] = 0xd8; truncatedMarkers[39] = 0xd9;
    assert.equal(validateImageBytes(truncatedMarkers, "image/jpeg").ok, false);
    for (let length = 1; length < png.length; length += 1) {
      assert.doesNotThrow(() => validateImageBytes(png.subarray(0, length), "image/png"));
    }
  });
  it("checks JPEG and WebP boundaries against the declared type", () => {
    // Real 1×1 fixtures encoded once with the project's installed image library.
    const jpeg = new Uint8Array(Buffer.from("/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAABP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AIIAeC//2Q==", "base64"));
    assert.equal(validateImageBytes(jpeg, "image/jpeg").ok, true);
    assert.equal(validateImageBytes(jpeg.slice(0, -1), "image/jpeg").ok, false);
    assert.equal(validateImageBytes(new Uint8Array([255, 216, 255, 224, 255, 217]), "image/jpeg").ok, false);
    const webp = new Uint8Array(Buffer.from("UklGRjAAAABXRUJQVlA4ICQAAABQAQCdASoBAAEAAUAmJQBOgCgAAP76id+R2EN2HLri5shvAAA=", "base64"));
    assert.equal(validateImageBytes(webp, "image/webp").ok, true);
    new DataView(webp.buffer).setUint32(4, 500, true);
    assert.equal(validateImageBytes(webp, "image/webp").ok, false);
  });
});

describe("image metadata", () => {
  it("trims accessible names and descriptions", () => {
    const form = new FormData(); form.set("display_name", " City skyline "); form.set("alt_text", " Skyline at dusk ");
    assert.deepEqual(validateImageFields(form), { ok: true, data: { display_name: "City skyline", alt_text: "Skyline at dusk" } });
  });
  it("rejects missing names, overlong fields, and control characters", () => {
    for (const [name, alt] of [["", ""], ["a".repeat(161), ""], ["Name", "a".repeat(301)], ["Name\u0000", ""], ["Name", "first\nsecond"]]) {
      const form = new FormData(); form.set("display_name", name); form.set("alt_text", alt);
      assert.equal(validateImageFields(form).ok, false);
    }
  });
  it("handles sizes absent from older Storage metadata", () => {
    assert.equal(imageSize(null), "Size not recorded");
    assert.equal(imageSize(1024), "1 KiB");
    assert.equal(imageSize(2 * 1024 * 1024), "2.0 MiB");
  });
});
