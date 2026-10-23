export const OCCUPATIONS = [
  "Occupational therapist",
  "Physiotherapist",
  "Speech therapist",
  "Other allied health",
  "Other",
] as const;

export type WaitlistSignup = {
  name: string;
  email: string;
  occupation: string;
  source: string | null;
};

export type ParseResult =
  | { ok: true; signup: WaitlistSignup }
  | { ok: false; error: string };

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Validates the landing page form. Mirrors the checks on the waitlist table. */
export function parseWaitlistForm(form: FormData): ParseResult {
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const occupation = String(form.get("occupation") ?? "");
  const source = String(form.get("source") ?? "").trim().slice(0, 200) || null;

  if (!name || name.length > 200) {
    return { ok: false, error: "Please enter your name." };
  }
  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    return { ok: false, error: "Please enter a valid email address." };
  }
  if (!(OCCUPATIONS as readonly string[]).includes(occupation)) {
    return { ok: false, error: "Please choose your occupation." };
  }
  return { ok: true, signup: { name, email, occupation, source } };
}
