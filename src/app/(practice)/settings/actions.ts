"use server";

import { revalidatePath } from "next/cache";
import { checkLogo, LOGO_BUCKET } from "@/lib/logo";
import { requireSetUpPractice } from "@/lib/practice";

export type LogoState = { error?: string };

/** Saves a new logo, or removes it when the form has no file. Each upload gets a new name, so old links stop showing it. */
export async function saveLogo(_previous: LogoState, form: FormData): Promise<LogoState> {
  const file = form.get("logo");
  const upload = file instanceof File && file.size > 0 ? file : null;
  let path: string | null = null;

  const { supabase, practice } = await requireSetUpPractice();
  if (upload) {
    const checked = checkLogo(upload);
    if (!checked.ok) return { error: checked.error };
    path = `${practice.id}/${Date.now()}.${checked.extension}`;
    const { error } = await supabase.storage.from(LOGO_BUCKET).upload(path, upload, { contentType: upload.type });
    if (error) {
      console.error("Uploading logo failed", error);
      return { error: "Your logo didn't upload. Please try again." };
    }
  } else if (form.get("remove") !== "yes") {
    return { error: "Please choose an image first." };
  }

  const { error } = await supabase.from("practices").update({ logo_path: path }).eq("id", practice.id);
  if (error) {
    console.error("Saving logo failed", error);
    return { error: "Something went wrong. Please try again." };
  }
  // The old file is no longer used. If removing it fails, it just sits there unseen.
  if (practice.logo_path) await supabase.storage.from(LOGO_BUCKET).remove([practice.logo_path]);

  revalidatePath("/", "layout");
  return {};
}
