"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseExpenseForm, RECEIPT_BUCKET } from "@/lib/expenses";
import { requireSetUpPractice } from "@/lib/practice";

export type ExpenseFormState = { error?: string };

/**
 * Adds an expense, or saves changes when there's an id, then shows the list. The browser has already uploaded any new
 * receipt to storage and sends its path; "remove_receipt" drops the current one.
 */
export async function saveExpense(expenseId: string | null, _previous: ExpenseFormState, form: FormData): Promise<ExpenseFormState> {
  const parsed = parseExpenseForm(form);
  if (!parsed.ok) return { error: parsed.error };
  const { newCategoryName, ...expense } = parsed.expense;

  const { supabase, practice } = await requireSetUpPractice();

  // A new category is the practice's own. If one with that name already exists, use it instead.
  let categoryId = expense.category_id;
  if (newCategoryName) {
    const { data: categories, error } = await supabase.from("expense_categories").select("id, name");
    if (error) throw error;
    categoryId = categories.find((c) => c.name.toLowerCase() === newCategoryName.toLowerCase())?.id ?? null;
    if (!categoryId) {
      const { data, error: insertError } = await supabase
        .from("expense_categories")
        .insert({ practice_id: practice.id, name: newCategoryName })
        .select("id")
        .single();
      if (insertError) {
        console.error("Adding expense category failed", insertError);
        return { error: "Your new category didn't save. Please try again." };
      }
      categoryId = data.id;
    }
  }

  const uploaded = String(form.get("receipt_path") ?? "");
  if (uploaded && !uploaded.startsWith(`${practice.id}/`)) return { error: "Your receipt didn't upload. Please try again." };

  const previous = expenseId
    ? (await supabase.from("expenses").select("receipt_path").eq("id", expenseId).single()).data?.receipt_path ?? null
    : null;
  const receiptPath = uploaded || (form.get("remove_receipt") === "yes" ? null : previous);

  const row = { ...expense, category_id: categoryId!, receipt_path: receiptPath };
  const { error } = expenseId
    ? await supabase.from("expenses").update(row).eq("id", expenseId)
    : await supabase.from("expenses").insert({ ...row, practice_id: practice.id });
  if (error) {
    console.error("Saving expense failed", error);
    return { error: "Something went wrong. Please try again." };
  }
  // The old receipt is no longer used. If removing it fails, it just sits there unseen.
  if (previous && previous !== receiptPath) await supabase.storage.from(RECEIPT_BUCKET).remove([previous]);

  revalidatePath("/expenses");
  revalidatePath("/performance");
  redirect("/expenses");
}

/** Deletes an expense and its receipt. */
export async function deleteExpense(expenseId: string): Promise<{ error: string }> {
  const { supabase } = await requireSetUpPractice();
  const { data: expense } = await supabase.from("expenses").select("receipt_path").eq("id", expenseId).single();
  const { error } = await supabase.from("expenses").delete().eq("id", expenseId);
  if (error) {
    console.error("Deleting expense failed", error);
    return { error: "Something went wrong. Please try again." };
  }
  if (expense?.receipt_path) await supabase.storage.from(RECEIPT_BUCKET).remove([expense.receipt_path]);

  revalidatePath("/expenses");
  revalidatePath("/performance");
  redirect("/expenses");
}

export type CategoryState = { error?: string; saved?: boolean };

/** Renames one of the practice's own categories. The central ones can't be renamed (the database refuses). */
export async function renameCategory(categoryId: string, _previous: CategoryState, form: FormData): Promise<CategoryState> {
  const name = String(form.get("name") ?? "").trim();
  if (!name) return { error: "Please enter a name." };
  if (name.length > 60) return { error: "Please keep it under 60 characters." };

  const { supabase } = await requireSetUpPractice();
  const { data, error } = await supabase.from("expense_categories").update({ name }).eq("id", categoryId).select("id");
  if (error?.code === "23505") return { error: "You already have a category with that name." };
  if (error || data.length === 0) {
    console.error("Renaming expense category failed", error);
    return { error: "Something went wrong. Please try again." };
  }
  revalidatePath("/settings");
  return { saved: true };
}
