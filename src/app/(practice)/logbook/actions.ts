"use server";

import { revalidatePath } from "next/cache";
import { requireSetUpPractice } from "@/lib/practice";
import { normaliseAddress } from "@/lib/trips";

/** Remembers the driving distance between two addresses, in both directions. Typed in km, like 12.5. */
export async function saveDistance(from: string, to: string, typed: string): Promise<{ error?: string }> {
  const km = Number(typed.replace(",", ".").trim());
  if (!typed.trim() || !Number.isFinite(km) || km <= 0 || km >= 2000) return { error: "Please enter the distance in km, like 12.5." };
  const [address_a, address_b] = [normaliseAddress(from), normaliseAddress(to)].sort();
  if (address_a === address_b) return { error: "Those are the same address." };

  const { supabase, practice } = await requireSetUpPractice();
  const { error } = await supabase
    .from("distances")
    .upsert({ practice_id: practice.id, address_a, address_b, km: Math.round(km * 10) / 10 }, { onConflict: "practice_id,address_a,address_b" });
  if (error) {
    console.error("Saving distance failed", error);
    return { error: "Something went wrong. Please try again." };
  }
  revalidatePath("/logbook");
  return {};
}
