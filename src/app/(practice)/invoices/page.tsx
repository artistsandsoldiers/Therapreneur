import type { Metadata } from "next";
import Link from "next/link";
import { button } from "@/app/ui";
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

  return (
    <main className="py-6">
      <Link href="/sessions/new" className={`${button} block w-full py-4 text-center text-lg`}>
        New session
      </Link>

      <h1 className="mt-10 mb-3 text-lg font-semibold">Invoices</h1>
      {invoices.length === 0 ? (
        <p className="text-neutral-500">
          No invoices yet. Tap New session after your next appointment, and its invoice appears here.
        </p>
      ) : (
        <ul className="divide-y divide-neutral-100 border-y border-neutral-100">
          {invoices.map((invoice) => {
            const patient = invoice.sessions?.patients;
            const total = invoiceTotal(
              invoice.invoice_lines.map((line) => ({ quantity: line.quantity, unitPriceCents: line.unit_price_cents })),
            );
            return (
              <li key={invoice.id}>
                <Link href={`/invoices/${invoice.id}`} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {patient ? `${patient.first_name} ${patient.last_name}` : "Unknown patient"}
                    </p>
                    <p className="text-sm text-neutral-500">
                      {invoiceNumber(invoice.number)} · {formatDate(invoice.issued_on)}
                      {invoice.sessions?.outcome === "no_show" && " · No-show"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-medium">{formatRands(total)}</p>
                    <p className={`text-sm ${invoice.paid_on ? "text-accent" : "text-neutral-400"}`}>
                      {invoice.paid_on ? "Paid" : "Outstanding"}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
