import { describe, expect, it } from "vitest";
import { parseIcd10Codes } from "./patients";

describe("parseIcd10Codes", () => {
  it("reads codes separated by commas or spaces, in capitals, without repeats", () => {
    expect(parseIcd10Codes("m54.5, S52.50  m54.5")).toEqual({ ok: true, codes: ["M54.5", "S52.50"] });
    expect(parseIcd10Codes("")).toEqual({ ok: true, codes: [] });
  });

  it("rejects something that isn't a code", () => {
    expect(parseIcd10Codes("M54.5 back pain").ok).toBe(false);
  });
});
