/** The sums on Home (docs/features/home.md), worked out from the same invoices and expenses as Performance. */
import { toLocalInput } from "./dates";
import { taxYearStart, type ReportExpense } from "./expenses";
import type { ReportInvoice } from "./performance";
import { monthPeriod, periodReport } from "./periods";

/** "Good morning", "Good afternoon" or "Good evening", by South African time. */
export function greeting(now = new Date()): string {
  const hour = Number(toLocalInput(now).slice(11, 13));
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

/** The month before a "YYYY-MM" month, as "YYYY-MM". */
export function previousMonth(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return m === 1 ? `${year - 1}-12` : `${year}-${String(m - 1).padStart(2, "0")}`;
}

export type HomeSummary = {
  /** Paid this month, by the date it was paid, and the whole of last month for comparison. */
  paidThisMonthCents: number;
  paidLastMonthCents: number;
  /** Paid per month for the last six months, oldest first, this month included. */
  paidByMonth: { month: string; cents: number }[];
  invoicedThisMonthCents: number;
  invoicesThisMonth: number;
  expensesThisMonthCents: number;
  /** Invoiced less expenses in this tax year so far. */
  profitThisTaxYearCents: number;
};

export function homeSummary(invoices: ReportInvoice[], expenses: ReportExpense[], today: string): HomeSummary {
  const thisMonth = today.slice(0, 7);
  const months = [thisMonth];
  while (months.length < 6) months.unshift(previousMonth(months[0]));

  const sixMonths = periodReport(invoices, expenses, { ...monthPeriod(months[0]), to: monthPeriod(thisMonth).to });
  const current = periodReport(invoices, expenses, monthPeriod(thisMonth));
  const taxYear = periodReport(invoices, expenses, { ...monthPeriod(thisMonth), from: taxYearStart(today), to: today });

  return {
    paidThisMonthCents: current.paidCents,
    paidLastMonthCents: sixMonths.months[4].paidCents,
    paidByMonth: sixMonths.months.map((m) => ({ month: m.month, cents: m.paidCents })),
    invoicedThisMonthCents: current.invoicedCents,
    invoicesThisMonth: invoices.filter((invoice) => invoice.issuedOn.startsWith(thisMonth)).length,
    expensesThisMonthCents: current.expensesCents,
    profitThisTaxYearCents: taxYear.profitCents,
  };
}
