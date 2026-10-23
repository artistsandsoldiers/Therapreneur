import type { Metadata } from "next";
import Link from "next/link";
import { getPractice } from "@/lib/practice";
import { SetupForm } from "./setup-form";

export const metadata: Metadata = { title: "Setup · Therapreneur" };

export default async function SetupPage() {
  const { practice } = await getPractice();
  const isFirstTime = !practice.setup_completed_at;

  return (
    <main className="mx-auto max-w-lg px-6 py-8">
      {!isFirstTime && (
        <Link href="/invoices" className="text-sm text-neutral-500">← Back</Link>
      )}
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        {isFirstTime ? "Welcome. Let's set up your practice." : "Practice settings"}
      </h1>
      {isFirstTime && (
        <p className="mt-2 text-neutral-500">This takes about two minutes, and you can change it later.</p>
      )}
      <div className="mt-8">
        <SetupForm practice={practice} />
      </div>
    </main>
  );
}
