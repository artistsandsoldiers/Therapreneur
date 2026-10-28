import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { UndoButton } from "./undo-button";
import { formatDate } from "@/lib/dates";
import { invoiceNumber } from "@/lib/invoices";
import { formatRands } from "@/lib/money";
import { requireSetUpPractice } from "@/lib/practice";
import { invoiceTotal } from "@/lib/pricing";

export const metadata: Metadata = { title: "Remittance · Therapreneur" };

export default async function RemittancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireSetUpPractice();
  const { data: remittance } = await supabase
    .from("remittances")
    .select("id, paid_on, reference, medical_aids(name), invoices(id, number, issued_on, claimed_details, invoice_lines(quantity, unit_price_cents))")
    .eq("id", id)
    .maybeSingle();
  if (!remittance) notFound();

  const claims = [...remittance.invoices]
    .sort((a, b) => a.number - b.number)
    .map((invoice) => ({
      ...invoice,
      patientName: (invoice.claimed_details as { patient_name?: string } | null)?.patient_name ?? "Unknown patient",
      totalCents: invoiceTotal(invoice.invoice_lines.map((line) => ({ quantity: line.quantity, unitPriceCents: line.unit_price_cents }))),
    }));
  const total = claims.reduce((sum, claim) => sum + claim.totalCents, 0);

  return (
    <main className="py-6">
      <Link href="/reconcile" className="text-sm text-neutral-500">← Reconcile</Link>
      <div className="mt-3 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{remittance.medical_aids?.name}</h1>
        <span className="shrink-0 rounded-full bg-accent/10 px-2.5 py-0.5 text-sm text-accent">Paid</span>
      </div>
      <p className="mt-1 text-sm text-neutral-500">
        Paid {formatDate(remittance.paid_on)}
        {remittance.reference && ` · Reference ${remittance.reference}`} · {claims.length === 1 ? "1 claim" : `${claims.length} claims`}
      </p>
      <p className="mt-4 text-3xl font-semibold tracking-tight">{formatRands(total)}</p>
      <p className="text-sm text-neutral-500">Check this matches the payment in your bank account.</p>

      <h2 className="mt-10 mb-3 text-lg font-semibold">Claims paid</h2>
      <ul className="divide-y divide-neutral-100 border-y border-neutral-100">
        {claims.map((claim) => (
          <li key={claim.id}>
            <Link href={`/invoices/${claim.id}`} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{claim.patientName}</p>
                <p className="text-sm text-neutral-500">{invoiceNumber(claim.number)} · {formatDate(claim.issued_on)}</p>
              </div>
              <span className="shrink-0 font-medium">{formatRands(claim.totalCents)}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-10">
        <UndoButton remittanceId={remittance.id} />
      </div>
    </main>
  );
}
