import type { Enums } from "./supabase/database.types";

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
  payer_type: Enums<"payer_type">;
  medical_aid_id: string | null;
  plan: string | null;
  member_number: string | null;
  main_member_name: string | null;
  icd10_codes: string[];
};

/** Validates the add patient form. */
export function parsePatientForm(form: FormData): { ok: true; patient: NewPatient } | { ok: false; error: string } {
  const text = (name: string) => String(form.get(name) ?? "").trim();
  const first_name = text("first_name");
  const last_name = text("last_name");
  if (!first_name || !last_name) return { ok: false, error: "Please enter the patient's first name and surname." };

  const icd10 = parseIcd10Codes(text("icd10_codes"));
  if (!icd10.ok) return icd10;

  if (text("payer_type") === "cash") {
    return {
      ok: true,
      patient: {
        first_name,
        last_name,
        payer_type: "cash",
        medical_aid_id: null,
        plan: null,
        member_number: null,
        main_member_name: null,
        icd10_codes: icd10.codes,
      },
    };
  }

  const medical_aid_id = text("medical_aid_id");
  const member_number = text("member_number");
  const main_member_name = form.get("patient_is_main_member")
    ? `${first_name} ${last_name}`
    : text("main_member_name");
  if (!medical_aid_id) return { ok: false, error: "Please choose the patient's medical aid." };
  if (!member_number) return { ok: false, error: "Please enter the membership number." };
  if (!main_member_name) return { ok: false, error: "Please enter the main member's name." };

  return {
    ok: true,
    patient: {
      first_name,
      last_name,
      payer_type: "medical_aid",
      medical_aid_id,
      plan: text("plan") || null,
      member_number,
      main_member_name,
      icd10_codes: icd10.codes,
    },
  };
}
