import { isSessionLength, SESSION_MINUTES } from "./capture";
import { parseRands } from "./money";
import type { Enums, Profession } from "./supabase/database.types";

export const PROFESSIONS: { value: Profession; label: string }[] = [
  { value: "occupational_therapy", label: "Occupational therapist" },
  { value: "physiotherapy", label: "Physiotherapist" },
  { value: "speech_therapy", label: "Speech therapist" },
];

export type BusinessType = Enums<"business_type">;

export const BUSINESS_TYPES: { value: BusinessType; label: string; hint: string }[] = [
  { value: "sole_proprietor", label: "Sole proprietor", hint: "Just you, taxed as a person. Most solo practices." },
  { value: "inc", label: "Inc", hint: "A personal liability company, with its own tax return." },
];

export type SetupDetails = {
  first_name: string;
  last_name: string;
  name: string;
  practice_number: string | null;
  hpcsa_number: string | null;
  address: string;
  home_address: string | null;
  home_to_patient_business: boolean;
  phone: string | null;
  email: string | null;
  bank_name: string;
  bank_account_holder: string;
  bank_account_number: string;
  bank_branch_code: string;
  profession: Profession;
  business_type: BusinessType;
  price_adjustment_percent: number;
  no_show_price_cents: number;
  session_minutes: number;
};

/** Validates the setup form. Returns the practice details or the first problem, in plain words. */
export function parseSetupForm(form: FormData): { ok: true; details: SetupDetails } | { ok: false; error: string } {
  const text = (name: string) => String(form.get(name) ?? "").trim();
  const optional = (name: string) => text(name) || null;

  const required: [string, string][] = [
    ["first_name", "your first name"],
    ["last_name", "your last name"],
    ["name", "your practice name"],
    ["address", "your practice address"],
    ["bank_name", "your bank"],
    ["bank_account_holder", "the account holder"],
    ["bank_account_number", "your account number"],
    ["bank_branch_code", "your branch code"],
  ];
  for (const [name, description] of required) {
    if (!text(name)) return { ok: false, error: `Please enter ${description}.` };
  }

  const profession = PROFESSIONS.find((p) => p.value === text("profession"))?.value;
  if (!profession) return { ok: false, error: "Please choose your profession." };

  // Older forms had no business type, and nearly every solo practice is a sole proprietor.
  const businessType = BUSINESS_TYPES.find((b) => b.value === (text("business_type") || "sole_proprietor"))?.value;
  if (!businessType) return { ok: false, error: "Please choose whether you're a sole proprietor or an Inc." };

  const adjustment = Number(text("price_adjustment"));
  if (!text("price_adjustment") || !Number.isInteger(adjustment) || adjustment < -50 || adjustment > 100) {
    return { ok: false, error: "Please choose your prices as a whole percent, from 50% below to 100% above medical aid rates." };
  }

  const noShow = parseRands(text("no_show_price"));
  if (noShow === null) return { ok: false, error: "Please enter your no-show price in rands, like 350.00." };

  const sessionMinutes = Number(text("session_minutes"));
  if (!text("session_minutes") || !isSessionLength(sessionMinutes)) {
    return {
      ok: false,
      error: `Please enter your usual session length in minutes, from ${SESSION_MINUTES.min} to ${SESSION_MINUTES.max}.`,
    };
  }

  return {
    ok: true,
    details: {
      first_name: text("first_name"),
      last_name: text("last_name"),
      name: text("name"),
      practice_number: optional("practice_number"),
      hpcsa_number: optional("hpcsa_number"),
      address: text("address"),
      home_address: optional("home_address"),
      home_to_patient_business: form.get("home_to_patient_business") === "yes",
      phone: optional("phone"),
      email: optional("email"),
      bank_name: text("bank_name"),
      bank_account_holder: text("bank_account_holder"),
      bank_account_number: text("bank_account_number"),
      bank_branch_code: text("bank_branch_code"),
      profession,
      business_type: businessType,
      price_adjustment_percent: adjustment,
      no_show_price_cents: noShow,
      session_minutes: sessionMinutes,
    },
  };
}
