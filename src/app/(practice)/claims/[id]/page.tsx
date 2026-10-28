import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BatchStatus } from "../batch-status";
import { ReferenceForm } from "./reference-form";
import { formatDate, formatDateTime } from "@/lib/dates";
import { loadInvoiceDocuments } from "@/lib/invoice-document";
import { invoiceNumber } from "@/lib/invoices";
import { formatRands } from "@/lib/money";
import { requireSetUpPractice } from "@/lib/practice";

export const metadata: Metadata = { title: "Claim batch · Therapreneur" };

export default async function ClaimBatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, practice } = await requireSetUpPractice();
  const { data: batch } = await supabase
    .from("claim_batches")
    .select("id, sent_at, sent_to, reference_number, medical_aids(name), invoices(id)")
    .eq("id", id)
    .not("sent_at", "is", null)
    .maybeSingle();
  if (!batch) notFound();

  const claims = await loadInvoiceDocuments(supabase, practice, batch.invoices.map((invoice) => invoice.id));
  const total = claims.reduce((sum, claim) => sum + claim.totalCents, 0);

  return (
    <main className="py-6">
      <Link href="/claims" className="text-sm text-neutral-500">← Claims</Link>
      <div className="mt-3 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{batch.medical_aids?.name}</h1>
        <BatchStatus referenceNumber={batch.reference_number} />
      </div>
      <p className="mt-1 text-sm text-neutral-500">
        Sent {formatDateTime(batch.sent_at!)} to {batch.sent_to} · {claims.length === 1 ? "1 claim" : `${claims.length} claims`} ·{" "}
        {formatRands(total)}
      </p>

      <div className="mt-6">
        <ReferenceForm batchId={batch.id} referenceNumber={batch.reference_number} />
      </div>

      <h2 className="mt-10 mb-3 text-lg font-semibold">Claims</h2>
      <ul className="divide-y divide-neutral-100 border-y border-neutral-100">
        {claims.map((claim) => (
          <li key={claim.id}>
            <Link href={`/invoices/${claim.id}`} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{claim.patient.patient_name}</p>
                <p className="text-sm text-neutral-500">
                  {invoiceNumber(claim.number)} · {formatDate(claim.issuedOn)} · Member no. {claim.patient.member_number}
                </p>
              </div>
              <span className="shrink-0 font-medium">{formatRands(claim.totalCents)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
