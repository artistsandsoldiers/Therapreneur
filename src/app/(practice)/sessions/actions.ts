"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { loadCaptureData, type Patient } from "@/lib/capture-data";
import { isSessionLength, priceCapture, sessionBillTo, SESSION_MINUTES, type CaptureLineInput } from "@/lib/capture";
import { fromLocalInput } from "@/lib/dates";
import { parsePatientForm } from "@/lib/patients";
import { requireSetUpPractice } from "@/lib/practice";
import { resolveReferrer } from "@/lib/referrers";
import type { Enums } from "@/lib/supabase/database.types";

export async function addPatient(form: FormData): Promise<{ patient?: Patient; error?: string }> {
  const parsed = parsePatientForm(form);
  if (!parsed.ok) return { error: parsed.error };

  const { supabase, practice } = await requireSetUpPractice();
  const referrer = await resolveReferrer(supabase, practice.id, parsed.referrer);
  if (!referrer.ok) return { error: referrer.error };
  const { data, error } = await supabase
    .from("patients")
    .insert({ ...parsed.patient, ...referrer.columns, practice_id: practice.id })
    .select("*")
    .single();
  if (error) {
    console.error("Adding patient failed", error);
    return { error: "Something went wrong. Please try again." };
  }
  return { patient: data };
}

export type CaptureInput = {
  sessionId: string | null;
  patientId: string;
  startsAt: string; // YYYY-MM-DDTHH:mm, South African time
  durationMinutes: number;
  outcome: Enums<"session_outcome">;
  billTo: Enums<"bill_to">;
  note: string;
  lines: CaptureLineInput[];
};

export async function saveCapture(input: CaptureInput): Promise<{ error: string }> {
  const startsAt = fromLocalInput(input.startsAt);
  if (!startsAt) return { error: "Please enter when the session was." };
  if (!input.patientId) return { error: "Please choose a patient." };
  if (!isSessionLength(input.durationMinutes)) {
    return { error: `Please enter the session length in whole minutes, from ${SESSION_MINUTES.min} to ${SESSION_MINUTES.max}.` };
  }

  const { supabase, practice } = await requireSetUpPractice();
  const data = await loadCaptureData(supabase, practice);
  const patient = data.patients.find((p) => p.id === input.patientId);
  if (!patient) return { error: "Please choose a patient." };
  if (!data.noShowCode) return { error: "There's no no-show code for your profession yet." };

  const priced = priceCapture(input.outcome, input.lines, {
    rates: data.rates,
    patientMedicalAidId: patient.medical_aid_id,
    defaultMedicalAidId: data.defaultMedicalAidId,
    sessionDate: input.startsAt.slice(0, 10),
    adjustmentPercent: practice.price_adjustment_percent,
    noShowCodeId: data.noShowCode.id,
    noShowPriceCents: practice.no_show_price_cents ?? 0,
  });
  if (!priced.ok) return { error: priced.error };

  // Fixing a capture: clear the old lines, and save_capture writes the new ones and keeps the number. A booked
  // session has no invoice yet, so save_capture creates one.
  const { data: invoice } = input.sessionId
    ? await supabase.from("invoices").select("id").eq("session_id", input.sessionId).maybeSingle()
    : { data: null };
  if (invoice) {
    const { error } = await supabase.from("invoice_lines").delete().eq("invoice_id", invoice.id);
    if (error) {
      console.error("Clearing invoice lines failed", error);
      return { error: "Something went wrong. Please try again." };
    }
  }

  const { data: invoiceId, error } = await supabase.rpc("save_capture", {
    p_session_id: input.sessionId,
    p_patient_id: patient.id,
    p_starts_at: startsAt,
    p_outcome: input.outcome,
    p_note: input.note,
    p_lines: priced.lines,
    p_bill_to: sessionBillTo(input.outcome, input.billTo, patient),
    p_duration_minutes: input.durationMinutes,
  });
  if (error) {
    console.error("Saving capture failed", error);
    return { error: "Something went wrong saving the invoice. Please try again." };
  }

  revalidatePath("/invoices");
  revalidatePath("/home");
  redirect(`/invoices/${invoiceId}`);
}

export async function deleteInvoice(invoiceId: string) {
  const { supabase } = await requireSetUpPractice();
  const { data: invoice } = await supabase.from("invoices").select("session_id").eq("id", invoiceId).single();
  if (invoice) {
    // Deleting the session deletes its invoice and lines with it.
    const { error } = await supabase.from("sessions").delete().eq("id", invoice.session_id);
    if (error) throw error;
  }
  revalidatePath("/invoices");
  redirect("/invoices");
}

/** Saves just the note, which can change even after the session's invoice is claimed. */
export async function saveNote(sessionId: string, _previous: { error?: string }, form: FormData): Promise<{ error?: string }> {
  const note = String(form.get("note") ?? "").trim();
  if (note.length > 20000) return { error: "That note is too long." };

  const { supabase } = await requireSetUpPractice();
  const { data, error } = await supabase
    .from("sessions")
    .update({ note: note || null })
    .eq("id", sessionId)
    .select("invoices(id)")
    .single();
  if (error || !data.invoices) {
    console.error("Saving note failed", error);
    return { error: "Something went wrong. Please try again." };
  }
  revalidatePath("/patients");
  redirect(`/invoices/${data.invoices.id}`);
}
