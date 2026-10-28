"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { toLocalInput } from "@/lib/dates";
import { requireSetUpPractice } from "@/lib/practice";
import { parseRemittanceForm } from "@/lib/reconciliation";

/** Records a medical aid's remittance and marks the ticked claims paid in full on its date. */
export async function recordRemittance(medicalAidId: string, _previous: { error?: string }, form: FormData): Promise<{ error?: string }> {
  const parsed = parseRemittanceForm(form, toLocalInput(new Date()).slice(0, 10));
  if (!parsed.ok) return { error: parsed.error };

  const { supabase } = await requireSetUpPractice();
  const { paidOn, reference, invoiceIds } = parsed.details;
  const { data: remittanceId, error } = await supabase.rpc("record_remittance", {
    p_medical_aid_id: medicalAidId,
    p_paid_on: paidOn,
    p_reference: reference,
    p_invoice_ids: invoiceIds,
  });
  if (error) {
    console.error("Recording remittance failed", error);
    return { error: "Some of these claims have changed or were already paid. Please reload and try again." };
  }
  revalidateMoney();
  redirect(`/reconcile/remittances/${remittanceId}`);
}

/** Undoes a remittance: its claims go back to outstanding and the remittance is deleted. */
export async function undoRemittance(remittanceId: string): Promise<{ error?: string }> {
  const { supabase } = await requireSetUpPractice();
  const { error } = await supabase.from("invoices").update({ paid_on: null, remittance_id: null }).eq("remittance_id", remittanceId);
  if (error) {
    console.error("Undoing remittance failed", error);
    return { error: "Something went wrong. Please try again." };
  }
  // Its claims are already outstanding again, so a failure here only leaves an empty remittance behind.
  const { error: deleteError } = await supabase.from("remittances").delete().eq("id", remittanceId);
  if (deleteError) console.error("Deleting remittance failed", remittanceId, deleteError);
  revalidateMoney();
  redirect("/reconcile");
}

function revalidateMoney() {
  revalidatePath("/reconcile", "layout");
  revalidatePath("/invoices", "layout");
  revalidatePath("/performance");
}
