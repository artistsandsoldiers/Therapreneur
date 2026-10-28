import type { Metadata } from "next";
import Link from "next/link";
import { formatDate } from "@/lib/dates";
import { formatRands } from "@/lib/money";
import { requireSetUpPractice } from "@/lib/practice";
import { invoiceTotal } from "@/lib/pricing";
import { groupByMedicalAid, loadOutstandingClaims } from "@/lib/reconciliation";

export const metadata: Metadata = { title: "Reconcile · Therapreneur" };

export default async function ReconcilePage() {
  const { supabase } = await requireSetUpPractice();
  const [outstanding, remittances] = await Promise.all([
    loadOutstandingClaims(supabase),
    supabase
      .from("remittances")
      .select("id, paid_on, reference, medical_aids(name), invoices(invoice_lines(quantity, unit_price_cents))")
      .order("paid_on", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);
  if (remittances.error) throw remittances.error;
  const groups = groupByMedicalAid(outstanding);

  return (
    <main className="py-6">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Reconcile</h1>
      <p className="text-sm text-neutral-500">
        When a medical aid&apos;s remittance arrives, tick the claims it paid. They&apos;re marked paid on that date.
      </p>

      <h2 className="mt-8 mb-3 text-lg font-semibold">Waiting for payment</h2>
      {groups.length === 0 ? (
        <p className="text-neutral-500">No claims waiting. Claims appear here once you&apos;ve sent them.</p>
      ) : (
        <ul className="divide-y divide-neutral-100 border-y border-neutral-100">
          {groups.map((group) => (
            <li key={group.medicalAidId}>
              <Link href={`/reconcile/${group.medicalAidId}`} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{group.name}</p>
                  <p className="text-sm text-neutral-500">
                    {group.claims.length === 1 ? "1 claim" : `${group.claims.length} claims`} · oldest from{" "}
                    {formatDate(group.claims[0].issuedOn)}
                  </p>
                </div>
                <span className="shrink-0 font-medium">{formatRands(group.totalCents)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-12 mb-3 text-lg font-semibold">Remittances</h2>
      {remittances.data.length === 0 ? (
        <p className="text-neutral-500">No remittances recorded yet.</p>
      ) : (
        <ul className="divide-y divide-neutral-100 border-y border-neutral-100">
          {remittances.data.map((remittance) => {
            const total = remittance.invoices.reduce(
              (sum, invoice) =>
                sum +
                invoiceTotal(invoice.invoice_lines.map((line) => ({ quantity: line.quantity, unitPriceCents: line.unit_price_cents }))),
              0,
            );
            const count = remittance.invoices.length;
            return (
              <li key={remittance.id}>
                <Link href={`/reconcile/remittances/${remittance.id}`} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{remittance.medical_aids?.name}</p>
                    <p className="text-sm text-neutral-500">
                      Paid {formatDate(remittance.paid_on)} · {count === 1 ? "1 claim" : `${count} claims`}
                      {remittance.reference && ` · ${remittance.reference}`}
                    </p>
                  </div>
                  <span className="shrink-0 font-medium">{formatRands(total)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
