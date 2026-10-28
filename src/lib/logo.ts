import type { SupabaseClient } from "@supabase/supabase-js";
import type { Practice } from "./practice";
import type { Database } from "./supabase/database.types";

// The practice's logo lives in a private Supabase Storage bucket, one folder per practice (decision 0006).
export const LOGO_BUCKET = "logos";
export const MAX_LOGO_BYTES = 1024 * 1024;
const FORMATS: Record<string, "png" | "jpg"> = { "image/png": "png", "image/jpeg": "jpg" };

/** Checks an uploaded logo. Returns its file extension, or the problem in plain words. */
export function checkLogo(file: { type: string; size: number }): { ok: true; extension: "png" | "jpg" } | { ok: false; error: string } {
  const extension = FORMATS[file.type];
  if (!extension) return { ok: false, error: "Please choose a PNG or JPG image." };
  if (file.size === 0) return { ok: false, error: "That file is empty. Please choose another." };
  if (file.size > MAX_LOGO_BYTES) return { ok: false, error: "Please choose an image under 1 MB." };
  return { ok: true, extension };
}

/** A link to show the logo in the app for the next hour, or null with no logo. */
export async function logoUrl(supabase: SupabaseClient<Database>, practice: Practice): Promise<string | null> {
  if (!practice.logo_path) return null;
  const { data, error } = await supabase.storage.from(LOGO_BUCKET).createSignedUrl(practice.logo_path, 60 * 60);
  if (error) console.error("Signing logo link failed", error);
  return data?.signedUrl ?? null;
}

export type LogoImage = { data: Buffer; format: "png" | "jpg" };

/** The logo's image, for printing on PDFs, or null with no logo. A missing logo never stops a PDF. */
export async function logoImage(supabase: SupabaseClient<Database>, practice: Practice): Promise<LogoImage | null> {
  if (!practice.logo_path) return null;
  const { data, error } = await supabase.storage.from(LOGO_BUCKET).download(practice.logo_path);
  if (error || !data) {
    console.error("Downloading logo failed", error);
    return null;
  }
  return { data: Buffer.from(await data.arrayBuffer()), format: practice.logo_path.endsWith(".png") ? "png" : "jpg" };
}
