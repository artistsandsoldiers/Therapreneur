import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { loadPriceExample } from "@/lib/capture-data";
import { getPractice } from "@/lib/practice";
import { SetupForm } from "./setup-form";

export const metadata: Metadata = { title: "Setup · Therapreneur" };

/** First-time setup. Once it's done, the same form lives under Settings. */
export default async function SetupPage() {
  const { supabase, practice } = await getPractice();
  if (practice.setup_completed_at) redirect("/settings");

  return (
    <main className="mx-auto max-w-lg px-6 py-8">
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Welcome. Let&apos;s set up your practice.</h1>
      <p className="mt-2 text-neutral-500">This takes about two minutes, and you can change it later.</p>
      <div className="mt-8">
        <SetupForm practice={practice} priceExample={await loadPriceExample(supabase, practice)} />
      </div>
    </main>
  );
}
