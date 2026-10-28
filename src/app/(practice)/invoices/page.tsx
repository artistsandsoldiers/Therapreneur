import type { Metadata } from "next";
import Link from "next/link";
import { bottomLeft, bottomRight, button, list, listHead, listRow, topRight } from "@/app/ui";
import { formatDate } from "@/lib/dates";
import { invoiceNumber } from "@/lib/invoices";
import { formatRands } from "@/lib/money";
import { requireSetUpPractice } from "@/lib/practice";
import { invoiceTotal } from "@/lib/pricing";

export const metadata: Metadata = { title: "Invoices · Therapreneur" };

export default async function InvoicesPage() {
  const { supabase } = await requireSetUpPractice();
  const { data: invoices, error } = await supabase
    .from("invoices")
    .select(
      "id, number, issued_on, paid_on, bill_to, invoice_lines(quantity, unit_price_cents), sessions(outcome, patients(first_name, last_name))",
    )
    .order("number", { ascending: false });
  if (error) throw error;

  const cols = "md:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]";

  return (
    <main className="py-6">
      {/* Phone: a big button, used straight after a session. Desktop: a normal button beside the heading. */}
      <Link href="/sessions/new" className={`${button} block w-full py-4 text-center text-lg md:hidden`}>
        New session
      </Link>

      <div className="mt-10 mb-3 flex items-center justify-between gap-4 md:mt-0">
        <h1 className="text-lg font-semibold md:text-2xl md:tracking-tight">Invoices</h1>
        <Link href="/sessions/new" className={`${button} hidden md:block`}>New session</Link>
      </div>
      {invoices.length === 0 ? (
        <p className="text-neutral-500">
          No invoices yet. Tap New session after your next appointment, and its invoice appears here.
        </p>
      ) : (
        <>
          <div className={`${listHead} ${cols}`}>
            <span>Patient</span>
            <span>Invoice</span>
            <span>Date</span>
            <span className="text-right">Amount</span>
            <span className="text-right">Status</span>
          </div>
          <ul className={list}>
            {invoices.map((invoice) => {
              const patient = invoice.sessions?.patients;
              const total = invoiceTotal(
                invoice.invoice_lines.map((line) => ({ quantity: line.quantity, unitPriceCents: line.unit_price_cents })),
              );
              return (
                <li key={invoice.id}>
                  <Link href={`/invoices/${invoice.id}`} className={`${listRow} ${cols}`}>
                    <p className="truncate font-medium">
                      {patient ? `${patient.first_name} ${patient.last_name}` : "Unknown patient"}
                    </p>
                    <p className={`${bottomLeft} text-sm text-neutral-500 md:contents`}>
                      <span>{invoiceNumber(invoice.number)}</span>
                      <span className="md:hidden"> · </span>
                      <span>
                        {formatDate(invoice.issued_on)}
                        {invoice.sessions?.outcome === "no_show" && " · No-show"}
                      </span>
                    </p>
                    <p className={`${topRight} font-medium tabular-nums`}>{formatRands(total)}</p>
                    <p className={`${bottomRight} text-sm ${invoice.paid_on ? "text-accent" : "text-neutral-400"}`}>
                      {invoice.paid_on ? "Paid" : "Outstanding"}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </main>
  );
}
