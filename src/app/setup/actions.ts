"use server";

import { redirect } from "next/navigation";
import { getPractice } from "@/lib/practice";
import { parseSetupForm } from "@/lib/setup";

export type SetupState = { error?: string };

export async function saveSetup(_previous: SetupState, form: FormData): Promise<SetupState> {
  const parsed = parseSetupForm(form);
  if (!parsed.ok) return { error: parsed.error };

  const { supabase, practice } = await getPractice();
  const { error } = await supabase
    .from("practices")
    .update({ ...parsed.details, setup_completed_at: practice.setup_completed_at ?? new Date().toISOString() })
    .eq("id", practice.id);
  if (error) {
    console.error("Saving setup failed", error);
    return { error: "Something went wrong. Please try again." };
  }
  redirect("/invoices");
}
