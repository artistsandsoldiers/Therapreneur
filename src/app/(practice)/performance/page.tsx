import type { Metadata } from "next";
import Link from "next/link";
import { MonthChart } from "./month-chart";
import { formatDate, toLocalInput } from "@/lib/dates";
import { profitByMonth, taxYearSoFar, type ReportExpense } from "@/lib/expenses";
import { invoiceNumber } from "@/lib/invoices";
import { formatRands } from "@/lib/money";
import { requireSetUpPractice } from "@/lib/practice";
import { invoiceTotal } from "@/lib/pricing";
import { AGE_BUCKETS, incomeByMonth, incomeByPatient, outstanding, type ReportInvoice } from "@/lib/performance";

export const metadata: Metadata = { title: "Performance · Therapreneur" };

// Worked out afresh from the practice's invoices every time the page opens.
export const dynamic = "force-dynamic";

export default async function PerformancePage() {
  const { supabase } = await requireSetUpPractice();
  const { data, error } = await supabase
    .from("invoices")
    .select(
      "id, number, issued_on, paid_on, bill_to, claimed_details, invoice_lines(quantity, unit_price_cents), sessions(patients(id, first_name, last_name, medical_aids(name)))",
    );
  if (error) throw error;
  const { data: expenseRows, error: expensesError } = await supabase
    .from("expenses")
    .select("spent_on, amount_cents, expense_categories(name)");
  if (expensesError) throw expensesError;
  const expenses: ReportExpense[] = expenseRows.map((e) => ({
    spentOn: e.spent_on,
    amountCents: e.amount_cents,
    categoryName: e.expense_categories?.name ?? "Other",
  }));

  const invoices: ReportInvoice[] = data.flatMap((invoice) => {
    const patient = invoice.sessions?.patients;
    if (!patient) return [];
    // A claimed invoice keeps the medical aid it was sent to, even if the patient has moved since.
    const claimedAid = (invoice.claimed_details as { medical_aid_name?: string } | null)?.medical_aid_name;
    return [
      {
        id: invoice.id,
        number: invoice.number,
        issuedOn: invoice.issued_on,
        paidOn: invoice.paid_on,
        totalCents: invoiceTotal(
          invoice.invoice_lines.map((line) => ({ quantity: line.quantity, unitPriceCents: line.unit_price_cents })),
        ),
        patientId: patient.id,
        patientName: `${patient.first_name} ${patient.last_name}`,
        medicalAidName: invoice.bill_to === "medical_aid" ? (claimedAid ?? patient.medical_aids?.name ?? "Medical aid") : null,
      },
    ];
  });

  const today = toLocalInput(new Date()).slice(0, 10);
  const months = profitByMonth(incomeByMonth(invoices, today), expenses);
  const year = taxYearSoFar(invoices, expenses, today);
  const patients = incomeByPatient(invoices);
  const owed = outstanding(invoices, today);
  const thisMonth = months.at(-1)!;
  const overSixty = owed.totals.bucketCents[2] + owed.totals.bucketCents[3];

  const th = "py-2 pr-3 text-left text-xs font-medium text-neutral-400 uppercase whitespace-nowrap";
  const thRight = `${th} pr-0 pl-3 text-right`;
  const td = "py-2 pr-3";
  const tdRight = "py-2 pl-3 text-right whitespace-nowrap tabular-nums";

  return (
    <main className="py-6">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Performance</h1>
      <p className="text-sm text-neutral-500">
        Live from your invoices and expenses. An invoice counts as paid once you mark it paid on its page.
      </p>

      {invoices.length === 0 && expenses.length === 0 ? (
        <p className="mt-8 text-neutral-500">No invoices yet. This page fills in as you capture sessions and add expenses.</p>
      ) : (
        <>
          <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-neutral-200 bg-neutral-200 sm:grid-cols-3">
            <Tile label="Invoiced this month" value={formatRands(thisMonth.invoicedCents)} />
            <Tile label="Paid this month" value={formatRands(thisMonth.paidCents)} />
            <Tile
              label="Outstanding"
              value={formatRands(owed.totals.totalCents)}
              detail={overSixty > 0 ? `${formatRands(overSixty)} over 60 days` : `${owed.invoices.length} unpaid`}
              wide
            />
          </dl>

          <section className="mt-10">
            <h2 className="mb-1 text-lg font-semibold">Tax year so far</h2>
            <p className="mb-4 text-sm text-neutral-500">
              From {formatDate(year.from)}. Profit before tax is invoiced income less expenses. Tax hasn&apos;t been taken off.
            </p>
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-neutral-200 bg-neutral-200 sm:grid-cols-3">
              <Tile label="Income" value={formatRands(year.incomeCents)} />
              <Tile label="Expenses" value={formatRands(year.expensesCents)} />
              <Tile label="Profit before tax" value={formatRands(year.profitCents)} wide />
            </dl>
            {year.byCategory.length > 0 ? (
              <>
                <p className="mt-6 mb-1 text-sm font-medium text-neutral-500">Expenses by category</p>
                <ul className="divide-y divide-neutral-100 border-y border-neutral-100 text-sm">
                  {year.byCategory.map((category) => (
                    <li key={category.name} className="flex justify-between gap-4 py-2">
                      <span>{category.name}</span>
                      <span className="tabular-nums">{formatRands(category.cents)}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-4 text-sm text-neutral-500">
                No expenses this tax year yet. <Link href="/expenses/new" className="font-medium text-accent">Add one</Link> to see your profit.
              </p>
            )}
          </section>

          <section className="mt-10">
            <h2 className="mb-1 text-lg font-semibold">Income per month</h2>
            <p className="mb-4 text-sm text-neutral-500">
              Invoiced by invoice date, paid by the date it was paid, expenses by the date you paid them. Last 6 months.
            </p>
            <MonthChart months={months} />
          </section>

          <section className="mt-10">
            <h2 className="mb-1 text-lg font-semibold">Outstanding</h2>
            <p className="mb-3 text-sm text-neutral-500">Unpaid invoices by who pays and how old they are.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200">
                    <th className={th}>Payer</th>
                    {AGE_BUCKETS.map((bucket) => (
                      <th key={bucket} className={thRight}>{bucket}</th>
                    ))}
                    <th className={thRight}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {owed.rows.map((row) => (
                    <tr key={row.payer} className="border-b border-neutral-100">
                      <td className={`${td} whitespace-nowrap`}>{row.payer}</td>
                      {row.bucketCents.map((cents, i) => (
                        <td key={i} className={`${tdRight} ${cents === 0 ? "text-neutral-300" : ""}`}>{formatRands(cents)}</td>
                      ))}
                      <td className={`${tdRight} font-medium`}>{formatRands(row.totalCents)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold">
                    <td className={td}>Total</td>
                    {owed.totals.bucketCents.map((cents, i) => (
                      <td key={i} className={tdRight}>{formatRands(cents)}</td>
                    ))}
                    <td className={tdRight}>{formatRands(owed.totals.totalCents)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {owed.invoices.length > 0 && (
              <>
                <p className="mt-6 mb-1 text-sm font-medium text-neutral-500">Oldest first</p>
                <ul className="divide-y divide-neutral-100 border-y border-neutral-100">
                  {owed.invoices.map((invoice) => (
                    <li key={invoice.id}>
                      <Link href={`/invoices/${invoice.id}`} className="flex items-center justify-between gap-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{invoice.patientName}</p>
                          <p className="text-sm text-neutral-500">
                            {invoiceNumber(invoice.number)} · {invoice.medicalAidName ?? "Cash"} ·{" "}
                            {invoice.days === 1 ? "1 day" : `${invoice.days} days`} old
                          </p>
                        </div>
                        <span className="shrink-0 font-medium tabular-nums">{formatRands(invoice.totalCents)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <section className="mt-10">
            <h2 className="mb-1 text-lg font-semibold">Income per patient</h2>
            <p className="mb-3 text-sm text-neutral-500">All time, biggest first.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200">
                    <th className={th}>Patient</th>
                    <th className={thRight}>Invoiced</th>
                    <th className={thRight}>Paid</th>
                    <th className={thRight}>Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((patient) => (
                    <tr key={patient.patientId} className="border-b border-neutral-100">
                      <td className={td}>
                        <Link href={`/patients/${patient.patientId}`} className="font-medium">{patient.patientName}</Link>
                        <p className="text-xs text-neutral-500">{patient.payerType}</p>
                      </td>
                      <td className={tdRight}>{formatRands(patient.invoicedCents)}</td>
                      <td className={tdRight}>{formatRands(patient.paidCents)}</td>
                      <td className={`${tdRight} ${patient.outstandingCents === 0 ? "text-neutral-300" : ""}`}>
                        {formatRands(patient.outstandingCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function Tile({ label, value, detail, wide }: { label: string; value: string; detail?: string; wide?: boolean }) {
  return (
    <div className={`bg-white p-4 ${wide ? "col-span-2 sm:col-span-1" : ""}`}>
      <dt className="text-sm text-neutral-500">{label}</dt>
      <dd className="mt-1 text-xl font-semibold tracking-tight tabular-nums">{value}</dd>
      {detail && <dd className="mt-0.5 text-xs text-neutral-500">{detail}</dd>}
    </div>
  );
}
