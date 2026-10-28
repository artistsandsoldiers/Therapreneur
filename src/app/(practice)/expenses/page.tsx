import type { Metadata } from "next";
import Link from "next/link";
import { button } from "@/app/ui";
import { friendlyDate, toLocalInput } from "@/lib/dates";
import { nextTaxYearStart, taxYearStart } from "@/lib/expenses";
import { formatRands } from "@/lib/money";
import { requireSetUpPractice } from "@/lib/practice";
import { ExpenseList } from "./expense-list";

export const metadata: Metadata = { title: "Expenses · Therapreneur" };

export default async function ExpensesPage() {
  const { supabase } = await requireSetUpPractice();
  const { data, error } = await supabase
    .from("expenses")
    .select("id, spent_on, supplier, amount_cents, receipt_path, expense_categories(name)")
    .order("spent_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;

  const today = toLocalInput(new Date()).slice(0, 10);
  const from = taxYearStart(today);
  const expenses = data.map((e) => ({
    id: e.id,
    spentOn: e.spent_on,
    amountCents: e.amount_cents,
    supplier: e.supplier,
    category: e.expense_categories?.name ?? "",
    hasReceipt: Boolean(e.receipt_path),
  }));
  const yearTotal = expenses.filter((e) => e.spentOn >= from && e.spentOn < nextTaxYearStart(today)).reduce((sum, e) => sum + e.amountCents, 0);
  const missingReceipts = expenses.filter((e) => !e.hasReceipt).length;

  return (
    <main className="py-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Expenses</h1>
        <Link href="/expenses/new" className={button}>Add expense</Link>
      </div>

      {expenses.length === 0 ? (
        <p className="mt-8 text-neutral-500">
          No expenses yet. Add what you spend on your practice, like rent, OTASA fees or fuel, with a photo of the receipt.
          Come tax time, it&apos;s all in one place.
        </p>
      ) : (
        <>
          <div className="mt-6 rounded-lg border border-neutral-200 p-4 md:max-w-sm">
            <p className="text-sm text-neutral-500">This tax year so far, from {friendlyDate(from)}</p>
            <p className="mt-1 text-xl font-semibold tracking-tight tabular-nums">{formatRands(yearTotal)}</p>
            {missingReceipts > 0 && (
              <p className="mt-1 text-sm text-amber-700">
                {missingReceipts === 1 ? "1 expense is" : `${missingReceipts} expenses are`} missing a receipt.
              </p>
            )}
          </div>

          <ExpenseList expenses={expenses} />
        </>
      )}
    </main>
  );
}
