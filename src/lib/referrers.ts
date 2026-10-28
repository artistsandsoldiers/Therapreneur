import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Enums, Tables } from "./supabase/database.types";

/** Who or what sent a patient to the practice (docs/features/patients.md). */
export type Referrer = Pick<Tables<"referrers">, "id" | "name" | "kind" | "practice_number">;
export type ReferrerKind = Enums<"referrer_kind">;

export const REFERRER_KINDS: [ReferrerKind, string][] = [
  ["doctor", "Doctor"],
  ["therapist", "Other therapist"],
  ["website", "Website"],
  ["social_media", "Social media"],
  ["word_of_mouth", "Word of mouth"],
  ["other", "Other"],
];

export function referrerKindLabel(kind: ReferrerKind): string {
  return REFERRER_KINDS.find(([value]) => value === kind)?.[1] ?? "Other";
}

/** The value of the referrer picker's last option, which reveals boxes for a new referrer. */
export const NEW_REFERRER = "new";

/** What the patient form says about the referrer: none, an existing one, or a new one to add. */
export type ReferrerChoice =
  | { type: "none" }
  | { type: "existing"; id: string }
  | { type: "new"; name: string; kind: ReferrerKind; practiceNumber: string | null };

/** Reads the referrer part of the patient form. */
export function parseReferrerChoice(form: FormData): { ok: true; choice: ReferrerChoice } | { ok: false; error: string } {
  const text = (name: string) => String(form.get(name) ?? "").trim();
  const picked = text("referrer_id");
  if (!picked) return { ok: true, choice: { type: "none" } };
  if (picked !== NEW_REFERRER) return { ok: true, choice: { type: "existing", id: picked } };

  const name = text("new_referrer_name");
  const kind = REFERRER_KINDS.find(([value]) => value === text("new_referrer_kind"))?.[0];
  if (!name) return { ok: false, error: "Please name the new referrer." };
  if (name.length > 100) return { ok: false, error: "Please shorten the referrer's name to under 100 characters." };
  if (!kind) return { ok: false, error: "Please choose what kind of referrer this is." };
  const practiceNumber = kind === "doctor" ? text("new_referrer_practice_number") || null : null;
  if (practiceNumber && practiceNumber.length > 30) return { ok: false, error: "Please check the doctor's practice number." };
  return { ok: true, choice: { type: "new", name, kind, practiceNumber } };
}

/** The practice's referrers, alphabetically. */
export async function loadReferrers(supabase: SupabaseClient<Database>): Promise<Referrer[]> {
  const { data, error } = await supabase.from("referrers").select("id, name, kind, practice_number").order("name");
  if (error) throw error;
  return data;
}

/**
 * Turns the form's choice into the patient's referrer columns, adding a new referrer if needed. A new one with the
 * same name as an existing one uses that instead. A doctor also fills the referring doctor printed on invoices.
 */
export async function resolveReferrer(
  supabase: SupabaseClient<Database>,
  practiceId: string,
  choice: ReferrerChoice,
): Promise<
  | { ok: true; columns: { referrer_id: string | null; referring_doctor_name: string | null; referring_doctor_practice_number: string | null } }
  | { ok: false; error: string }
> {
  if (choice.type === "none") {
    return { ok: true, columns: { referrer_id: null, referring_doctor_name: null, referring_doctor_practice_number: null } };
  }

  let referrer: Referrer | undefined;
  if (choice.type === "existing") {
    referrer = (await loadReferrers(supabase)).find((r) => r.id === choice.id);
    if (!referrer) return { ok: false, error: "Please choose the referrer again." };
  } else {
    referrer = (await loadReferrers(supabase)).find((r) => r.name.toLowerCase() === choice.name.toLowerCase());
    if (!referrer) {
      const { data, error } = await supabase
        .from("referrers")
        .insert({ practice_id: practiceId, name: choice.name, kind: choice.kind, practice_number: choice.practiceNumber })
        .select("id, name, kind, practice_number")
        .single();
      if (error) {
        console.error("Adding referrer failed", error);
        return { ok: false, error: "Your new referrer didn't save. Please try again." };
      }
      referrer = data;
    }
  }

  const doctor = referrer.kind === "doctor";
  return {
    ok: true,
    columns: {
      referrer_id: referrer.id,
      referring_doctor_name: doctor ? referrer.name : null,
      referring_doctor_practice_number: doctor ? referrer.practice_number : null,
    },
  };
}
