"use server";

import { createClient } from "@/lib/supabase/server";
import { parseWaitlistForm } from "@/lib/waitlist";

export type WaitlistState = { status: "idle" | "joined" | "error"; message?: string };

export async function joinWaitlist(
  _previous: WaitlistState,
  form: FormData,
): Promise<WaitlistState> {
  // Hidden field that people never see; bots that fill every field get a quiet success.
  if (form.get("company")) return { status: "joined" };

  const parsed = parseWaitlistForm(form);
  if (!parsed.ok) return { status: "error", message: parsed.error };

  const supabase = await createClient();
  const { error } = await supabase.from("waitlist").insert(parsed.signup);

  // 23505 = already on the list, which is fine from the visitor's point of view.
  if (error && error.code !== "23505") {
    console.error("Waitlist signup failed", error);
    return { status: "error", message: "Something went wrong. Please try again." };
  }
  return { status: "joined" };
}
