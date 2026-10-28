import { describe, expect, it } from "vitest";
import { checkLogo } from "./logo";

describe("checkLogo", () => {
  it("accepts PNG and JPG images up to 1 MB", () => {
    expect(checkLogo({ type: "image/png", size: 1024 * 1024 })).toEqual({ ok: true, extension: "png" });
    expect(checkLogo({ type: "image/jpeg", size: 2000 })).toEqual({ ok: true, extension: "jpg" });
  });

  it("refuses other file types, empty files and big files", () => {
    expect(checkLogo({ type: "image/svg+xml", size: 2000 }).ok).toBe(false);
    expect(checkLogo({ type: "image/png", size: 0 }).ok).toBe(false);
    expect(checkLogo({ type: "image/png", size: 1024 * 1024 + 1 }).ok).toBe(false);
  });
});
