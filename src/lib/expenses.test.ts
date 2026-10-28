import { describe, expect, it } from "vitest";
import { checkReceipt, expensesByMonth, parseExpenseForm, profitByMonth, taxYearStart } from "./expenses";

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
