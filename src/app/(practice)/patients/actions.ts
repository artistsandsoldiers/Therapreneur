"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { toLocalInput } from "@/lib/dates";
import { parsePatientForm } from "@/lib/patients";
import { requireSetUpPractice } from "@/lib/practice";
import { resolveReferrer } from "@/lib/referrers";

export type PatientFormState = { error?: string };

/** Adds a patient, or saves changes when there's an id, then shows their page. */
export async function savePatient(
  patientId: string | null,
  _previous: PatientFormState,
  form: FormData,
): Promise<PatientFormState> {
  const parsed = parsePatientForm(form);
  if (!parsed.ok) return { error: parsed.error };

  const { supabase, practice } = await requireSetUpPractice();
  const referrer = await resolveReferrer(supabase, practice.id, parsed.referrer);
  if (!referrer.ok) return { error: referrer.error };
  const row = { ...parsed.patient, ...referrer.columns };
  const { data, error } = patientId
    ? await supabase.from("patients").update(row).eq("id", patientId).select("id").single()
    : await supabase.from("patients").insert({ ...row, practice_id: practice.id }).select("id").single();
  if (error) {
    console.error("Saving patient failed", error);
    return { error: "Something went wrong. Please try again." };
  }
  revalidatePath("/patients");
  redirect(`/patients/${data.id}`);
}

/** Moves a patient to past patients, or makes them current again. */
export async function setPastPatient(patientId: string, past: boolean) {
  const { supabase } = await requireSetUpPractice();
  const { error } = await supabase
    .from("patients")
    .update({ past_since: past ? toLocalInput(new Date()).slice(0, 10) : null })
    .eq("id", patientId);
  if (error) throw error;
  revalidatePath("/patients");
}

/** Deletes a patient with no sessions. The database refuses if they have any, so history is never lost. */
export async function deletePatient(patientId: string): Promise<{ error: string }> {
  const { supabase } = await requireSetUpPractice();
  const { count } = await supabase
    .from("sessions")
    .select("id", { count: "exact", head: true })
    .eq("patient_id", patientId);
  if (count) return { error: "This patient has sessions, so move them to past patients instead." };

  const { error } = await supabase.from("patients").delete().eq("id", patientId);
  if (error) {
    console.error("Deleting patient failed", error);
    return { error: "Something went wrong. Please try again." };
  }
  revalidatePath("/patients");
  redirect("/patients");
}
