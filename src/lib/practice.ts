import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type Practice = Tables<"practices">;

/**
 * The logged-in practitioner's practice. Sends them to log in if they aren't, and links them
 * to the practice their email was invited to on their first visit.
 */
export async function getPractice() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let { data: practice } = await supabase.from("practices").select("*").maybeSingle();
  if (!practice) {
    await supabase.rpc("claim_practice");
    ({ data: practice } = await supabase.from("practices").select("*").maybeSingle());
  }
  if (!practice) redirect("/login?not-invited");

  return { supabase, practice };
}

/** Like getPractice, but also sends practitioners who haven't finished setup to it. */
export async function requireSetUpPractice() {
  const result = await getPractice();
  if (!result.practice.setup_completed_at) redirect("/setup");
  return result;
}
