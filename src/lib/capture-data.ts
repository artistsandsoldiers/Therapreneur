import type { SupabaseClient } from "@supabase/supabase-js";
import type { Practice } from "./practice";
import { DEFAULT_MEDICAL_AID, type Rate } from "./pricing";
import type { Database, Tables } from "./supabase/database.types";

export type BillingCode = Pick<Tables<"billing_codes">, "id" | "code" | "description" | "is_no_show">;
export type Patient = Tables<"patients">;
export type MedicalAid = Tables<"medical_aids">;

/** Everything the capture screen and its server action need, read in parallel. */
export async function loadCaptureData(supabase: SupabaseClient<Database>, practice: Practice) {
  const profession = practice.profession ?? "occupational_therapy";
  const [patients, medicalAids, codes, rates] = await Promise.all([
    supabase.from("patients").select("*").order("first_name").order("last_name"),
    supabase.from("medical_aids").select("*").order("name"),
    supabase.from("billing_codes").select("id, code, description, is_no_show").eq("profession", profession).order("code"),
    supabase
      .from("medical_aid_rates")
      .select("billing_code_id, medical_aid_id, rate_cents, effective_from, billing_codes!inner(profession)")
      .eq("billing_codes.profession", profession),
  ]);
  const error = patients.error ?? medicalAids.error ?? codes.error ?? rates.error;
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
  };
}

export type CaptureData = Awaited<ReturnType<typeof loadCaptureData>>;
