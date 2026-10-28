/**
 * The periods Performance can show (docs/features/performance.md): a calendar month, a tax year or a custom range.
 * Periods are whole days, from and to inclusive, as YYYY-MM-DD.
 */
import { profitByMonth, taxYearStart, type MonthProfit, type ReportExpense } from "./expenses";
import { incomeByPatient, type MonthIncome, type PatientIncome, type ReportInvoice } from "./performance";

export type PeriodKind = "month" | "year" | "custom";
export type Period = { kind: PeriodKind; from: string; to: string; label: string };

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function lastDayOfMonth(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return new Date(Date.UTC(year, m, 0)).toISOString().slice(0, 10);
}

function isRealDate(value: string | undefined): value is string {
  return Boolean(value && DATE.test(value) && new Date(`${value}T00:00:00Z`).toISOString().startsWith(value));
}

/** A calendar month, "YYYY-MM". */
export function monthPeriod(month: string): Period {
  return {
    kind: "month",
    from: `${month}-01`,
    to: lastDayOfMonth(month),
    label: `${MONTH_NAMES[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`,
  };
}

/** The tax year that starts on 1 March of the given year. */
export function taxYearPeriod(startYear: number): Period {
  return {
    kind: "year",
    from: `${startYear}-03-01`,
    to: lastDayOfMonth(`${startYear + 1}-02`),
    label: `Tax year ${startYear}/${String(startYear + 1).slice(2)}`,
  };
}

/**
 * Reads the period from the page's address. Anything missing or invalid falls back to sensible defaults: this month,
 * this tax year, or (for a custom range) this tax year so far.
 */
export function readPeriod(params: { period?: string; month?: string; year?: string; from?: string; to?: string }, today: string): Period {
  const thisTaxYear = Number(taxYearStart(today).slice(0, 4));
  if (params.period === "month") {
    return monthPeriod(params.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month) ? params.month : today.slice(0, 7));
  }
  if (params.period === "custom") {
    const from = isRealDate(params.from) ? params.from : taxYearStart(today);
    const to = isRealDate(params.to) ? params.to : today;
    const [start, end] = from <= to ? [from, to] : [to, from];
    return { kind: "custom", from: start, to: end, label: "Custom dates" };
  }
  const year = Number(params.year);
  return taxYearPeriod(Number.isInteger(year) && year > 2000 && year < 2100 ? year : thisTaxYear);
}

/** Every month a period touches, oldest first, as YYYY-MM. */
export function monthsIn(period: Period): string[] {
  const months: string[] = [];
  const [endYear, endMonth] = period.to.split("-").map(Number);
  let [year, month] = period.from.split("-").map(Number);
  while (year < endYear || (year === endYear && month <= endMonth)) {
    months.push(`${year}-${String(month).padStart(2, "0")}`);
    [year, month] = month === 12 ? [year + 1, 1] : [year, month + 1];
  }
  return months;
}

export type PeriodReport = {
  invoicedCents: number;
  paidCents: number;
  expensesCents: number;
  profitCents: number;
  months: MonthProfit[];
  /** Expenses per category, biggest first. */
  byCategory: { name: string; cents: number }[];
  /** Patients invoiced in the period. */
  patients: PatientIncome[];
};

/**
 * What happened in a period: invoiced by invoice date, paid by the date paid, and expenses by the date paid, with
 * profit before tax as invoiced less expenses. Months are only the parts of them inside the period.
 */
export function periodReport(invoices: ReportInvoice[], expenses: ReportExpense[], period: Period): PeriodReport {
  const inPeriod = (date: string | null): date is string => date !== null && date >= period.from && date <= period.to;
  const invoiced = invoices.filter((invoice) => inPeriod(invoice.issuedOn));
  const paid = invoices.filter((invoice) => inPeriod(invoice.paidOn));
  const spent = expenses.filter((expense) => inPeriod(expense.spentOn));

  const months = new Map<string, MonthIncome>(monthsIn(period).map((month) => [month, { month, invoicedCents: 0, paidCents: 0 }]));
  for (const invoice of invoiced) months.get(invoice.issuedOn.slice(0, 7))!.invoicedCents += invoice.totalCents;
  for (const invoice of paid) months.get(invoice.paidOn!.slice(0, 7))!.paidCents += invoice.totalCents;

  const categories = new Map<string, number>();
  for (const expense of spent) categories.set(expense.categoryName, (categories.get(expense.categoryName) ?? 0) + expense.amountCents);

  const invoicedCents = sum(invoiced.map((invoice) => invoice.totalCents));
  const expensesCents = sum(spent.map((expense) => expense.amountCents));
  return {
    invoicedCents,
    paidCents: sum(paid.map((invoice) => invoice.totalCents)),
    expensesCents,
    profitCents: invoicedCents - expensesCents,
    months: profitByMonth([...months.values()], spent),
    byCategory: [...categories]
      .map(([name, cents]) => ({ name, cents }))
      .sort((a, b) => b.cents - a.cents || a.name.localeCompare(b.name)),
    patients: incomeByPatient(invoiced),
  };
}

function sum(cents: number[]): number {
  return cents.reduce((total, c) => total + c, 0);
}
