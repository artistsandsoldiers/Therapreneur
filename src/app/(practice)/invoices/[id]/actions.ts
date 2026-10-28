"use server";

import { revalidatePath } from "next/cache";
import { toLocalInput } from "@/lib/dates";
import { requireSetUpPractice } from "@/lib/practice";

/**
 * Marks an invoice paid in full on a date, or outstanding again with no date. Reconciliation sets the same date from a
 * medical aid's remittance; marking such an invoice unpaid takes it out of its remittance.
 */
export async function setPaidOn(invoiceId: string, _previous: { error?: string }, form: FormData): Promise<{ error?: string }> {
  const paidOn = form.get("paid_on") === null ? null : String(form.get("paid_on"));
  if (paidOn !== null) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(paidOn) || Number.isNaN(Date.parse(paidOn))) return { error: "Please choose the date it was paid." };
    if (paidOn > toLocalInput(new Date()).slice(0, 10)) return { error: "The paid date can't be in the future." };
  }

  const { supabase } = await requireSetUpPractice();
  const { error } = await supabase.from("invoices").update(paidOn ? { paid_on: paidOn } : { paid_on: null, remittance_id: null }).eq("id", invoiceId);
  if (error) {
    console.error("Marking invoice paid failed", error);
    return { error: "Something went wrong. Please try again." };
  }
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  revalidatePath("/performance");
  revalidatePath("/reconcile", "layout");
  return {};
}
