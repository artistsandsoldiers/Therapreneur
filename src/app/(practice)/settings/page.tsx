import type { Metadata } from "next";
import { LogoForm } from "./logo-form";
import { SetupForm } from "@/app/setup/setup-form";
import { logoUrl } from "@/lib/logo";
import { requireSetUpPractice } from "@/lib/practice";

export const metadata: Metadata = { title: "Settings · Therapreneur" };

export default async function SettingsPage() {
  const { supabase, practice } = await requireSetUpPractice();

  return (
    <main className="py-6">
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">Practice settings</h1>
      <LogoForm logoUrl={await logoUrl(supabase, practice)} />
      <SetupForm practice={practice} />
    </main>
  );
}
