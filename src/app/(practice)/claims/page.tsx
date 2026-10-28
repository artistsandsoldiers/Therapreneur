import type { Metadata } from "next";
import Link from "next/link";
import { SentList } from "./sent-list";
import { bottomLeft, button, listRow, topRight } from "@/app/ui";
import { missingPracticeDetails } from "@/lib/claims";
import { friendlyDate } from "@/lib/dates";
import { invoiceNumber } from "@/lib/invoices";
import { formatRands } from "@/lib/money";
import { missingClaimDetails } from "@/lib/patients";
import { requireSetUpPractice } from "@/lib/practice";
import { invoiceTotal } from "@/lib/pricing";

export const metadata: Metadata = { title: "Claims · Therapreneur" };

// A batch still not marked sent after this long was interrupted mid-send, so its invoices are freed to claim again.
const STUCK_AFTER_MS = 10 * 60 * 1000;

const READY_COLS = "md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)]";

export default async function ClaimsPage({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const { sent } = await searchParams;
  const { supabase, practice } = await requireSetUpPractice();

  await supabase
    .from("claim_batches")
    .delete()
    .is("sent_at", null)
    .lt("created_at", new Date(Date.now() - STUCK_AFTER_MS).toISOString());

  const [ready, batches] = await Promise.all([
    supabase
      .from("invoices")
      .select(
        "id, number, issued_on, invoice_lines(quantity, unit_price_cents), sessions(patients(id, first_name, last_name, medical_aid_id, date_of_birth, dependant_code, medical_aids(name)))",
      )
      .eq("bill_to", "medical_aid")
      .is("claim_batch_id", null)
      .order("number"),
    supabase
      .from("claim_batches")
      .select("id, sent_at, reference_number, medical_aids(name), invoices(invoice_lines(quantity, unit_price_cents))")
      .not("sent_at", "is", null)
      .order("sent_at", { ascending: false }),
  ]);
  if (ready.error) throw ready.error;
  if (batches.error) throw batches.error;

  // Group the ready invoices by the patient's medical aid, in alphabetical order.
  const groups = new Map<string, { name: string; invoices: typeof ready.data }>();
  for (const invoice of ready.data) {
    const patient = invoice.sessions?.patients;
    const name = patient?.medical_aids?.name ?? "No medical aid";
    const key = patient?.medical_aid_id ?? "none";
    groups.set(key, { name, invoices: [...(groups.get(key)?.invoices ?? []), invoice] });
  }
  const sortedGroups = [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
  const missingPractice = missingPracticeDetails(practice);
  const anyReady = ready.data.some((invoice) => {
    const patient = invoice.sessions?.patients;
    return patient?.medical_aid_id && !missingClaimDetails(patient).length;
  });

  return (
    <main className="py-6">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Claims</h1>
      <p className="text-sm text-neutral-500">
        Send medical aid invoices in one email per medical aid, then record the reference number each one replies with.
      </p>

      {sent && (
        <p role="status" className="mt-4 rounded-md bg-accent/10 px-3 py-2 text-sm text-accent">
          {sent === "1" ? "1 claim batch" : `${sent} claim batches`} sent. Add each reference number when the medical aid
          replies.
        </p>
      )}

      <h2 className="mt-8 mb-3 text-lg font-semibold">Ready to claim</h2>
      {missingPractice.length > 0 && (
        <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Add your {missingPractice.join(" and ")} in <Link href="/settings" className="underline">Settings</Link> before
          sending claims. Medical aids need them on every claim.
        </p>
      )}
      {ready.data.length === 0 ? (
        <p className="text-neutral-500">Nothing to claim. Medical aid invoices appear here after you capture a session.</p>
      ) : (
        // A plain form that opens the preview with the ticked invoices, e.g. /claims/preview?invoice=a&invoice=b.
        <form action="/claims/preview" className="flex flex-col gap-6">
          <div className="-mb-6 hidden gap-3 border-b border-neutral-200 py-2 text-xs font-medium tracking-wide text-neutral-400 uppercase md:flex">
            <span className="size-5 shrink-0" />
            <div className={`grid flex-1 gap-x-6 ${READY_COLS}`}>
              <span>Patient</span>
              <span>Invoice</span>
              <span>Date</span>
              <span>Status</span>
              <span className="text-right">Amount</span>
            </div>
          </div>
          {sortedGroups.map((group) => (
            <section key={group.name}>
              <p className="mb-1 text-sm font-medium text-neutral-500 md:mt-4">{group.name}</p>
              <ul className="divide-y divide-neutral-100 border-y border-neutral-100">
                {group.invoices.map((invoice) => {
                  const patient = invoice.sessions?.patients;
                  const missing = !patient?.medical_aid_id
                    ? ["medical aid"]
                    : missingClaimDetails(patient);
                  const total = invoiceTotal(
                    invoice.invoice_lines.map((line) => ({ quantity: line.quantity, unitPriceCents: line.unit_price_cents })),
                  );
                  return (
                    <li key={invoice.id} className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        name="invoice"
                        value={invoice.id}
                        defaultChecked={missing.length === 0}
                        disabled={missing.length > 0}
                        aria-label={`Claim ${invoiceNumber(invoice.number)}`}
                        className="size-5 shrink-0 accent-accent"
                      />
                      <div className={`${listRow} ${READY_COLS} flex-1`}>
                        <Link href={`/invoices/${invoice.id}`} className="truncate font-medium">
                          {patient ? `${patient.first_name} ${patient.last_name}` : "Unknown patient"}
                        </Link>
                        <p className={`${bottomLeft} text-sm text-neutral-500 md:contents`}>
                          <span>{invoiceNumber(invoice.number)}</span>
                          <span className="md:hidden"> · </span>
                          <span>{friendlyDate(invoice.issued_on)}</span>
                        </p>
                        <p className="col-span-2 text-sm md:col-span-1">
                          {missing.length > 0 && patient ? (
                            <span className="text-amber-700">
                              Needs a {missing.join(" and ")}.{" "}
                              <Link href={`/patients/${patient.id}/edit`} className="underline">Edit patient</Link>
                            </span>
                          ) : (
                            <span className="hidden text-neutral-400 md:inline">Ready</span>
                          )}
                        </p>
                        <span className={`${topRight} font-medium tabular-nums`}>{formatRands(total)}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          <button type="submit" disabled={!anyReady || missingPractice.length > 0} className={`${button} w-full py-3 md:w-auto md:self-start`}>
            Preview claims
          </button>
        </form>
      )}

      <h2 className="mt-12 mb-3 text-lg font-semibold">Sent</h2>
      {batches.data.length === 0 ? (
        <p className="text-neutral-500">No claims sent yet.</p>
      ) : (
        <SentList
          batches={batches.data.map((batch) => ({
            id: batch.id,
            medicalAid: batch.medical_aids?.name ?? "",
            sentAt: batch.sent_at!,
            claims: batch.invoices.length,
            totalCents: batch.invoices.reduce(
              (sum, invoice) =>
                sum +
                invoiceTotal(invoice.invoice_lines.map((line) => ({ quantity: line.quantity, unitPriceCents: line.unit_price_cents }))),
              0,
            ),
            referenceNumber: batch.reference_number,
          }))}
        />
      )}
    </main>
  );
}
