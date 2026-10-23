import { describe, expect, it } from "vitest";
import { priceCapture, type CaptureContext } from "./capture";

const context: CaptureContext = {
  rates: [
    { billingCodeId: "consult", medicalAidId: "discovery", rateCents: 31170, effectiveFrom: "2026-01-01" },
    { billingCodeId: "splint", medicalAidId: "discovery", rateCents: null, effectiveFrom: "2026-01-01" },
  ],
  patientMedicalAidId: "bonitas",
  defaultMedicalAidId: "discovery",
  sessionDate: "2026-10-23",
  adjustmentPercent: 5,
  noShowCodeId: "no-show",
  noShowPriceCents: 35000,
};

describe("priceCapture", () => {
  it("prices fixed-rate codes from the rate and the practice's adjustment, ignoring any typed price", () => {
    const result = priceCapture("attended", [{ billingCodeId: "consult", quantity: 2, typedPriceCents: 1 }], context);
    expect(result).toEqual({ ok: true, lines: [{ billing_code_id: "consult", quantity: 2, unit_price_cents: 32729 }] });
  });

  it("uses the typed price for codes without a fixed rate", () => {
    const result = priceCapture("attended", [{ billingCodeId: "splint", quantity: 1, typedPriceCents: 85000 }], context);
    expect(result).toEqual({ ok: true, lines: [{ billing_code_id: "splint", quantity: 1, unit_price_cents: 85000 }] });
  });

  it("needs a price for codes without a fixed rate", () => {
    expect(priceCapture("attended", [{ billingCodeId: "splint", quantity: 1, typedPriceCents: null }], context).ok).toBe(false);
  });

  it("bills a no-show as one line at the no-show price, whatever codes were picked", () => {
    const result = priceCapture("no_show", [{ billingCodeId: "consult", quantity: 1, typedPriceCents: null }], context);
    expect(result).toEqual({ ok: true, lines: [{ billing_code_id: "no-show", quantity: 1, unit_price_cents: 35000 }] });
  });

  it("needs at least one code and a sensible quantity", () => {
    expect(priceCapture("attended", [], context).ok).toBe(false);
    expect(priceCapture("attended", [{ billingCodeId: "consult", quantity: 0, typedPriceCents: null }], context).ok).toBe(false);
  });
});
