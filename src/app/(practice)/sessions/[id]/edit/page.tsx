import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CaptureForm } from "../../capture-form";
import { NoteForm } from "../../note-form";
import { loadCaptureData } from "@/lib/capture-data";
import { toLocalInput } from "@/lib/dates";
import { requireSetUpPractice } from "@/lib/practice";

export const metadata: Metadata = { title: "Fix invoice · Therapreneur" };

export default async function EditSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, practice } = await requireSetUpPractice();
  const [data, { data: session }] = await Promise.all([
    loadCaptureData(supabase, practice),
    supabase
      .from("sessions")
      .select("id, patient_id, starts_at, outcome, note, invoices(id, claim_batches(sent_at), invoice_lines(billing_code_id, quantity, unit_price_cents, position))")
      .eq("id", id)
      .maybeSingle(),
  ]);
  if (!session?.invoices) notFound();

  // A claimed invoice is locked, so only its note can change.
  if (session.invoices.claim_batches?.sent_at) {
    return (
      <main className="py-6">
        <Link href={`/invoices/${session.invoices.id}`} className="text-sm text-neutral-500">← Invoice</Link>
        <h1 className="mt-3 mb-2 text-2xl font-semibold tracking-tight">Session note</h1>
        <p className="mb-6 text-sm text-neutral-500">This invoice has been claimed, so only the note can change.</p>
        <NoteForm sessionId={session.id} note={session.note ?? ""} />
      </main>
    );
  }

  const lines =
    session.outcome === "no_show"
      ? []
      : session.invoices.invoice_lines
          .sort((a, b) => a.position - b.position)
          .filter((line) => line.billing_code_id)
          .map((line) => ({
            billingCodeId: line.billing_code_id!,
            quantity: line.quantity,
            unitPriceCents: line.unit_price_cents,
          }));

  return (
    <main className="py-6">
      <Link href={`/invoices/${session.invoices.id}`} className="text-sm text-neutral-500">← Invoice</Link>
      <h1 className="mt-3 mb-6 text-2xl font-semibold tracking-tight">Fix invoice</h1>
      <CaptureForm
        {...data}
        adjustmentPercent={practice.price_adjustment_percent}
        noShowPriceCents={practice.no_show_price_cents ?? 0}
        initial={{
          sessionId: session.id,
          patientId: session.patient_id,
          startsAt: toLocalInput(new Date(session.starts_at)),
          outcome: session.outcome,
          note: session.note ?? "",
          lines,
        }}
      />
    </main>
  );
}
