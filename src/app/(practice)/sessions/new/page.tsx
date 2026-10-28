import type { Metadata } from "next";
import { narrow } from "@/app/ui";
import Link from "next/link";
import { CaptureForm } from "../capture-form";
import { loadCaptureData } from "@/lib/capture-data";
import { toLocalInput } from "@/lib/dates";
import { requireSetUpPractice } from "@/lib/practice";

export const metadata: Metadata = { title: "New session · Therapreneur" };

export default async function NewSessionPage({ searchParams }: { searchParams: Promise<{ patient?: string }> }) {
  const { patient } = await searchParams;
  const { supabase, practice } = await requireSetUpPractice();
  const data = await loadCaptureData(supabase, practice);
  // Started from a patient's page, so that patient is already picked.
  const patientId = data.patients.find((p) => p.id === patient && !p.past_since)?.id ?? "";

  return (
    <main className={`py-6 ${narrow}`}>
      <Link href={patientId ? `/patients/${patientId}` : "/invoices"} className="text-sm text-neutral-500">
        ← {patientId ? "Patient" : "Invoices"}
      </Link>
      <h1 className="mt-3 mb-6 text-2xl font-semibold tracking-tight">New session</h1>
      <CaptureForm
        {...data}
        adjustmentPercent={practice.price_adjustment_percent}
        noShowPriceCents={practice.no_show_price_cents ?? 0}
        initial={{
          sessionId: null,
          patientId,
          startsAt: toLocalInput(new Date()),
          outcome: "attended",
          note: "",
          lines: [],
        }}
      />
    </main>
  );
}
