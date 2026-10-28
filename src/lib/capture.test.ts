import { describe, expect, it } from "vitest";
import { codeHistories, priceCapture, sessionBillTo, type CaptureContext, type PastInvoice } from "./capture";

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

describe("sessionBillTo", () => {
  const withAid = { medical_aid_id: "discovery" };

  it("follows the practitioner's choice for a patient with medical aid", () => {
    expect(sessionBillTo("attended", "medical_aid", withAid)).toBe("medical_aid");
    expect(sessionBillTo("attended", "patient", withAid)).toBe("patient");
  });

  it("bills the patient for a no-show, or when they have no medical aid", () => {
    expect(sessionBillTo("no_show", "medical_aid", withAid)).toBe("patient");
    expect(sessionBillTo("attended", "medical_aid", { medical_aid_id: null })).toBe("patient");
  });
});

describe("codeHistories", () => {
  const invoice = (sessionId: string, startsAt: string, codes: [string, number][], patientId = "p1"): PastInvoice => ({
    sessionId,
    patientId,
    startsAt,
    lines: codes.map(([billingCodeId, quantity], position) => ({ billingCodeId, quantity, position })),
  });
  const invoices = [
    invoice("s1", "2026-10-01T08:00:00Z", [["a", 1], ["b", 2]]),
    invoice("s2", "2026-10-08T08:00:00Z", [["a", 1], ["c", 1]]),
    invoice("s3", "2026-10-15T08:00:00Z", [["d", 1], ["a", 3]]),
    invoice("s4", "2026-10-15T08:00:00Z", [["x", 1]], "p2"),
  ];

  it("puts the most used codes first, then the most recently used", () => {
    expect(codeHistories(invoices).p1.usual).toEqual(["a", "d", "c", "b"]);
  });

  it("copies the latest invoice's codes and quantities in order", () => {
    expect(codeHistories(invoices).p1.last).toEqual([
      { billingCodeId: "d", quantity: 1 },
      { billingCodeId: "a", quantity: 3 },
    ]);
  });

  it("leaves out the session being fixed", () => {
    expect(codeHistories(invoices, "s3").p1.last.map((line) => line.billingCodeId)).toEqual(["a", "c"]);
  });

  it("keeps each patient's history separate", () => {
    expect(codeHistories(invoices).p2.usual).toEqual(["x"]);
  });
});
