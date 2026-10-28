import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteButton } from "./delete-button";
import { PaidForm } from "./paid-form";
import { secondaryButton } from "@/app/ui";
import { formatDate, formatDateTime, toLocalInput } from "@/lib/dates";
import { loadInvoiceDocument } from "@/lib/invoice-document";
import { invoiceNumber } from "@/lib/invoices";
import { formatRands } from "@/lib/money";
import { requireSetUpPractice } from "@/lib/practice";
import { lineTotal } from "@/lib/pricing";

export const metadata: Metadata = { title: "Invoice · Therapreneur" };

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, practice } = await requireSetUpPractice();
  const invoice = await loadInvoiceDocument(supabase, practice, id);
  if (!invoice) notFound();

  const { patient, session, claim } = invoice;

  return (
    <main className="py-6">
      <div className="flex items-center justify-between gap-2">
        <Link href="/invoices" className="text-sm text-neutral-500">← Invoices</Link>
        <div className="flex gap-2">
          <a href={`/invoices/${invoice.id}/pdf`} className={secondaryButton}>PDF</a>
          {!claim && (
            <>
              <Link href={`/sessions/${session.id}/edit`} className={secondaryButton}>Fix</Link>
              <DeleteButton invoiceId={invoice.id} />
            </>
          )}
        </div>
      </div>

      <PaidForm invoiceId={invoice.id} paidOn={invoice.paidOn} today={toLocalInput(new Date()).slice(0, 10)} />

      {claim && (
        <p className="mt-4 rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
          Claimed on {formatDate(claim.sentAt)}
          {claim.referenceNumber ? `, reference ${claim.referenceNumber}` : ", waiting for a reference number"}.{" "}
          <Link href={`/claims/${claim.batchId}`} className="underline">See the claim batch</Link>. A claimed invoice
          can&apos;t be fixed or deleted.
        </p>
      )}

      {/* The invoice as the medical aid or patient will see it, matching the PDF. */}
      <article className="mt-6 rounded-lg border border-neutral-200 p-5 text-sm md:p-8">
        <header className="flex flex-col justify-between gap-4 sm:flex-row">
          <div>
            <p className="text-lg font-semibold">{practice.name}</p>
            <p className="whitespace-pre-line text-neutral-500">{practice.address}</p>
            {practice.phone && <p className="text-neutral-500">{practice.phone}</p>}
            {practice.email && <p className="text-neutral-500">{practice.email}</p>}
            {practice.practice_number && <p className="text-neutral-500">Practice no. {practice.practice_number}</p>}
            {practice.hpcsa_number && <p className="text-neutral-500">HPCSA no. {practice.hpcsa_number}</p>}
          </div>
          <div className="sm:text-right">
            <p className="text-lg font-semibold">Invoice</p>
            <p>{invoiceNumber(invoice.number)}</p>
            <p className="text-neutral-500">Date {formatDate(invoice.issuedOn)}</p>
            <p className="text-neutral-500">Due {formatDate(invoice.dueOn)}</p>
          </div>
        </header>

        <section className="mt-6">
          <p className="text-xs font-medium tracking-wide text-neutral-400 uppercase">Bill to</p>
          {invoice.toMedicalAid ? (
            <>
              <p className="font-medium">{patient.medical_aid_name}</p>
              <p>Main member: {patient.main_member_name}</p>
              <p>
                Member no. {patient.member_number}
                {patient.dependant_code && ` · Dependant ${patient.dependant_code}`}
                {patient.plan && ` · ${patient.plan}`}
              </p>
              <p>
                Patient: {patient.patient_name}
                {patient.date_of_birth && ` · Born ${formatDate(patient.date_of_birth)}`}
              </p>
              {patient.referring_doctor_name && (
                <p>
                  Referred by {patient.referring_doctor_name}
                  {patient.referring_doctor_practice_number && ` (practice no. ${patient.referring_doctor_practice_number})`}
                </p>
              )}
            </>
          ) : (
            <p className="font-medium">{patient.patient_name}</p>
          )}
        </section>

        <table className="mt-6 w-full">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs text-neutral-400 uppercase">
              <th className="py-2 font-medium">Code</th>
              <th className="py-2 font-medium">Description</th>
              <th className="py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((line) => (
              <tr key={line.id} className="border-b border-neutral-100 align-top">
                <td className="py-2 pr-3 font-medium">{line.code}</td>
                <td className="py-2 pr-3">
                  <p className="line-clamp-2">{line.description}</p>
                  <p className="text-xs text-neutral-500">
                    {formatDate(invoice.issuedOn)}
                    {line.icd10Codes.length > 0 && ` · ICD-10 ${line.icd10Codes.join(", ")}`}
                    {line.quantity > 1 && ` · ${line.quantity} × ${formatRands(line.unitPriceCents)}`}
                  </p>
                </td>
                <td className="py-2 text-right whitespace-nowrap">{formatRands(lineTotal(line))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} className="pt-3 font-semibold">Total</td>
              <td className="pt-3 text-right font-semibold whitespace-nowrap">{formatRands(invoice.totalCents)}</td>
            </tr>
          </tfoot>
        </table>

        <section className="mt-6 text-neutral-500">
          <p className="text-xs font-medium tracking-wide text-neutral-400 uppercase">Banking details</p>
          <p>{practice.bank_name} · {practice.bank_account_holder}</p>
          <p>Account {practice.bank_account_number} · Branch {practice.bank_branch_code}</p>
          <p>Reference {invoiceNumber(invoice.number)}</p>
        </section>
      </article>

      <section className="mt-6 text-sm">
        <p className="font-medium">Session</p>
        <p className="text-neutral-500">
          {formatDateTime(session.startsAt)} · {session.outcome === "no_show" ? "No-show" : "Attended"}
        </p>
        <div className="mt-3 flex items-baseline justify-between gap-2">
          <p className="font-medium">Note <span className="font-normal text-neutral-400">(only you see this)</span></p>
          {claim && (
            <Link href={`/sessions/${session.id}/edit`} className="text-sm text-neutral-500 underline">
              {session.note ? "Edit note" : "Add note"}
            </Link>
          )}
        </div>
        <p className="whitespace-pre-line text-neutral-600">{session.note ?? "No note yet."}</p>
      </section>
    </main>
  );
}
