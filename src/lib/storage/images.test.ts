// Upload validation decides what gets served from our own domain, so a gap
// here is a stored-XSS vector rather than a cosmetic bug.

import { describe, expect, it } from "vitest";
import { MAX_AVATAR_BYTES, validateImage } from "./images";

const asFile = (name = "x.png") => new File([], name);

const png = (extra = 0) =>
  Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.alloc(extra),
  ]);

describe("validateImage", () => {
  it("accepts a real PNG", () => {
    expect(validateImage(asFile(), png()).mime).toBe("image/png");
  });

  it("accepts a real JPEG", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
    expect(validateImage(asFile("x.jpg"), jpeg).mime).toBe("image/jpeg");
  });

  it("accepts a WebP despite the variable size bytes in its header", () => {
    const webp = Buffer.from([
      0x52, 0x49, 0x46, 0x46, 0x2a, 0x13, 0x07, 0x00, 0x57, 0x45, 0x42, 0x50,
    ]);
    expect(validateImage(asFile("x.webp"), webp).mime).toBe("image/webp");
  });

  it("rejects HTML dressed up as a PNG", () => {
    // The attack this exists to stop: a .png filename and an image/png
    // Content-Type wrapped around a document the browser would execute.
    const html = Buffer.from("<html><script>alert(1)</script></html>", "utf8");
    expect(() => validateImage(asFile("evil.png"), html)).toThrow();
  });

  it("rejects an SVG, which is script-capable", () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>', "utf8");
    expect(() => validateImage(asFile("x.svg"), svg)).toThrow();
  });

  it("rejects a file over the size cap", () => {
    expect(() => validateImage(asFile(), png(MAX_AVATAR_BYTES + 1))).toThrow();
  });

  it("rejects an empty file", () => {
    expect(() => validateImage(asFile(), Buffer.alloc(0))).toThrow();
  });
});
