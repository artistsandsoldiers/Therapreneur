"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { firstRecordDate } from "./data";
import { toLocalInput } from "@/lib/dates";
import { parseRands } from "@/lib/money";
import { requireSetUpPractice } from "@/lib/practice";
import { parseTaxForm, taxYearOf } from "@/lib/tax";

export type TaxFormState = { error?: string };

const today = () => toLocalInput(new Date()).slice(0, 10);

/** Saves this tax year's answers and turns the tax estimate on. */
export async function saveTaxAnswers(_previous: TaxFormState, form: FormData): Promise<TaxFormState> {
  const parsed = parseTaxForm(form);
  if (!parsed.ok) return { error: parsed.error };
  const { answers } = parsed;

  const { supabase, practice } = await requireSetUpPractice();
  if (practice.business_type === "inc") return { error: "The tax estimate is for sole proprietors only, for now." };
  const year = taxYearOf(today());

  const { data: existing, error: existingError } = await supabase.from("tax_years").select("records_from").eq("tax_year", year).maybeSingle();
  if (existingError) throw existingError;
  const recordsFrom = existing?.records_from ?? (await firstRecordDate(supabase, year)) ?? today();

  const failed = (what: string, error: unknown) => {
    console.error(`Saving tax answers failed: ${what}`, error);
    return { error: "Something went wrong. Please try again." };
  };

  const { error: practiceError } = await supabase
    .from("practices")
    .update({ date_of_birth: answers.date_of_birth, tax_estimate_on: true })
    .eq("id", practice.id);
  if (practiceError) return failed("practice", practiceError);

  const { error: yearError } = await supabase.from("tax_years").upsert(
    {
      practice_id: practice.id,
      tax_year: year,
      records_from: recordsFrom,
      income_before_cents: answers.income_before_cents,
      expenses_before_cents: answers.expenses_before_cents,
      medical_aid_members: answers.medical_aid_members,
      retirement_annuity_monthly_cents: answers.retirement_annuity_monthly_cents,
      profit_override_cents: answers.profit_override_cents,
      last_taxable_income_cents: answers.last_taxable_income_cents,
    },
    { onConflict: "practice_id,tax_year" },
  );
  if (yearError) return failed("tax year", yearError);

  // Other income is a handful of rows, so replace them all.
  const { error: clearError } = await supabase.from("tax_other_income").delete().eq("tax_year", year);
  if (clearError) return failed("clearing other income", clearError);
  if (answers.otherIncome.length > 0) {
    const { error } = await supabase.from("tax_other_income").insert(
      answers.otherIncome.map((i) => ({ practice_id: practice.id, tax_year: year, kind: i.kind, yearly_cents: i.yearlyCents, paye_cents: i.payeCents })),
    );
    if (error) return failed("other income", error);
  }

  if (answers.payment) {
    const { error } = await supabase.from("tax_payments").insert({ practice_id: practice.id, tax_year: year, ...answers.payment });
    if (error) return failed("payment", error);
  }

  revalidatePath("/tax");
  redirect("/tax");
}

/** Records a provisional tax payment, for this tax year or as a top-up for last year. */
export async function addTaxPayment(_previous: TaxFormState, form: FormData): Promise<TaxFormState> {
  const paidOn = String(form.get("paid_on") ?? "");
  const amount = parseRands(String(form.get("amount") ?? ""));
  const year = Number(form.get("tax_year"));
  const thisYear = taxYearOf(today());

  if (!/^\d{4}-\d{2}-\d{2}$/.test(paidOn) || Number.isNaN(Date.parse(paidOn))) return { error: "Please enter the date you paid." };
  if (!amount) return { error: "Please enter the amount you paid, like 25 000." };
  if (year !== thisYear && year !== thisYear - 1) return { error: "Please choose the tax year this payment is for." };

  const { supabase, practice } = await requireSetUpPractice();
  const { error } = await supabase.from("tax_payments").insert({ practice_id: practice.id, tax_year: year, paid_on: paidOn, amount_cents: amount });
  if (error) {
    console.error("Saving tax payment failed", error);
    return { error: "Something went wrong. Please try again." };
  }
  revalidatePath("/tax");
  return {};
}

export async function deleteTaxPayment(id: string): Promise<{ error?: string }> {
  const { supabase } = await requireSetUpPractice();
  const { error } = await supabase.from("tax_payments").delete().eq("id", id);
  if (error) {
    console.error("Deleting tax payment failed", error);
    return { error: "Something went wrong. Please try again." };
  }
  revalidatePath("/tax");
  return {};
}

/** Hides the estimate. Answers and payments are kept, so turning it back on starts where she left off. */
export async function turnOffTaxEstimate() {
  const { supabase, practice } = await requireSetUpPractice();
  const { error } = await supabase.from("practices").update({ tax_estimate_on: false }).eq("id", practice.id);
  if (error) throw error;
  revalidatePath("/tax");
  redirect("/tax");
}
