import type { Metadata } from "next";
import { narrow } from "@/app/ui";
import Link from "next/link";
import { SendButton } from "./send-button";
import { claimEmail, claimSending, groupByMedicalAid } from "@/lib/claims";
import { loadInvoiceDocuments } from "@/lib/invoice-document";
import { invoicePdfName } from "@/lib/invoice-pdf";
import { missingClaimDetails } from "@/lib/patients";
import { requireSetUpPractice } from "@/lib/practice";

export const metadata: Metadata = { title: "Preview claims · Therapreneur" };

/** Shows each claim batch email exactly as it will go out, before sending. */
export default async function PreviewClaimsPage({ searchParams }: { searchParams: Promise<{ invoice?: string | string[] }> }) {
  const { invoice } = await searchParams;
  const ids = [invoice ?? []].flat();
  const { supabase, practice } = await requireSetUpPractice();

  const [invoices, { data: medicalAids, error }] = await Promise.all([
    loadInvoiceDocuments(supabase, practice, ids),
    supabase.from("medical_aids").select("id, name"),
  ]);
  if (error) throw error;
  const ready = invoices.filter(
    (doc) => doc.toMedicalAid && !doc.claim && doc.medicalAidId && !missingClaimDetails(doc.patient).length,
  );
  const batches = [...groupByMedicalAid(ready)];
  const config = claimSending(process.env);
  const to = config.ok ? config.sending.to : "the test inbox (not set up yet)";

  return (
    <main className={`py-6 ${narrow}`}>
      <Link href="/claims" className="text-sm text-neutral-500">← Claims</Link>
      <h1 className="mt-3 mb-2 text-2xl font-semibold tracking-tight">Preview claims</h1>

      {ready.length === 0 ? (
        <p className="text-neutral-500">
          None of these invoices can be claimed. <Link href="/claims" className="underline">Go back to Claims</Link>.
        </p>
      ) : (
        <>
          <p className="mb-6 text-sm text-neutral-500">
            {batches.length === 1 ? "One email" : `${batches.length} emails`}, one per medical aid. While we&apos;re
            testing, every claim goes to {to}, never to a real medical aid.
          </p>

          <div className="flex flex-col gap-8">
            {batches.map(([medicalAidId, batch]) => {
              const name = medicalAids.find((aid) => aid.id === medicalAidId)?.name ?? "Medical aid";
              const email = claimEmail(practice, name, batch, to);
              return (
                <section key={medicalAidId} className="rounded-lg border border-neutral-200 text-sm">
                  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-b border-neutral-100 p-4">
                    <dt className="text-neutral-500">To</dt>
                    <dd className="break-all">{to}</dd>
                    <dt className="text-neutral-500">Replies to</dt>
                    <dd className="break-all">{practice.email ?? practice.invite_email}</dd>
                    <dt className="text-neutral-500">Subject</dt>
                    <dd>{email.subject}</dd>
                  </dl>
                  {/* Our own HTML, with every value escaped in src/lib/claims.ts. */}
                  <div className="overflow-x-auto p-4" dangerouslySetInnerHTML={{ __html: email.html }} />
                  <ul className="flex flex-col gap-1 border-t border-neutral-100 p-4">
                    {batch.map((doc) => (
                      <li key={doc.id}>
                        <a href={`/invoices/${doc.id}/pdf`} className="text-neutral-600 underline">📎 {invoicePdfName(doc)}</a>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>

          {ready.length < ids.length && (
            <p className="mt-6 text-sm text-amber-700">
              {ids.length - ready.length} of the invoices you ticked can&apos;t be claimed any more and were left out.
            </p>
          )}
          <div className="sticky bottom-0 -mx-4 mt-6 border-t border-neutral-100 bg-white px-4 py-3">
            <SendButton invoiceIds={ready.map((doc) => doc.id)} batches={batches.length} />
          </div>
        </>
      )}
    </main>
  );
}
