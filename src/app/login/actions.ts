"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginState = {
  step: "email" | "code";
  email?: string;
  error?: string;
};

export async function sendCode(_previous: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { step: "email", error: "Please enter a valid email address." };
  }

  const supabase = await createClient();
  const { data: invited } = await supabase.rpc("is_invited", { email });
  if (!invited) {
    return {
      step: "email",
      email,
      error: "We don't have an invite for that email yet. Join the waiting list on our home page.",
    };
  }

  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) {
    console.error("Sending login code failed", error);
    return {
      step: "email",
      email,
      error:
        error.status === 429
          ? "Too many codes sent. Please wait a few minutes and try again."
          : "We couldn't send a code. Please try again.",
    };
  }
  return { step: "code", email };
}

export async function verifyCode(_previous: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "");
  const token = String(form.get("code") ?? "").replace(/\s/g, "");

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) {
    return { step: "code", email, error: "That code didn't work. Check it, or send a new one." };
  }
  await supabase.rpc("claim_practice");
  redirect("/invoices");
}

export async function logOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
