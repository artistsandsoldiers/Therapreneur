import { isSessionLength, SESSION_MINUTES } from "./capture";
import { parseRands } from "./money";
import type { Profession } from "./supabase/database.types";

export const PROFESSIONS: { value: Profession; label: string }[] = [
  { value: "occupational_therapy", label: "Occupational therapist" },
  { value: "physiotherapy", label: "Physiotherapist" },
  { value: "speech_therapy", label: "Speech therapist" },
];

export type SetupDetails = {
  name: string;
  practice_number: string | null;
  hpcsa_number: string | null;
  address: string;
  phone: string | null;
  email: string | null;
  bank_name: string;
  bank_account_holder: string;
  bank_account_number: string;
  bank_branch_code: string;
  profession: Profession;
  price_adjustment_percent: number;
  no_show_price_cents: number;
  session_minutes: number;
};

/** Validates the setup form. Returns the practice details or the first problem, in plain words. */
export function parseSetupForm(form: FormData): { ok: true; details: SetupDetails } | { ok: false; error: string } {
  const text = (name: string) => String(form.get(name) ?? "").trim();
  const optional = (name: string) => text(name) || null;

  const required: [string, string][] = [
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

  const direction = text("price_direction");
  const percent = direction === "at" ? 0 : Number(text("price_percent"));
  if (!["at", "above", "below"].includes(direction) || !Number.isInteger(percent) || percent < 0) {
    return { ok: false, error: "Please choose how your prices compare to medical aid rates, as a whole percent." };
  }
  const adjustment = direction === "below" ? -percent : percent;
  if (adjustment < -50 || adjustment > 100) {
    return { ok: false, error: "Price adjustments go from 50% below to 100% above medical aid rates." };
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
      name: text("name"),
      practice_number: optional("practice_number"),
      hpcsa_number: optional("hpcsa_number"),
      address: text("address"),
      phone: optional("phone"),
      email: optional("email"),
      bank_name: text("bank_name"),
      bank_account_holder: text("bank_account_holder"),
      bank_account_number: text("bank_account_number"),
      bank_branch_code: text("bank_branch_code"),
      profession,
      price_adjustment_percent: adjustment,
      no_show_price_cents: noShow,
      session_minutes: sessionMinutes,
    },
  };
}
