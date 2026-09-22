// Validating an uploaded image before it reaches the bucket.
import { badRequest } from "@/lib/api/response";

/** The UI promises "JPG or PNG, up to 2MB" — this is what enforces it. */
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

interface ImageType {
  mime: string;
  extension: string;
  /** Leading bytes that identify the format. `null` entries match anything. */
  signature: (number | null)[];
}

// WebP is accepted alongside the two the UI names: browsers increasingly hand
// it over from image pickers and it is strictly smaller for the same quality.
const IMAGE_TYPES: ImageType[] = [
  { mime: "image/jpeg", extension: "jpg", signature: [0xff, 0xd8, 0xff] },
  {
    mime: "image/png",
    extension: "png",
    signature: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  },
  {
    mime: "image/webp",
    extension: "webp",
    // "RIFF" .... "WEBP" — the four size bytes in between are skipped.
    signature: [0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50],
  },
];

export interface ValidatedImage {
  buffer: Buffer;
  mime: string;
  extension: string;
}

/**
 * Checks the file's actual leading bytes rather than the Content-Type the
 * client sent.
 *
 * A browser's reported MIME type is just a claim; anything can POST a
 * multipart body labelled `image/png` containing an HTML document or a script.
 * Since these files are then served from our own domain, taking that claim at
 * face value would be a stored-XSS vector. Sniffing the signature is what
 * makes "it says it is a PNG" into "it is a PNG".
 */
export function validateImage(file: File, buffer: Buffer): ValidatedImage {
  if (buffer.byteLength === 0) {
    throw badRequest("That file is empty.");
  }

  if (buffer.byteLength > MAX_AVATAR_BYTES) {
    const mb = (buffer.byteLength / (1024 * 1024)).toFixed(1);
    throw badRequest(`That image is ${mb}MB — the limit is 2MB.`);
  }

  const detected = IMAGE_TYPES.find((type) => matchesSignature(buffer, type.signature));

  if (!detected) {
    throw badRequest("That file is not a JPG, PNG or WebP image.");
  }

  // The declared type disagreeing with the contents is not necessarily an
  // attack — some pickers mislabel — so trust the bytes and carry on, rather
  // than rejecting a genuine image over a bad label.
  if (file.type && file.type !== detected.mime) {
    console.warn(`[upload] declared ${file.type} but bytes are ${detected.mime}`);
  }

  return { buffer, mime: detected.mime, extension: detected.extension };
}

function matchesSignature(buffer: Buffer, signature: (number | null)[]): boolean {
  if (buffer.byteLength < signature.length) return false;

  return signature.every((byte, index) => byte === null || buffer[index] === byte);
}
