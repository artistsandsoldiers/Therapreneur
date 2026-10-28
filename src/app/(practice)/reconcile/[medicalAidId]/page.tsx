import type { Metadata } from "next";
import { narrow } from "@/app/ui";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RemittanceForm } from "./remittance-form";
import { toLocalInput } from "@/lib/dates";
import { requireSetUpPractice } from "@/lib/practice";
import { loadOutstandingClaims } from "@/lib/reconciliation";

export const metadata: Metadata = { title: "Record a remittance · Therapreneur" };

export default async function RecordRemittancePage({ params }: { params: Promise<{ medicalAidId: string }> }) {
  const { medicalAidId } = await params;
  const { supabase } = await requireSetUpPractice();
  const claims = await loadOutstandingClaims(supabase, medicalAidId);
  if (claims.length === 0) notFound();

  return (
    <main className={`py-6 ${narrow}`}>
      <Link href="/reconcile" className="text-sm text-neutral-500">← Reconcile</Link>
      <h1 className="mt-3 mb-2 text-2xl font-semibold tracking-tight">{claims[0].medicalAidName}</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Tick each claim the remittance paid in full. Leave the rest, and they stay outstanding.
      </p>
      <RemittanceForm medicalAidId={medicalAidId} claims={claims} today={toLocalInput(new Date()).slice(0, 10)} />
    </main>
  );
}
