import { describe, expect, it } from "vitest";
import { groupByMedicalAid, parseRemittanceForm, type OutstandingClaim } from "./reconciliation";

const claim = (id: string, medicalAidName: string, totalCents: number): OutstandingClaim => ({
  id,
  number: 1,
  issuedOn: "2026-10-01",
  patientName: "Thandi Mokoena",
  memberNumber: "123",
  totalCents,
  medicalAidId: medicalAidName.toLowerCase(),
  medicalAidName,
  claimedOn: "2026-10-02T08:00:00Z",
  referenceNumber: null,
});

describe("groupByMedicalAid", () => {
  it("groups claims by medical aid alphabetically, with a total in cents", () => {
    const groups = groupByMedicalAid([claim("a", "Discovery", 85050), claim("b", "Bonitas", 10000), claim("c", "Discovery", 49999)]);
    expect(groups.map((group) => [group.name, group.claims.map((c) => c.id), group.totalCents])).toEqual([
      ["Bonitas", ["b"], 10000],
      ["Discovery", ["a", "c"], 135049],
    ]);
  });
});

describe("parseRemittanceForm", () => {
  const form = (entries: [string, string][]) => {
    const data = new FormData();
    for (const [key, value] of entries) data.append(key, value);
    return data;
  };

  it("reads the paid date, reference and ticked claims", () => {
    const result = parseRemittanceForm(
      form([["paid_on", "2026-10-15"], ["reference", " REM-77 "], ["invoice", "a"], ["invoice", "b"], ["invoice", "a"]]),
      "2026-10-28",
    );
    expect(result).toEqual({ ok: true, details: { paidOn: "2026-10-15", reference: "REM-77", invoiceIds: ["a", "b"] } });
  });

  it("needs a past date and at least one claim", () => {
    expect(parseRemittanceForm(form([["paid_on", "2026-10-29"], ["invoice", "a"]]), "2026-10-28").ok).toBe(false);
    expect(parseRemittanceForm(form([["paid_on", ""], ["invoice", "a"]]), "2026-10-28").ok).toBe(false);
    expect(parseRemittanceForm(form([["paid_on", "2026-10-15"]]), "2026-10-28").ok).toBe(false);
  });
});
