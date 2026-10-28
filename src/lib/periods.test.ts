import { describe, expect, it } from "vitest";
import { monthsIn, periodReport, readPeriod, taxYearPeriod } from "./periods";
import type { ReportExpense } from "./expenses";
import type { ReportInvoice } from "./performance";

const today = "2026-10-28";

describe("readPeriod", () => {
  it("defaults to this tax year", () => {
    expect(readPeriod({}, today)).toEqual({ kind: "year", from: "2026-03-01", to: "2027-02-28", label: "Tax year 2026/27" });
  });

  it("reads a month, falling back to this month", () => {
    expect(readPeriod({ period: "month", month: "2024-02" }, today)).toMatchObject({ from: "2024-02-01", to: "2024-02-29", label: "February 2024" });
    expect(readPeriod({ period: "month", month: "2026-13" }, today)).toMatchObject({ from: "2026-10-01", to: "2026-10-31" });
  });

  it("ends a leap tax year on 29 February", () => {
    expect(taxYearPeriod(2027).to).toBe("2028-02-29");
  });

  it("reads custom dates in either order, and falls back to the tax year so far", () => {
    expect(readPeriod({ period: "custom", from: "2026-09-30", to: "2026-08-01" }, today)).toMatchObject({ from: "2026-08-01", to: "2026-09-30" });
    expect(readPeriod({ period: "custom", from: "2026-02-30" }, today)).toMatchObject({ from: "2026-03-01", to: today });
  });
});

describe("monthsIn", () => {
  it("lists every month a period touches, across a year end", () => {
    expect(monthsIn({ kind: "custom", from: "2025-11-15", to: "2026-02-02", label: "" })).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
  });
});

describe("periodReport", () => {
  const invoice = (id: string, issuedOn: string, paidOn: string | null, totalCents: number): ReportInvoice => ({
    id,
    number: Number(id),
    issuedOn,
    paidOn,
    totalCents,
    patientId: "p1",
    patientName: "Thandi Mokoena",
    medicalAidName: null,
  });
  const invoices = [
    invoice("1", "2026-09-30", "2026-10-02", 50000), // invoiced in September, paid in October
    invoice("2", "2026-10-05", null, 70000),
    invoice("3", "2026-11-01", null, 99900), // after the period
  ];
  const expenses: ReportExpense[] = [
    { spentOn: "2026-10-01", amountCents: 20000, categoryName: "Rooms and rent" },
    { spentOn: "2026-10-31", amountCents: 5000, categoryName: "Software" },
    { spentOn: "2026-09-01", amountCents: 1000, categoryName: "Software" },
  ];

  it("counts invoiced by invoice date, paid by paid date and expenses by date paid, for a month", () => {
    const report = periodReport(invoices, expenses, readPeriod({ period: "month", month: "2026-10" }, today));
    expect(report).toMatchObject({ invoicedCents: 70000, paidCents: 50000, expensesCents: 25000, profitCents: 45000 });
    expect(report.byCategory).toEqual([
      { name: "Rooms and rent", cents: 20000 },
      { name: "Software", cents: 5000 },
    ]);
    expect(report.patients.map((p) => p.invoicedCents)).toEqual([70000]);
  });

  it("splits a custom range into its months", () => {
    const report = periodReport(invoices, expenses, readPeriod({ period: "custom", from: "2026-09-15", to: "2026-10-31" }, today));
    expect(report.months.map((m) => [m.month, m.invoicedCents, m.paidCents, m.expensesCents])).toEqual([
      ["2026-09", 50000, 0, 0],
      ["2026-10", 70000, 50000, 25000],
    ]);
  });
});
