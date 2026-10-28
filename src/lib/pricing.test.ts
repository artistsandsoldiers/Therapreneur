import { describe, expect, it } from "vitest";
import { adjustPrice, findRate, invoiceTotal, practicePrice, type Rate } from "./pricing";

describe("adjustPrice", () => {
  it("leaves the medical aid rate unchanged at 0%", () => {
    expect(adjustPrice(31170, 0)).toBe(31170);
  });

  it("charges above or below the rate, rounding to the nearest cent", () => {
    expect(adjustPrice(31170, 5)).toBe(32729); // 327.285 rounds up
    expect(adjustPrice(31170, -5)).toBe(29612); // 296.115 rounds up
    expect(adjustPrice(15620, 10)).toBe(17182);
  });

  it("rejects fractions", () => {
    expect(() => adjustPrice(100.5, 0)).toThrow();
    expect(() => adjustPrice(100, 2.5)).toThrow();
  });
});

const discovery = "discovery";
const bonitas = "bonitas";
const rates: Rate[] = [
  { billingCodeId: "66108", medicalAidId: discovery, rateCents: 30000, effectiveFrom: "2025-01-01" },
  { billingCodeId: "66108", medicalAidId: discovery, rateCents: 31170, effectiveFrom: "2026-01-01" },
  { billingCodeId: "66108", medicalAidId: bonitas, rateCents: 32000, effectiveFrom: "2026-01-01" },
  { billingCodeId: "66701", medicalAidId: discovery, rateCents: null, effectiveFrom: "2026-01-01" },
  { billingCodeId: "66111", medicalAidId: discovery, rateCents: 0, effectiveFrom: "2026-01-01" },
];

describe("findRate", () => {
  it("uses the patient's medical aid when we have its rate", () => {
    const rate = findRate(rates, "66108", { patient: bonitas, fallback: discovery }, "2026-03-01");
    expect(rate?.rateCents).toBe(32000);
  });

  it("falls back to the default medical aid, for cash patients too", () => {
    expect(findRate(rates, "66108", { patient: "other", fallback: discovery }, "2026-03-01")?.rateCents).toBe(31170);
    expect(findRate(rates, "66108", { patient: null, fallback: discovery }, "2026-03-01")?.rateCents).toBe(31170);
  });

  it("uses the rate in force on the session date", () => {
    expect(findRate(rates, "66108", { patient: null, fallback: discovery }, "2025-12-31")?.rateCents).toBe(30000);
  });
});

describe("practicePrice", () => {
  const find = (code: string) => findRate(rates, code, { patient: null, fallback: discovery }, "2026-03-01");

  it("adjusts a fixed rate", () => {
    expect(practicePrice(find("66108"), 5)).toBe(32729);
  });

  it("asks the practitioner when there is no fixed amount or the medical aid pays nothing", () => {
    expect(practicePrice(find("66701"), 5)).toBeNull();
    expect(practicePrice(find("66111"), 5)).toBeNull();
    expect(practicePrice(undefined, 5)).toBeNull();
  });
});

describe("invoiceTotal", () => {
  it("adds quantity times price for each line", () => {
    expect(invoiceTotal([{ quantity: 1, unitPriceCents: 31170 }, { quantity: 2, unitPriceCents: 15620 }])).toBe(62410);
    expect(invoiceTotal([])).toBe(0);
  });
});
