"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error?: string };

const MIN_PASSWORD_LENGTH = 8;

function readForm(form: FormData) {
  return {
    email: String(form.get("email") ?? "").trim().toLowerCase(),
    password: String(form.get("password") ?? ""),
  };
}

export async function logIn(_previous: LoginState, form: FormData): Promise<LoginState> {
  const { email, password } = readForm(form);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "That email and password don't match. First time here? Set your password instead." };

  await supabase.rpc("claim_practice");
  redirect("/invoices");
}

/** First login: an invited practitioner chooses their password. */
export async function setPassword(_previous: LoginState, form: FormData): Promise<LoginState> {
  const { email, password } = readForm(form);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Please enter a valid email address." };
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Please choose a password of at least ${MIN_PASSWORD_LENGTH} characters.` };
  }

  const supabase = await createClient();
  const { data: invited } = await supabase.rpc("is_invited", { email });
  if (!invited) {
    return { error: "We don't have an invite for that email yet. Join the waiting list on our home page." };
  }

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error?.code === "user_already_exists") return { error: "You've already set a password. Log in instead." };
  if (error) {
    console.error("Setting password failed", error);
    return { error: error.code === "weak_password" ? error.message : "Something went wrong. Please try again." };
  }
  // Supabase only returns a session straight away when "Confirm email" is switched off in its settings.
  if (!data.session) {
    console.error("Sign-up returned no session; is email confirmation switched on in Supabase?");
    return { error: "Something went wrong on our side. Please let Barry know." };
  }

  await supabase.rpc("claim_practice");
  redirect("/invoices");
}

export async function logOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
