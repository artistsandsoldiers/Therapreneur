"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { claimEmail, claimSending, groupByMedicalAid, missingPracticeDetails } from "@/lib/claims";
import { sendEmail } from "@/lib/email";
import { loadInvoiceDocuments } from "@/lib/invoice-document";
import { invoicePdfName, renderInvoicePdf } from "@/lib/invoice-pdf";
import { missingClaimDetails } from "@/lib/patients";
import { requireSetUpPractice } from "@/lib/practice";

/**
 * Sends the chosen invoices as one claim batch per medical aid. Each batch is started in the database first, which
 * checks and reserves its invoices, then emailed, then marked sent. If an email fails, its batch is removed again.
 */
export async function sendClaims(invoiceIds: string[]): Promise<{ error?: string }> {
  const config = claimSending(process.env);
  if (!config.ok) return { error: config.error };

  const { supabase, practice } = await requireSetUpPractice();
  if (missingPracticeDetails(practice).length) return { error: "Please add your practice and HPCSA numbers in Settings first." };

  const invoices = await loadInvoiceDocuments(supabase, practice, invoiceIds);
  const ready = invoices.filter(
    (invoice) => invoice.toMedicalAid && !invoice.claim && invoice.medicalAidId && !missingClaimDetails(invoice.patient).length,
  );
  if (ready.length === 0 || ready.length !== invoiceIds.length) {
    return { error: "Some of these invoices have changed or were already claimed. Please go back to Claims and try again." };
  }

  const { data: medicalAids, error: aidsError } = await supabase.from("medical_aids").select("id, name");
  if (aidsError) throw aidsError;

  const { sending } = config;
  let sent = 0;
  for (const [medicalAidId, batch] of groupByMedicalAid(ready)) {
    const medicalAidName = medicalAids.find((aid) => aid.id === medicalAidId)?.name ?? "the medical aid";
    const { data: batchId, error } = await supabase.rpc("start_claim_batch", {
      p_medical_aid_id: medicalAidId,
      p_invoice_ids: batch.map((invoice) => invoice.id),
    });
    if (error) {
      console.error("Starting claim batch failed", error);
      return { error: failed(sent, "Some of these invoices have changed or were already claimed.") };
    }

    try {
      const email = claimEmail(practice, medicalAidName, batch, sending.to);
      const attachments = await Promise.all(
        batch.map(async (invoice) => ({ filename: invoicePdfName(invoice), content: await renderInvoicePdf(invoice) })),
      );
      await sendEmail({ ...sending, ...email, replyTo: practice.email ?? practice.invite_email, attachments });
    } catch (sendError) {
      console.error("Sending claim batch failed", sendError);
      await supabase.from("claim_batches").delete().eq("id", batchId);
      return { error: failed(sent, `The email to ${medicalAidName} didn't send.`) };
    }

    const { error: markError } = await supabase
      .from("claim_batches")
      .update({ sent_at: new Date().toISOString(), sent_to: sending.to })
      .eq("id", batchId);
    // The email has gone, so don't undo the batch. It shows as not sent until fixed by hand.
    if (markError) console.error("Marking claim batch sent failed", batchId, markError);
    sent += 1;
  }

  revalidatePath("/claims");
  revalidatePath("/invoices");
  redirect(`/claims?sent=${sent}`);
}

function failed(sent: number, reason: string): string {
  const before = sent ? ` ${sent === 1 ? "1 batch was" : `${sent} batches were`} sent before this one.` : "";
  return `${reason}${before} Please try again.`;
}

/** Records the medical aid's reference number against a claim batch, which marks it received. */
export async function saveReferenceNumber(batchId: string, _previous: { error?: string }, form: FormData): Promise<{ error?: string }> {
  const reference = String(form.get("reference_number") ?? "").trim();
  if (reference.length > 100) return { error: "That reference number is too long." };

  const { supabase } = await requireSetUpPractice();
  const { error } = await supabase
    .from("claim_batches")
    .update({ reference_number: reference || null })
    .eq("id", batchId);
  if (error) {
    console.error("Saving reference number failed", error);
    return { error: "Something went wrong. Please try again." };
  }
  revalidatePath("/claims");
  redirect(`/claims/${batchId}`);
}
