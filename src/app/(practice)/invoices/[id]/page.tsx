import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteButton } from "./delete-button";
import { secondaryButton } from "@/app/ui";
import { formatDate, formatDateTime } from "@/lib/dates";
import { invoiceNumber } from "@/lib/invoices";
import { formatRands } from "@/lib/money";
import { requireSetUpPractice } from "@/lib/practice";
import { invoiceTotal, lineTotal } from "@/lib/pricing";

export const metadata: Metadata = { title: "Invoice · Therapreneur" };

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, practice } = await requireSetUpPractice();
  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, invoice_lines(*), sessions(id, starts_at, outcome, note, patients(*, medical_aids(name)))")
    .eq("id", id)
    .maybeSingle();
  if (!invoice?.sessions?.patients) notFound();

  const session = invoice.sessions;
  const patient = session.patients!;
  const lines = [...invoice.invoice_lines].sort((a, b) => a.position - b.position);
  const total = invoiceTotal(lines.map((line) => ({ quantity: line.quantity, unitPriceCents: line.unit_price_cents })));
  const toMedicalAid = invoice.bill_to === "medical_aid";
  const patientName = `${patient.first_name} ${patient.last_name}`;

  return (
    <main className="py-6">
      <div className="flex items-center justify-between gap-2">
        <Link href="/invoices" className="text-sm text-neutral-500">← Invoices</Link>
        <div className="flex gap-2">
          <Link href={`/sessions/${session.id}/edit`} className={secondaryButton}>Fix</Link>
          <DeleteButton invoiceId={invoice.id} />
        </div>
      </div>

      {/* The invoice as the medical aid or patient will see it. */}
      <article className="mt-6 rounded-lg border border-neutral-200 p-5 text-sm md:p-8">
        <header className="flex flex-col justify-between gap-4 sm:flex-row">
          <div>
            <p className="text-lg font-semibold">{practice.name}</p>
            <p className="whitespace-pre-line text-neutral-500">{practice.address}</p>
            {practice.phone && <p className="text-neutral-500">{practice.phone}</p>}
            {practice.email && <p className="text-neutral-500">{practice.email}</p>}
            {practice.practice_number && <p className="text-neutral-500">Practice no. {practice.practice_number}</p>}
          </div>
          <div className="sm:text-right">
            <p className="text-lg font-semibold">Invoice</p>
            <p>{invoiceNumber(invoice.number)}</p>
            <p className="text-neutral-500">Date {formatDate(invoice.issued_on)}</p>
            <p className="text-neutral-500">Due {formatDate(invoice.due_on)}</p>
          </div>
        </header>

        <section className="mt-6">
          <p className="text-xs font-medium tracking-wide text-neutral-400 uppercase">Bill to</p>
          {toMedicalAid ? (
            <>
              <p className="font-medium">{patient.medical_aids?.name}</p>
              <p>Main member: {patient.main_member_name}</p>
              <p>
                Member no. {patient.member_number}
                {patient.plan && ` · ${patient.plan}`}
              </p>
              <p>Patient: {patientName}</p>
            </>
          ) : (
            <p className="font-medium">{patientName}</p>
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
            {lines.map((line) => (
              <tr key={line.id} className="border-b border-neutral-100 align-top">
                <td className="py-2 pr-3 font-medium">{line.code}</td>
                <td className="py-2 pr-3">
                  <p className="line-clamp-2">{line.description}</p>
                  <p className="text-xs text-neutral-500">
                    {formatDate(invoice.issued_on)}
                    {line.icd10_codes.length > 0 && ` · ICD-10 ${line.icd10_codes.join(", ")}`}
                    {line.quantity > 1 && ` · ${line.quantity} × ${formatRands(line.unit_price_cents)}`}
                  </p>
                </td>
                <td className="py-2 text-right whitespace-nowrap">
                  {formatRands(lineTotal({ quantity: line.quantity, unitPriceCents: line.unit_price_cents }))}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} className="pt-3 font-semibold">Total</td>
              <td className="pt-3 text-right font-semibold whitespace-nowrap">{formatRands(total)}</td>
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
          {formatDateTime(session.starts_at)} · {session.outcome === "no_show" ? "No-show" : "Attended"}
        </p>
        <p className="mt-3 font-medium">Note <span className="font-normal text-neutral-400">(only you see this)</span></p>
        <p className="whitespace-pre-line text-neutral-600">{session.note ?? "No note yet."}</p>
      </section>
    </main>
  );
}
