/**
 * Expenses (docs/features/expenses.md): what the practice spends, with optional receipts, and the profit before tax
 * that Performance shows. All amounts are whole cents.
 */
import { parseRands } from "./money";
import type { MonthIncome, ReportInvoice } from "./performance";

// Receipts live in a private Supabase Storage bucket, one folder per practice (decision 0006). Uploaded from the
// browser straight to storage, since a server action can't take a 10 MB phone photo.
export const RECEIPT_BUCKET = "receipts";
export const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;
const FORMATS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "application/pdf": "pdf",
};
export const RECEIPT_ACCEPT = Object.keys(FORMATS).join(",");

/** Checks a receipt before upload. Returns its file extension, or the problem in plain words. */
export function checkReceipt(file: { type: string; size: number }): { ok: true; extension: string } | { ok: false; error: string } {
  const extension = FORMATS[file.type];
  if (!extension) return { ok: false, error: "Please choose a photo or a PDF." };
  if (file.size === 0) return { ok: false, error: "That file is empty. Please choose another." };
  if (file.size > MAX_RECEIPT_BYTES) return { ok: false, error: "Please choose a file under 10 MB." };
  return { ok: true, extension };
}

/** The value of the category picker's last option, which reveals a box for a new category's name. */
export const NEW_CATEGORY = "new";

export type ExpenseInput = {
  spent_on: string;
  supplier: string;
  amount_cents: number;
  note: string | null;
  /** An existing category's id, or null when newCategoryName is set. */
  category_id: string | null;
  newCategoryName: string | null;
};

/** Reads and checks the expense form. */
export function parseExpenseForm(form: FormData): { ok: true; expense: ExpenseInput } | { ok: false; error: string } {
  const text = (name: string) => String(form.get(name) ?? "").trim();

  const spentOn = text("spent_on");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(spentOn) || Number.isNaN(Date.parse(spentOn))) {
    return { ok: false, error: "Please enter the date you paid." };
  }
  const amount = parseRands(text("amount"));
  if (!amount) return { ok: false, error: "Please enter the amount you paid, like 450 or 1 250,50." };
  const supplier = text("supplier");
  if (!supplier) return { ok: false, error: "Please enter who you paid." };
  if (supplier.length > 200) return { ok: false, error: "Please shorten who you paid to under 200 characters." };
  const note = text("note");
  if (note.length > 2000) return { ok: false, error: "Please shorten the note to under 2,000 characters." };

  const category = text("category_id");
  const newName = text("new_category");
  if (!category) return { ok: false, error: "Please choose a category." };
  if (category === NEW_CATEGORY && !newName) return { ok: false, error: "Please name your new category." };
  if (newName.length > 60) return { ok: false, error: "Please shorten the category name to under 60 characters." };

  return {
    ok: true,
    expense: {
      spent_on: spentOn,
      supplier,
      amount_cents: amount,
      note: note || null,
      category_id: category === NEW_CATEGORY ? null : category,
      newCategoryName: category === NEW_CATEGORY ? newName : null,
    },
  };
}

/** The first day of the SA tax year (1 March to the end of February) that today falls in, as YYYY-MM-DD. */
export function taxYearStart(today: string): string {
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  return `${month >= 3 ? year : year - 1}-03-01`;
}

export type ListedExpense = { id: string; spentOn: string; amountCents: number };

/** Expenses grouped by month (YYYY-MM), newest month first, newest expense first within it. */
export function expensesByMonth<T extends ListedExpense>(expenses: T[]): { month: string; totalCents: number; expenses: T[] }[] {
  const months = new Map<string, { month: string; totalCents: number; expenses: T[] }>();
  const sorted = [...expenses].sort((a, b) => b.spentOn.localeCompare(a.spentOn));
  for (const expense of sorted) {
    const month = expense.spentOn.slice(0, 7);
    const group = months.get(month) ?? { month, totalCents: 0, expenses: [] };
    group.totalCents += expense.amountCents;
    group.expenses.push(expense);
    months.set(month, group);
  }
  return [...months.values()];
}

export type ReportExpense = { spentOn: string; amountCents: number; categoryName: string };

export type MonthProfit = MonthIncome & { expensesCents: number; profitCents: number };

/** Adds each month's expenses and profit before tax (invoiced less expenses) to income per month. */
export function profitByMonth(months: MonthIncome[], expenses: ReportExpense[]): MonthProfit[] {
  return months.map((month) => {
    const expensesCents = sum(expenses.filter((e) => e.spentOn.startsWith(month.month)).map((e) => e.amountCents));
    return { ...month, expensesCents, profitCents: month.invoicedCents - expensesCents };
  });
}

export type TaxYearSoFar = {
  from: string; // YYYY-MM-DD
  incomeCents: number;
  expensesCents: number;
  profitCents: number;
  /** Expenses per category, biggest first. */
  byCategory: { name: string; cents: number }[];
};

/** Income by invoice date, expenses and profit before tax from 1 March up to today. */
export function taxYearSoFar(invoices: ReportInvoice[], expenses: ReportExpense[], today: string): TaxYearSoFar {
  const from = taxYearStart(today);
  const inYear = (date: string) => date >= from && date <= today;

  const yearExpenses = expenses.filter((e) => inYear(e.spentOn));
  const categories = new Map<string, number>();
  for (const expense of yearExpenses) {
    categories.set(expense.categoryName, (categories.get(expense.categoryName) ?? 0) + expense.amountCents);
  }

  const incomeCents = sum(invoices.filter((i) => inYear(i.issuedOn)).map((i) => i.totalCents));
  const expensesCents = sum(yearExpenses.map((e) => e.amountCents));
  return {
    from,
    incomeCents,
    expensesCents,
    profitCents: incomeCents - expensesCents,
    byCategory: [...categories]
      .map(([name, cents]) => ({ name, cents }))
      .sort((a, b) => b.cents - a.cents || a.name.localeCompare(b.name)),
  };
}

function sum(cents: number[]): number {
  return cents.reduce((total, c) => total + c, 0);
}

export type ExpenseCategory = { id: string; name: string; hint: string | null; own: boolean };

/** The central categories in their set order, then the practice's own alphabetically. */
export function sortCategories(rows: { id: string; name: string; hint: string | null; position: number; practice_id: string | null }[]): ExpenseCategory[] {
  return [...rows]
    .sort((a, b) =>
      Number(a.practice_id !== null) - Number(b.practice_id !== null) || a.position - b.position || a.name.localeCompare(b.name),
    )
    .map((row) => ({ id: row.id, name: row.name, hint: row.hint, own: row.practice_id !== null }));
}
