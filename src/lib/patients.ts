import { parseReferrerChoice, type ReferrerChoice } from "./referrers";
import type { Enums } from "./supabase/database.types";
import { parseUsualPlace } from "./travel";

// An ICD-10 code is a letter, two digits, and optionally a point and up to four more characters, e.g. M54.5.
const ICD10 = /^[A-Z]\d{2}(\.[0-9A-Z]{1,4})?$/;

/** Reads ICD-10 codes typed with commas or spaces between them. */
export function parseIcd10Codes(input: string): { ok: true; codes: string[] } | { ok: false; error: string } {
  const codes = input
    .toUpperCase()
    .split(/[\s,;]+/)
    .filter(Boolean);
  const invalid = codes.find((code) => !ICD10.test(code));
  if (invalid) return { ok: false, error: `"${invalid}" doesn't look like an ICD-10 code, like M54.5.` };
  return { ok: true, codes: [...new Set(codes)] };
}

export type NewPatient = {
  first_name: string;
  last_name: string;
  /** Who the patient's invoices go to unless a session says otherwise. Medical aid only when they have one. */
  bill_to: Enums<"bill_to">;
  medical_aid_id: string | null;
  plan: string | null;
  member_number: string | null;
  main_member_name: string | null;
  date_of_birth: string | null;
  dependant_code: string | null;
  icd10_codes: string[];
  /** Where they're usually seen. Left out when the form doesn't ask, so nothing changes. */
  seen_at_home?: boolean;
  usual_place_id?: string | null;
  home_address?: string;
};

/** Validates the add patient form. The referrer is saved separately, since a new one may need adding first. */
export function parsePatientForm(
  form: FormData,
): { ok: true; patient: NewPatient; referrer: ReferrerChoice } | { ok: false; error: string } {
  const text = (name: string) => String(form.get(name) ?? "").trim();
  const first_name = text("first_name");
  const last_name = text("last_name");
  if (!first_name || !last_name) return { ok: false, error: "Please enter the patient's first name and surname." };

  const icd10 = parseIcd10Codes(text("icd10_codes"));
  if (!icd10.ok) return icd10;

  const date_of_birth = text("date_of_birth") || null;
  if (date_of_birth && !isPastDate(date_of_birth)) return { ok: false, error: "Please check the date of birth." };

  const referrer = parseReferrerChoice(form);
  if (!referrer.ok) return referrer;

  const place = parseUsualPlace(form);
  if (!place.ok) return place;

  if (text("has_medical_aid") === "no") {
    return {
      ok: true,
      patient: {
        first_name,
        last_name,
        bill_to: "patient",
        medical_aid_id: null,
        plan: null,
        member_number: null,
        main_member_name: null,
        date_of_birth,
        dependant_code: null,
        icd10_codes: icd10.codes,
        ...place.columns,
      },
      referrer: referrer.choice,
    };
  }

  const medical_aid_id = text("medical_aid_id");
  const member_number = text("member_number");
  const isMainMember = Boolean(form.get("patient_is_main_member"));
  const main_member_name = isMainMember ? `${first_name} ${last_name}` : text("main_member_name");
  // The main member is always dependant 00 on their own membership.
  const typedCode = text("dependant_code");
  const dependant_code = isMainMember ? "00" : typedCode && typedCode.padStart(2, "0");
  if (!medical_aid_id) return { ok: false, error: "Please choose the patient's medical aid." };
  if (!member_number) return { ok: false, error: "Please enter the membership number." };
  if (!main_member_name) return { ok: false, error: "Please enter the main member's name." };
  if (!/^\d{2}$/.test(dependant_code)) {
    return { ok: false, error: "Please enter the dependant code from the medical aid card, like 01." };
  }
  if (!date_of_birth) return { ok: false, error: "Please enter the patient's date of birth. Medical aids need it." };

  return {
    ok: true,
    patient: {
      first_name,
      last_name,
      bill_to: text("bill_to") === "patient" ? "patient" : "medical_aid",
      medical_aid_id,
      plan: text("plan") || null,
      member_number,
      main_member_name,
      date_of_birth,
      dependant_code,
      icd10_codes: icd10.codes,
      ...place.columns,
    },
    referrer: referrer.choice,
  };
}

/** True for a real YYYY-MM-DD date that isn't in the future. */
function isPastDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value) && date.getTime() <= Date.now() && value >= "1900-01-01";
}

/** What a medical aid patient still needs before their invoices can be claimed, in plain words. Empty when ready. */
export function missingClaimDetails(patient: { date_of_birth: string | null; dependant_code: string | null }): string[] {
  const missing: string[] = [];
  if (!patient.date_of_birth) missing.push("date of birth");
  if (!patient.dependant_code) missing.push("dependant code");
  return missing;
}

/** How a patient's medical aid and who pays read in a list, like "Discovery Health Medical Scheme · Patient pays". */
export function payerLabel(medicalAidName: string | null, billTo: Enums<"bill_to">): string {
  if (!medicalAidName) return "No medical aid";
  return billTo === "patient" ? `${medicalAidName} · Patient pays` : medicalAidName;
}
