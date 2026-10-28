import { describe, expect, it } from "vitest";
import { ageBucket, daysOld, forReferrer, incomeByPatient, incomeByReferrer, outstanding, type ReportInvoice } from "./performance";

const invoice = (overrides: Partial<ReportInvoice>): ReportInvoice => ({
  id: "i",
  number: 1,
  issuedOn: "2026-10-01",
  paidOn: null,
  totalCents: 50000,
  patientId: "p1",
  patientName: "Thandi Mokoena",
  medicalAidName: "Discovery",
  referrer: null,
  ...overrides,
});

describe("incomeByReferrer", () => {
  const naidoo = { id: "r1", name: "Dr Naidoo" };
  const instagram = { id: "r2", name: "Instagram" };
  const invoices = [
    invoice({ id: "a", patientId: "p1", referrer: naidoo, totalCents: 40000, paidOn: "2026-10-10" }),
    invoice({ id: "b", patientId: "p1", referrer: naidoo, totalCents: 40000 }),
    invoice({ id: "c", patientId: "p2", referrer: naidoo, totalCents: 10000 }),
    invoice({ id: "d", patientId: "p3", referrer: null, totalCents: 99000 }),
    invoice({ id: "e", patientId: "p4", referrer: instagram, totalCents: 20000 }),
  ];

  it("totals each referrer, biggest first, counting patients once, with no referrer last", () => {
    expect(incomeByReferrer(invoices)).toEqual([
      { referrerId: "r1", name: "Dr Naidoo", patientCount: 2, invoicedCents: 90000, paidCents: 40000 },
      { referrerId: "r2", name: "Instagram", patientCount: 1, invoicedCents: 20000, paidCents: 0 },
      { referrerId: null, name: "No referrer", patientCount: 1, invoicedCents: 99000, paidCents: 0 },
    ]);
  });

  it("filters to one referrer, to patients with none, or not at all", () => {
    expect(forReferrer(invoices, "r2").map((i) => i.id)).toEqual(["e"]);
    expect(forReferrer(invoices, "none").map((i) => i.id)).toEqual(["d"]);
    expect(forReferrer(invoices, "")).toHaveLength(5);
  });
});

describe("incomeByPatient", () => {
  it("totals each patient, biggest first, with payer type from their latest invoice", () => {
    const patients = incomeByPatient([
      invoice({ number: 1, patientId: "p1", paidOn: "2026-10-10", totalCents: 40000 }),
      invoice({ number: 2, patientId: "p2", patientName: "Sam Naidoo", medicalAidName: null, totalCents: 90000 }),
      invoice({ number: 3, patientId: "p1", medicalAidName: null, totalCents: 10000 }),
    ]);
    expect(patients).toEqual([
      { patientId: "p2", patientName: "Sam Naidoo", payerType: "Patient", invoicedCents: 90000, paidCents: 0, outstandingCents: 90000 },
      { patientId: "p1", patientName: "Thandi Mokoena", payerType: "Patient", invoicedCents: 50000, paidCents: 40000, outstandingCents: 10000 },
    ]);
  });
});

describe("ageing", () => {
  it("counts whole days and puts the boundaries in the younger bucket", () => {
    expect(daysOld("2026-09-28", "2026-10-28")).toBe(30);
    expect([0, 30, 31, 60, 61, 90, 91].map(ageBucket)).toEqual([0, 0, 1, 1, 2, 2, 3]);
  });
});

describe("outstanding", () => {
  it("groups unpaid invoices by medical aid then cash, by age, oldest invoice first", () => {
    const result = outstanding(
      [
        invoice({ id: "a", number: 1, issuedOn: "2026-07-01", totalCents: 10000 }), // 119 days
        invoice({ id: "b", number: 2, issuedOn: "2026-10-20", totalCents: 20000, medicalAidName: "Bonitas" }),
        invoice({ id: "c", number: 3, issuedOn: "2026-09-15", totalCents: 30000, medicalAidName: null }), // 43 days
        invoice({ id: "d", number: 4, issuedOn: "2026-10-25", totalCents: 40000, paidOn: "2026-10-27" }),
      ],
      "2026-10-28",
    );
    expect(result.rows).toEqual([
      { payer: "Bonitas", bucketCents: [20000, 0, 0, 0], totalCents: 20000 },
      { payer: "Discovery", bucketCents: [0, 0, 0, 10000], totalCents: 10000 },
      { payer: "Patients", bucketCents: [0, 30000, 0, 0], totalCents: 30000 },
    ]);
    expect(result.totals).toEqual({ payer: "Total", bucketCents: [20000, 30000, 0, 10000], totalCents: 60000 });
    expect(result.invoices.map((i) => i.id)).toEqual(["a", "c", "b"]);
  });
});
