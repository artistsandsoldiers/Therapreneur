import type { Metadata } from "next";
import Link from "next/link";
import { button } from "@/app/ui";
import { formatDate, toLocalInput } from "@/lib/dates";
import { expensesByMonth, taxYearStart } from "@/lib/expenses";
import { formatRands } from "@/lib/money";
import { requireSetUpPractice } from "@/lib/practice";

export const metadata: Metadata = { title: "Expenses · Therapreneur" };

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

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
  const yearTotal = expenses.filter((e) => e.spentOn >= from && e.spentOn <= today).reduce((sum, e) => sum + e.amountCents, 0);
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
          <div className="mt-6 rounded-lg border border-neutral-200 p-4">
            <p className="text-sm text-neutral-500">This tax year so far, from {formatDate(from)}</p>
            <p className="mt-1 text-xl font-semibold tracking-tight tabular-nums">{formatRands(yearTotal)}</p>
            {missingReceipts > 0 && (
              <p className="mt-1 text-sm text-amber-700">
                {missingReceipts === 1 ? "1 expense is" : `${missingReceipts} expenses are`} missing a receipt.
              </p>
            )}
          </div>

          {expensesByMonth(expenses).map((month) => (
            <section key={month.month} className="mt-8">
              <div className="mb-1 flex items-baseline justify-between gap-4 text-sm font-medium text-neutral-500">
                <h2>{MONTH_NAMES[Number(month.month.slice(5, 7)) - 1]} {month.month.slice(0, 4)}</h2>
                <span className="tabular-nums">{formatRands(month.totalCents)}</span>
              </div>
              <ul className="divide-y divide-neutral-100 border-y border-neutral-100">
                {month.expenses.map((expense) => (
                  <li key={expense.id}>
                    <Link href={`/expenses/${expense.id}`} className="flex items-center justify-between gap-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{expense.supplier}</p>
                        <p className="text-sm text-neutral-500">
                          {expense.category} · {formatDate(expense.spentOn)}
                          {!expense.hasReceipt && <span className="text-amber-700"> · No receipt</span>}
                        </p>
                      </div>
                      <span className="shrink-0 font-medium tabular-nums">{formatRands(expense.amountCents)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </main>
  );
}
