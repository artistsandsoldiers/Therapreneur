import type { Metadata } from "next";
import { button } from "@/app/ui";
import { requireSetUpPractice } from "@/lib/practice";
import { InvoiceList } from "./invoice-list";
import { ModalButton } from "../modal";
import { NewSession } from "../sessions/new-session";
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
      {/* Phone: a big button, used straight after a session. Desktop: a normal button beside the heading. */}
      <div className="md:hidden">
        <ModalButton label="New session" title="New session" className={`${button} block w-full py-4 text-center text-lg`}>
          <NewSession />
        </ModalButton>
      </div>

      <div className="mt-10 mb-3 flex items-center justify-between gap-4 md:mt-0">
        <h1 className="text-lg font-semibold md:text-2xl md:tracking-tight">Invoices</h1>
        <div className="hidden md:block">
          <ModalButton label="New session" title="New session" className={button}>
            <NewSession />
          </ModalButton>
        </div>
      </div>
      {invoices.length === 0 ? (
        <p className="text-neutral-500">
          No invoices yet. Tap New session after your next appointment, and its invoice appears here.
        </p>
      ) : (
        <InvoiceList
          invoices={invoices.map((invoice) => {
            const patient = invoice.sessions?.patients;
            return {
              id: invoice.id,
              number: invoice.number,
              patientName: patient ? `${patient.first_name} ${patient.last_name}` : "Unknown patient",
              issuedOn: invoice.issued_on,
              totalCents: invoiceTotal(
                invoice.invoice_lines.map((line) => ({ quantity: line.quantity, unitPriceCents: line.unit_price_cents })),
              ),
              paid: Boolean(invoice.paid_on),
              toMedicalAid: invoice.bill_to === "medical_aid",
              noShow: invoice.sessions?.outcome === "no_show",
            };
          })}
        />
      )}
    </main>
  );
}
