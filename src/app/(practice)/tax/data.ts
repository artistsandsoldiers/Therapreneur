import type { createClient } from "@/lib/supabase/server";
import { invoiceTotal } from "@/lib/pricing";
import { estimateTax, taxYearDates, type OtherIncome, type TaxEstimate } from "@/lib/tax";

type Client = Awaited<ReturnType<typeof createClient>>;

/** One tax year's answers, other income and payments. Row is null until the practice has answered for that year. */
export async function loadTaxYear(supabase: Client, year: number) {
  const [row, other, payments] = await Promise.all([
    supabase.from("tax_years").select("*").eq("tax_year", year).maybeSingle(),
    supabase.from("tax_other_income").select("kind, yearly_cents, paye_cents").eq("tax_year", year),
    supabase.from("tax_payments").select("id, paid_on, amount_cents").eq("tax_year", year).order("paid_on"),
  ]);
  for (const result of [row, other, payments]) if (result.error) throw result.error;
  const otherIncome: OtherIncome[] = other.data!.map((i) => ({ kind: i.kind, yearlyCents: i.yearly_cents, payeCents: i.paye_cents }));
  return { row: row.data, otherIncome, payments: payments.data! };
}

export type TaxYear = Awaited<ReturnType<typeof loadTaxYear>>;

/** The first invoice or expense date in a tax year, which is where the app's own records start. */
export async function firstRecordDate(supabase: Client, year: number): Promise<string | null> {
  const { start, end } = taxYearDates(year);
  const [invoice, expense] = await Promise.all([
    supabase.from("invoices").select("issued_on").gte("issued_on", start).lte("issued_on", end).order("issued_on").limit(1).maybeSingle(),
    supabase.from("expenses").select("spent_on").gte("spent_on", start).lte("spent_on", end).order("spent_on").limit(1).maybeSingle(),
  ]);
  if (invoice.error) throw invoice.error;
  if (expense.error) throw expense.error;
  const dates = [invoice.data?.issued_on, expense.data?.spent_on].filter((d): d is string => Boolean(d));
  return dates.sort()[0] ?? null;
}

/** Invoiced (by invoice date) and spent in the app from a date to the end of its tax year. */
async function appTotals(supabase: Client, from: string, to: string) {
  const [invoices, expenses] = await Promise.all([
    supabase.from("invoices").select("invoice_lines(quantity, unit_price_cents)").gte("issued_on", from).lte("issued_on", to),
    supabase.from("expenses").select("amount_cents").gte("spent_on", from).lte("spent_on", to),
  ]);
  if (invoices.error) throw invoices.error;
  if (expenses.error) throw expenses.error;
  return {
    invoicedCents: invoices.data.reduce(
      (sum, invoice) =>
        sum + invoiceTotal(invoice.invoice_lines.map((line) => ({ quantity: line.quantity, unitPriceCents: line.unit_price_cents }))),
      0,
    ),
    expensesCents: expenses.data.reduce((sum, e) => sum + e.amount_cents, 0),
  };
}

/** The estimate for a tax year the practice has answered for. */
export async function estimateFor(
  supabase: Client,
  year: number,
  taxYear: TaxYear & { row: NonNullable<TaxYear["row"]> },
  dateOfBirth: string | null,
  today: string,
): Promise<TaxEstimate> {
  const { row } = taxYear;
  const totals = await appTotals(supabase, row.records_from, taxYearDates(year).end);
  return estimateTax({
    year,
    today,
    recordsFrom: row.records_from,
    incomeBeforeCents: row.income_before_cents,
    expensesBeforeCents: row.expenses_before_cents,
    ...totals,
    profitOverrideCents: row.profit_override_cents,
    dateOfBirth,
    medicalAidMembers: row.medical_aid_members,
    retirementAnnuityMonthlyCents: row.retirement_annuity_monthly_cents,
    otherIncome: taxYear.otherIncome,
    lastTaxableIncomeCents: row.last_taxable_income_cents,
    paidCents: taxYear.payments.reduce((sum, p) => sum + p.amount_cents, 0),
  });
}

/**
 * Starts a new tax year from last year's answers: medical aid, retirement annuity and other income carry over, and the
 * app's records cover the whole year. Returns false if there's no earlier year to copy.
 */
export async function carryForward(supabase: Client, practiceId: string, year: number): Promise<boolean> {
  const last = await loadTaxYear(supabase, year - 1);
  if (!last.row) return false;
  const { error } = await supabase.from("tax_years").insert({
    practice_id: practiceId,
    tax_year: year,
    records_from: taxYearDates(year).start,
    medical_aid_members: last.row.medical_aid_members,
    retirement_annuity_monthly_cents: last.row.retirement_annuity_monthly_cents,
  });
  // Another tab may have got there first, which is fine.
  if (error && error.code !== "23505") throw error;
  if (!error && last.otherIncome.length > 0) {
    const { error: otherError } = await supabase.from("tax_other_income").insert(
      last.otherIncome.map((i) => ({ practice_id: practiceId, tax_year: year, kind: i.kind, yearly_cents: i.yearlyCents, paye_cents: i.payeCents })),
    );
    if (otherError) throw otherError;
  }
  return true;
}
