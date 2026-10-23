import { describe, expect, it } from "vitest";
import { formatRands } from "./money";

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
