import { describe, expect, it } from "vitest";
import { checkReceipt, expensesByMonth, parseExpenseForm, profitByMonth, taxYearSoFar, taxYearStart } from "./expenses";
import type { ReportInvoice } from "./performance";

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [name, value] of Object.entries({ spent_on: "2026-10-20", amount: "450", supplier: "OTASA", category_id: "c1", ...fields })) {
    data.set(name, value);
  }
  return data;
};

describe("parseExpenseForm", () => {
  it("reads an expense with an existing category", () => {
    expect(parseExpenseForm(form({ amount: "R1 250,50", note: " yearly " }))).toEqual({
      ok: true,
      expense: { spent_on: "2026-10-20", supplier: "OTASA", amount_cents: 125050, note: "yearly", category_id: "c1", newCategoryName: null },
    });
  });

  it("reads a new category instead of an id", () => {
    const parsed = parseExpenseForm(form({ category_id: "new", new_category: "Stationery" }));
    expect(parsed.ok && parsed.expense).toMatchObject({ category_id: null, newCategoryName: "Stationery" });
  });

  it("refuses a missing amount, zero, supplier, category or new category name", () => {
    expect(parseExpenseForm(form({ amount: "" })).ok).toBe(false);
    expect(parseExpenseForm(form({ amount: "0" })).ok).toBe(false);
    expect(parseExpenseForm(form({ supplier: " " })).ok).toBe(false);
    expect(parseExpenseForm(form({ category_id: "" })).ok).toBe(false);
    expect(parseExpenseForm(form({ category_id: "new", new_category: "" })).ok).toBe(false);
    expect(parseExpenseForm(form({ spent_on: "" })).ok).toBe(false);
  });
});

describe("checkReceipt", () => {
  it("accepts photos and PDFs up to 10 MB", () => {
    expect(checkReceipt({ type: "image/jpeg", size: 10 * 1024 * 1024 })).toEqual({ ok: true, extension: "jpg" });
    expect(checkReceipt({ type: "application/pdf", size: 2000 })).toEqual({ ok: true, extension: "pdf" });
  });

  it("refuses other files, empty files and big files", () => {
    expect(checkReceipt({ type: "text/plain", size: 2000 }).ok).toBe(false);
    expect(checkReceipt({ type: "image/png", size: 0 }).ok).toBe(false);
    expect(checkReceipt({ type: "image/png", size: 10 * 1024 * 1024 + 1 }).ok).toBe(false);
  });
});

describe("taxYearStart", () => {
  it("starts on 1 March, the year before in January and February", () => {
    expect(taxYearStart("2026-10-28")).toBe("2026-03-01");
    expect(taxYearStart("2026-03-01")).toBe("2026-03-01");
    expect(taxYearStart("2027-02-28")).toBe("2026-03-01");
  });
});

describe("expensesByMonth", () => {
  it("groups newest month first with each month's total", () => {
    const months = expensesByMonth([
      { id: "a", spentOn: "2026-09-30", amountCents: 10000 },
      { id: "b", spentOn: "2026-10-02", amountCents: 2550 },
      { id: "c", spentOn: "2026-10-20", amountCents: 45000 },
    ]);
    expect(months.map((m) => [m.month, m.totalCents, m.expenses.map((e) => e.id)])).toEqual([
      ["2026-10", 47550, ["c", "b"]],
      ["2026-09", 10000, ["a"]],
    ]);
  });
});

const invoice = (issuedOn: string, totalCents: number): ReportInvoice => ({
  id: issuedOn,
  number: 1,
  issuedOn,
  paidOn: null,
  totalCents,
  patientId: "p1",
  patientName: "Thandi Mokoena",
  medicalAidName: null,
});

describe("profitByMonth", () => {
  it("takes each month's expenses off what was invoiced", () => {
    const rows = profitByMonth(
      [
        { month: "2026-09", invoicedCents: 100000, paidCents: 50000 },
        { month: "2026-10", invoicedCents: 20000, paidCents: 0 },
      ],
      [
        { spentOn: "2026-09-05", amountCents: 30000, categoryName: "Software" },
        { spentOn: "2026-10-01", amountCents: 25000, categoryName: "Rooms and rent" },
      ],
    );
    expect(rows).toEqual([
      { month: "2026-09", invoicedCents: 100000, paidCents: 50000, expensesCents: 30000, profitCents: 70000 },
      { month: "2026-10", invoicedCents: 20000, paidCents: 0, expensesCents: 25000, profitCents: -5000 },
    ]);
  });
});

describe("taxYearSoFar", () => {
  it("counts only 1 March to today, with expenses per category biggest first", () => {
    const year = taxYearSoFar(
      [invoice("2026-02-28", 99999), invoice("2026-03-01", 100000), invoice("2026-10-28", 50000)],
      [
        { spentOn: "2026-02-10", amountCents: 7777, categoryName: "Software" }, // last tax year
        { spentOn: "2026-04-01", amountCents: 20000, categoryName: "Software" },
        { spentOn: "2026-05-01", amountCents: 30000, categoryName: "Rooms and rent" },
        { spentOn: "2026-06-01", amountCents: 15000, categoryName: "Software" },
        { spentOn: "2026-11-01", amountCents: 1000, categoryName: "Other" }, // after today
      ],
      "2026-10-28",
    );
    expect(year).toEqual({
      from: "2026-03-01",
      incomeCents: 150000,
      expensesCents: 65000,
      profitCents: 85000,
      byCategory: [
        { name: "Software", cents: 35000 },
        { name: "Rooms and rent", cents: 30000 },
      ],
    });
  });
});
