import { describe, expect, it } from "vitest";
import { inDateRange, matchesSearch } from "./filters";

describe("matchesSearch", () => {
  it("needs every word, in any order and case", () => {
    expect(matchesSearch("Thandi Mokoena Discovery", "mokoena thandi")).toBe(true);
    expect(matchesSearch("Thandi Mokoena", "thandi sipho")).toBe(false);
    expect(matchesSearch("Anything", "  ")).toBe(true);
  });
});

describe("inDateRange", () => {
  it("includes both ends and leaves empty ends open", () => {
    expect(inDateRange("2026-10-01", "2026-10-01", "2026-10-31")).toBe(true);
    expect(inDateRange("2026-10-31", "2026-10-01", "2026-10-31")).toBe(true);
    expect(inDateRange("2026-11-01", "2026-10-01", "2026-10-31")).toBe(false);
    expect(inDateRange("2020-01-01", "", "2026-10-31")).toBe(true);
    expect(inDateRange("2030-01-01", "2026-10-01", "")).toBe(true);
  });
});
