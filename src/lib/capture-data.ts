import type { SupabaseClient } from "@supabase/supabase-js";
import { codeHistories } from "./capture";
import type { Practice } from "./practice";
import { DEFAULT_MEDICAL_AID, type Rate } from "./pricing";
import type { Database, Tables } from "./supabase/database.types";

export type BillingCode = Pick<Tables<"billing_codes">, "id" | "code" | "description" | "is_no_show">;
export type Patient = Tables<"patients">;
export type MedicalAid = Tables<"medical_aids">;

/** The medical aids, and the one a new patient starts on. */
export async function loadMedicalAids(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase.from("medical_aids").select("*").order("name");
  if (error) throw error;
  return {
    medicalAids: data,
    defaultMedicalAidId: data.find((aid) => aid.name === DEFAULT_MEDICAL_AID)?.id ?? "",
  };
}

/** Everything the capture screen and its server action need, read in parallel. */
export async function loadCaptureData(
  supabase: SupabaseClient<Database>,
  practice: Practice,
  fixingSessionId: string | null = null,
) {
  const profession = practice.profession ?? "occupational_therapy";
  const [patients, medicalAids, codes, rates, pastInvoices] = await Promise.all([
    supabase.from("patients").select("*").order("first_name").order("last_name"),
    supabase.from("medical_aids").select("*").order("name"),
    supabase.from("billing_codes").select("id, code, description, is_no_show").eq("profession", profession).order("code"),
    supabase
      .from("medical_aid_rates")
      .select("billing_code_id, medical_aid_id, rate_cents, effective_from, billing_codes!inner(profession)")
      .eq("billing_codes.profession", profession),
    supabase
      .from("invoices")
      .select("invoice_lines(billing_code_id, quantity, position), sessions!inner(id, patient_id, starts_at, outcome)")
      .eq("sessions.outcome", "attended"),
  ]);
  const error = patients.error ?? medicalAids.error ?? codes.error ?? rates.error ?? pastInvoices.error;
  if (error) throw error;

  const allCodes = codes.data ?? [];
  const defaultMedicalAidId = (medicalAids.data ?? []).find((aid) => aid.name === DEFAULT_MEDICAL_AID)?.id ?? "";
  return {
    patients: patients.data ?? [],
    medicalAids: medicalAids.data ?? [],
    codes: allCodes.filter((code) => !code.is_no_show),
    noShowCode: allCodes.find((code) => code.is_no_show) ?? null,
    rates: (rates.data ?? []).map<Rate>((rate) => ({
      billingCodeId: rate.billing_code_id,
      medicalAidId: rate.medical_aid_id,
      rateCents: rate.rate_cents,
      effectiveFrom: rate.effective_from,
    })),
    defaultMedicalAidId,
    codeHistories: codeHistories(
      (pastInvoices.data ?? []).map((invoice) => ({
        sessionId: invoice.sessions.id,
        patientId: invoice.sessions.patient_id,
        startsAt: invoice.sessions.starts_at,
        lines: invoice.invoice_lines.map((line) => ({
          billingCodeId: line.billing_code_id,
          quantity: line.quantity,
          position: line.position,
        })),
      })),
      fixingSessionId,
    ),
  };
}

export type CaptureData = Awaited<ReturnType<typeof loadCaptureData>>;

/** A billing code with a fixed default medical aid rate, to show what a price adjustment does to a real price. */
export type PriceExample = { code: string; description: string; rateCents: number };

export async function loadPriceExample(supabase: SupabaseClient<Database>, practice: Practice): Promise<PriceExample | null> {
  const { data, error } = await supabase
    .from("medical_aid_rates")
    .select("rate_cents, billing_codes!inner(code, description, profession), medical_aids!inner(name)")
    .eq("billing_codes.profession", practice.profession ?? "occupational_therapy")
    .eq("medical_aids.name", DEFAULT_MEDICAL_AID)
    .gt("rate_cents", 0);
  if (error) throw error;
  // The lowest code number, so the example stays the same from visit to visit.
  const [first] = [...data].sort((a, b) => a.billing_codes.code.localeCompare(b.billing_codes.code));
  return first ? { code: first.billing_codes.code, description: first.billing_codes.description, rateCents: first.rate_cents! } : null;
}
