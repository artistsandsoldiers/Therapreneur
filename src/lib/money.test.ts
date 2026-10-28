import { describe, expect, it } from "vitest";
import { formatRands, parseRands } from "./money";

describe("formatRands", () => {
  it("formats cents as rands with thousands separators", () => {
    expect(formatRands(125000)).toBe("R1,250.00");
    expect(formatRands(5)).toBe("R0.05");
    expect(formatRands(0)).toBe("R0.00");
  });

  it("formats negative amounts", () => {
    expect(formatRands(-99950)).toBe("-R999.50");
  });

  it("rejects fractions of a cent", () => {
    expect(() => formatRands(10.5)).toThrow();
  });
});

describe("parseRands", () => {
  it("reads common ways of typing an amount", () => {
    expect(parseRands("450")).toBe(45000);
    expect(parseRands("R450.5")).toBe(45050);
    expect(parseRands("1,250.00")).toBe(125000);
    expect(parseRands("R1 250,50")).toBe(125050);
    expect(parseRands("311,7")).toBe(31170);
  });

  it("rejects anything that isn't an amount", () => {
    expect(parseRands("")).toBeNull();
    expect(parseRands("abc")).toBeNull();
    expect(parseRands("-5")).toBeNull();
    expect(parseRands("1.234")).toBeNull();
  });
});
