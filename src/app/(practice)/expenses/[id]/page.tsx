import type { Metadata } from "next";
import { narrow } from "@/app/ui";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteExpense } from "./delete-expense";
import { ExpenseForm } from "../expense-form";
import { toLocalInput } from "@/lib/dates";
import { RECEIPT_BUCKET, sortCategories } from "@/lib/expenses";
import { requireSetUpPractice } from "@/lib/practice";

export const metadata: Metadata = { title: "Expense · Therapreneur" };

export default async function ExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, practice } = await requireSetUpPractice();
  const [{ data: expense }, { data: categories, error }] = await Promise.all([
    supabase.from("expenses").select("*").eq("id", id).maybeSingle(),
    supabase.from("expense_categories").select("id, name, hint, position, practice_id"),
  ]);
  if (error) throw error;
  if (!expense) notFound();

  const receiptUrl = expense.receipt_path
    ? ((await supabase.storage.from(RECEIPT_BUCKET).createSignedUrl(expense.receipt_path, 60 * 60)).data?.signedUrl ?? null)
    : null;

  return (
    <main className={`py-6 ${narrow}`}>
      <Link href="/expenses" className="text-sm text-neutral-500">← Expenses</Link>
      <h1 className="mt-3 mb-6 text-2xl font-semibold tracking-tight">{expense.supplier}</h1>
      <ExpenseForm
        practiceId={practice.id}
        categories={sortCategories(categories)}
        today={toLocalInput(new Date()).slice(0, 10)}
        expense={{
          id: expense.id,
          spentOn: expense.spent_on,
          supplier: expense.supplier,
          amount: (expense.amount_cents / 100).toFixed(2),
          categoryId: expense.category_id,
          note: expense.note ?? "",
          receiptUrl,
        }}
      />
      <DeleteExpense expenseId={expense.id} />
    </main>
  );
}
