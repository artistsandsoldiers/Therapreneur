import { describe, expect, it } from "vitest";
import { ageBucket, daysOld, incomeByMonth, incomeByPatient, lastMonths, outstanding, type ReportInvoice } from "./reports";

const invoice = (overrides: Partial<ReportInvoice>): ReportInvoice => ({
  id: "i",
  number: 1,
  issuedOn: "2026-10-01",
  paidOn: null,
  totalCents: 50000,
  patientId: "p1",
  patientName: "Thandi Mokoena",
  medicalAidName: "Discovery",
  ...overrides,
});

describe("lastMonths", () => {
  it("counts back across a year end", () => {
    expect(lastMonths("2026-02-15", 4)).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
  });
});

describe("incomeByMonth", () => {
  it("counts invoiced by invoice date and paid by paid date", () => {
    const months = incomeByMonth(
      [
        invoice({ number: 1, issuedOn: "2026-09-20", paidOn: "2026-10-05", totalCents: 45000 }),
        invoice({ number: 2, issuedOn: "2026-10-02", totalCents: 31170 }),
        invoice({ number: 3, issuedOn: "2026-01-10", paidOn: "2026-01-20" }), // older than 6 months
      ],
      "2026-10-28",
    );
    expect(months.map((m) => m.month)).toEqual(["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"]);
    expect(months[4]).toEqual({ month: "2026-09", invoicedCents: 45000, paidCents: 0 });
    expect(months[5]).toEqual({ month: "2026-10", invoicedCents: 31170, paidCents: 45000 });
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
      { patientId: "p2", patientName: "Sam Naidoo", payerType: "Cash", invoicedCents: 90000, paidCents: 0, outstandingCents: 90000 },
      { patientId: "p1", patientName: "Thandi Mokoena", payerType: "Cash", invoicedCents: 50000, paidCents: 40000, outstandingCents: 10000 },
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
      { payer: "Cash", bucketCents: [0, 30000, 0, 0], totalCents: 30000 },
    ]);
    expect(result.totals).toEqual({ payer: "Total", bucketCents: [20000, 30000, 0, 10000], totalCents: 60000 });
    expect(result.invoices.map((i) => i.id)).toEqual(["a", "c", "b"]);
  });
});
