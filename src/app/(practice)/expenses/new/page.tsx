import type { Metadata } from "next";
import { narrow } from "@/app/ui";
import Link from "next/link";
import { ExpenseForm } from "../expense-form";
import { toLocalInput } from "@/lib/dates";
import { sortCategories } from "@/lib/expenses";
import { requireSetUpPractice } from "@/lib/practice";

export const metadata: Metadata = { title: "Add expense · Therapreneur" };

export default async function NewExpensePage() {
  const { supabase, practice } = await requireSetUpPractice();
  const { data: categories, error } = await supabase.from("expense_categories").select("id, name, hint, position, practice_id");
  if (error) throw error;

  return (
    <main className={`py-6 ${narrow}`}>
      <Link href="/expenses" className="text-sm text-neutral-500">← Expenses</Link>
      <h1 className="mt-3 mb-6 text-2xl font-semibold tracking-tight">Add expense</h1>
      <ExpenseForm practiceId={practice.id} categories={sortCategories(categories)} today={toLocalInput(new Date()).slice(0, 10)} />
    </main>
  );
}
