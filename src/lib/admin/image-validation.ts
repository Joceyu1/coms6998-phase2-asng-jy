export const IMAGE_BUCKET = "avatars";
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export type ImageFormat = { mime: "image/jpeg" | "image/png" | "image/webp"; extension: "jpg" | "png" | "webp" };
export type ImageFields = { display_name: string; alt_text: string };
export type ImageActionState = { message?: string; errors?: Partial<Record<"file" | "display_name" | "alt_text" | "confirmation", string>> };

const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const managedPath = new RegExp(`^${uuid}/(?:avatar|admin/${uuid}\\.(?:jpg|png|webp))$`, "i");

/** Only actual avatar paths and paths created by this image manager are mutable. */
export function isManagedImagePath(value: unknown): value is string {
  return typeof value === "string" && managedPath.test(value);
}

export function validateImageFields(form: FormData):
  | { ok: true; data: ImageFields }
  | { ok: false; errors: NonNullable<ImageActionState["errors"]> } {
  const text = (key: string) => typeof form.get(key) === "string" ? (form.get(key) as string).trim() : "";
  const display_name = text("display_name");
  const alt_text = text("alt_text");
  const errors: NonNullable<ImageActionState["errors"]> = {};
  if (!display_name || display_name.length > 160 || /[\u0000-\u001f\u007f]/.test(display_name)) errors.display_name = "Enter a name between 1 and 160 characters.";
  if (alt_text.length > 300 || /[\u0000-\u001f\u007f]/.test(alt_text)) errors.alt_text = "Use 300 characters or fewer, on one line.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, data: { display_name, alt_text } };
}

function ascii(bytes: Uint8Array, offset: number, length: number) {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

function reasonableDimensions(width: number, height: number) {
  return width > 0 && height > 0 && width <= 12000 && height <= 12000 && width * height <= 40_000_000;
}

function jpegDimensions(bytes: Uint8Array): [number, number] | null {
  if (bytes.length < 20 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[bytes.length - 2] !== 0xff || bytes[bytes.length - 1] !== 0xd9) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 2;
  let dimensions: [number, number] | null = null;
  while (offset + 4 < bytes.length) {
    if (bytes[offset++] !== 0xff) return null;
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset++];
    if (offset + 2 > bytes.length) return null;
    const length = view.getUint16(offset);
    if (length < 2 || offset + length > bytes.length) return null;
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      if (length < 8) return null;
      dimensions = [view.getUint16(offset + 5), view.getUint16(offset + 3)];
    }
    if (marker === 0xda) return dimensions;
    offset += length;
  }
  return null;
}

function webpDimensions(bytes: Uint8Array): [number, number] | null {
  if (bytes.length < 26 || ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 4) !== "WEBP") return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(4, true) + 8 !== bytes.length) return null;
  let dimensions: [number, number] | null = null;
  let imageChunk = false;
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const kind = ascii(bytes, offset, 4);
    const size = view.getUint32(offset + 4, true);
    const data = offset + 8;
    if (data + size > bytes.length) return null;
    if (kind === "VP8X" && size >= 10) dimensions = [1 + bytes[data + 4] + (bytes[data + 5] << 8) + (bytes[data + 6] << 16), 1 + bytes[data + 7] + (bytes[data + 8] << 8) + (bytes[data + 9] << 16)];
    if (kind === "VP8 " && size >= 10 && bytes[data + 3] === 0x9d && bytes[data + 4] === 1 && bytes[data + 5] === 0x2a) {
      dimensions ??= [view.getUint16(data + 6, true) & 0x3fff, view.getUint16(data + 8, true) & 0x3fff]; imageChunk = true;
    }
    if (kind === "VP8L" && size >= 5 && bytes[data] === 0x2f) {
      const bits = view.getUint32(data + 1, true);
      dimensions ??= [1 + (bits & 0x3fff), 1 + ((bits >>> 14) & 0x3fff)]; imageChunk = true;
    }
    if (kind === "ANMF" && size >= 16) imageChunk = true;
    offset = data + size + (size % 2);
  }
  return imageChunk ? dimensions : null;
}

/** Check bytes as well as the browser's untrusted MIME declaration. SVG is never accepted. */
export function validateImageBytes(bytes: Uint8Array, declaredMime: string):
  | { ok: true; format: ImageFormat }
  | { ok: false; error: string } {
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) return { ok: false, error: "Choose a non-empty image no larger than 2 MiB." };
  let format: ImageFormat | undefined;
  const jpeg = jpegDimensions(bytes);
  if (jpeg && reasonableDimensions(...jpeg)) format = { mime: "image/jpeg", extension: "jpg" };
  if (bytes.length >= 45 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value) && ascii(bytes, 12, 4) === "IHDR" && ascii(bytes, bytes.length - 8, 4) === "IEND") {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const width = view.getUint32(16); const height = view.getUint32(20);
    if (!reasonableDimensions(width, height)) return { ok: false, error: "Choose an image with dimensions no larger than 12,000 pixels and 40 megapixels." };
    format = { mime: "image/png", extension: "png" };
  }
  const webp = webpDimensions(bytes);
  if (webp && reasonableDimensions(...webp)) format = { mime: "image/webp", extension: "webp" };
  if (!format || format.mime !== declaredMime.toLowerCase()) return { ok: false, error: "Choose a valid JPG, PNG, or WebP image whose file type matches its contents." };
  return { ok: true, format };
}

export function imageSize(bytes: number | null) {
  if (bytes === null) return "Size not recorded";
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KiB` : `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}
