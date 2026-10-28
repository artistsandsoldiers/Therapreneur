import { describe, expect, it } from "vitest";
import { greeting, homeSummary, previousMonth } from "./home";
import type { ReportInvoice } from "./performance";

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

describe("greeting", () => {
  it("follows South African time, two hours ahead of UTC", () => {
    expect(greeting(new Date("2026-10-28T09:59:00Z"))).toBe("Good morning");
    expect(greeting(new Date("2026-10-28T10:00:00Z"))).toBe("Good afternoon");
    expect(greeting(new Date("2026-10-28T15:00:00Z"))).toBe("Good evening");
    expect(greeting(new Date("2026-10-27T23:30:00Z"))).toBe("Good morning");
  });
});

describe("previousMonth", () => {
  it("steps back across a year end", () => {
    expect(previousMonth("2026-10")).toBe("2026-09");
    expect(previousMonth("2026-01")).toBe("2025-12");
  });
});

describe("homeSummary", () => {
  it("sums this month, last month, six months of payments and the tax year's profit", () => {
    const summary = homeSummary(
      [
        invoice({ issuedOn: "2026-10-05", paidOn: "2026-10-20", totalCents: 40000 }),
        invoice({ issuedOn: "2026-10-12", totalCents: 60000 }),
        invoice({ issuedOn: "2026-09-10", paidOn: "2026-09-30", totalCents: 30000 }),
        invoice({ issuedOn: "2026-02-10", paidOn: "2026-03-05", totalCents: 99999 }), // invoiced last tax year
        invoice({ issuedOn: "2026-04-01", paidOn: "2026-04-15", totalCents: 20000 }), // older than six months
      ],
      [
        { spentOn: "2026-10-02", amountCents: 15000, categoryName: "Rent" },
        { spentOn: "2026-02-27", amountCents: 70000, categoryName: "Rent" }, // last tax year
      ],
      "2026-10-28",
    );
    expect(summary).toEqual({
      paidThisMonthCents: 40000,
      paidLastMonthCents: 30000,
      paidByMonth: [
        { month: "2026-05", cents: 0 },
        { month: "2026-06", cents: 0 },
        { month: "2026-07", cents: 0 },
        { month: "2026-08", cents: 0 },
        { month: "2026-09", cents: 30000 },
        { month: "2026-10", cents: 40000 },
      ],
      invoicedThisMonthCents: 100000,
      invoicesThisMonth: 2,
      expensesThisMonthCents: 15000,
      // Invoiced since 1 March (40000 + 60000 + 30000 + 20000) less October's expense.
      profitThisTaxYearCents: 135000,
    });
  });
});
