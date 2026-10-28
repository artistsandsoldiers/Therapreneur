import type { Metadata } from "next";
import Link from "next/link";
import { MonthChart } from "./month-chart";
import { PeriodPicker } from "./period-picker";
import { ReferrerPicker } from "./referrer-picker";
import { bottomLeft, list, listHead, listRow, topRight } from "@/app/ui";
import { friendlyDate, toLocalInput } from "@/lib/dates";
import { taxYearStart } from "@/lib/expenses";
import { invoiceNumber } from "@/lib/invoices";
import { formatRands } from "@/lib/money";
import { periodReport, readPeriod } from "@/lib/periods";
import { requireSetUpPractice } from "@/lib/practice";
import { AGE_BUCKETS, forReferrer, outstanding } from "@/lib/performance";
import { loadReferrers } from "@/lib/referrers";
import { loadReportData } from "@/lib/report-data";

const OWED_COLS = "md:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]";

export const metadata: Metadata = { title: "Performance · Therapreneur" };

// Worked out afresh from the practice's invoices every time the page opens.
export const dynamic = "force-dynamic";

const TABS = [
  ["overall", "Overall"],
  ["income", "Income"],
  ["expenses", "Expenses"],
] as const;
type Tab = (typeof TABS)[number][0];

type Params = { tab?: string; referrer?: string; period?: string; month?: string; year?: string; from?: string; to?: string };

export default async function PerformancePage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const { supabase } = await requireSetUpPractice();
  const [{ invoices, expenses }, referrers] = await Promise.all([loadReportData(supabase), loadReferrers(supabase)]);

  const today = toLocalInput(new Date()).slice(0, 10);
  const tab: Tab = TABS.some(([value]) => value === params.tab) ? (params.tab as Tab) : "overall";
  const period = readPeriod(params, today);
  const report = periodReport(invoices, expenses, period);
  // The Income tab can narrow to one referrer's patients. Outstanding stays about everyone who owes money.
  const referrer = params.referrer === "none" || referrers.some((r) => r.id === params.referrer) ? params.referrer! : "";
  const income = referrer ? periodReport(forReferrer(invoices, referrer), expenses, period) : report;
  const owed = outstanding(invoices, today);
  const overSixty = owed.totals.bucketCents[2] + owed.totals.bucketCents[3];

  // Every tax year with something in it, up to this one, newest first.
  const thisYear = Number(taxYearStart(today).slice(0, 4));
  const firstYear = Math.min(
    thisYear,
    ...invoices.map((invoice) => Number(taxYearStart(invoice.issuedOn).slice(0, 4))),
    ...expenses.map((expense) => Number(taxYearStart(expense.spentOn).slice(0, 4))),
  );
  const years = Array.from({ length: thisYear - firstYear + 1 }, (_, i) => thisYear - i);

  // This page's address with some settings changed, keeping the rest. Null removes one.
  const hrefWith = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(Object.entries(params).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
    for (const [name, value] of Object.entries(changes)) {
      if (value === null) next.delete(name);
      else next.set(name, value);
    }
    return `/performance?${next}`;
  };
  const range = `${friendlyDate(period.from)} to ${friendlyDate(period.to)}`;
  const manyMonths = report.months.length > 1;

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
          <nav className="mt-6 flex gap-6 border-b border-neutral-200" aria-label="Performance views">
            {TABS.map(([value, text]) => (
              <Link
                key={value}
                href={hrefWith({ tab: value })}
                scroll={false}
                aria-current={tab === value ? "page" : undefined}
                className={`-mb-px border-b-2 pb-2 text-sm font-medium ${
                  tab === value ? "border-accent text-neutral-900" : "border-transparent text-neutral-500 hover:text-neutral-800"
                }`}
              >
                {text}
              </Link>
            ))}
          </nav>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <PeriodPicker period={period} years={years} />
              {tab === "income" && referrers.length > 0 && <ReferrerPicker value={referrer} referrers={referrers} />}
            </div>
            <p className="text-sm text-neutral-500">{range}</p>
          </div>

          {tab === "overall" && (
            <>
              <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-neutral-200 bg-neutral-200 lg:grid-cols-4">
                <Tile label="Invoiced" value={formatRands(report.invoicedCents)} />
                <Tile label="Paid" value={formatRands(report.paidCents)} />
                <Tile label="Expenses" value={formatRands(report.expensesCents)} />
                <Tile label="Profit before tax" value={formatRands(report.profitCents)} negative={report.profitCents < 0} />
              </dl>
              <p className="mt-2 text-sm text-neutral-500">
                Profit before tax is invoiced income less expenses. Tax hasn&apos;t been taken off.
              </p>
              <dl className="mt-6 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-neutral-200 bg-neutral-200 sm:max-w-sm">
                <Tile
                  label="Outstanding today"
                  value={formatRands(owed.totals.totalCents)}
                  detail={overSixty > 0 ? `${formatRands(overSixty)} over 60 days` : `${owed.invoices.length} unpaid`}
                />
              </dl>
              {manyMonths && (
                <section className="mt-10">
                  <h2 className="mb-1 text-lg font-semibold">Per month</h2>
                  <p className="mb-4 text-sm text-neutral-500">
                    Invoiced by invoice date, paid by the date it was paid, expenses by the date you paid them.
                  </p>
                  <MonthChart months={report.months} />
                </section>
              )}
            </>
          )}

          {tab === "income" && (
            <>
              {referrer && (
                <p className="mt-4 text-sm text-neutral-500">
                  Only patients {referrer === "none" ? "with no referrer" : `referred by ${referrers.find((r) => r.id === referrer)?.name}`}.{" "}
                  <Link href={hrefWith({ referrer: null })} scroll={false} className="font-medium text-accent">Show everyone</Link>
                </p>
              )}
              <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-neutral-200 bg-neutral-200 sm:max-w-md">
                <Tile label="Invoiced" value={formatRands(income.invoicedCents)} />
                <Tile label="Paid" value={formatRands(income.paidCents)} />
              </dl>
              {manyMonths && (
                <section className="mt-10">
                  <h2 className="mb-1 text-lg font-semibold">Per month</h2>
                  <p className="mb-4 text-sm text-neutral-500">Invoiced by invoice date, paid by the date it was paid.</p>
                  <MonthChart months={income.months} />
                </section>
              )}
      {referrers.length > 0 && !referrer && (
        <section className="mt-10">
          <h2 className="mb-1 text-lg font-semibold">Income per referrer</h2>
          <p className="mb-3 text-sm text-neutral-500">Who sent you the patients invoiced in this period. Tap one to see only their patients.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className={th}>Referrer</th>
                  <th className={thRight}>Patients</th>
                  <th className={thRight}>Invoiced</th>
                  <th className={thRight}>Paid</th>
                </tr>
              </thead>
              <tbody>
                {report.referrers.map((row) => (
                  <tr key={row.referrerId ?? "none"} className="border-b border-neutral-100">
                    <td className={td}>
                      <Link href={hrefWith({ referrer: row.referrerId ?? "none" })} scroll={false} className={row.referrerId ? "font-medium" : "text-neutral-500"}>
                        {row.name}
                      </Link>
                    </td>
                    <td className={tdRight}>{row.patientCount}</td>
                    <td className={tdRight}>{formatRands(row.invoicedCents)}</td>
                    <td className={tdRight}>{formatRands(row.paidCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <section className="mt-10">
        <h2 className="mb-1 text-lg font-semibold">Income per patient</h2>
        <p className="mb-3 text-sm text-neutral-500">
          {income.patients.length ? "Patients invoiced in this period, biggest first." : "No patients invoiced in this period."}
        </p>
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
              {income.patients.map((patient) => (
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
      <section className="mt-10">
        <h2 className="mb-1 text-lg font-semibold">Outstanding</h2>
        <p className="mb-3 text-sm text-neutral-500">Everything unpaid as at today, whatever period you pick, by who pays and how old it is.</p>
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
            <div className={`${listHead} ${OWED_COLS}`}>
              <span>Patient</span>
              <span>Invoice</span>
              <span>Payer</span>
              <span>Age</span>
              <span className="text-right">Amount</span>
            </div>
            <ul className={list}>
              {owed.invoices.map((invoice) => (
                <li key={invoice.id}>
                  <Link href={`/invoices/${invoice.id}`} className={`${listRow} ${OWED_COLS}`}>
                    <p className="truncate font-medium">{invoice.patientName}</p>
                    <p className={`${bottomLeft} text-sm text-neutral-500 md:contents`}>
                      <span>{invoiceNumber(invoice.number)}</span>
                      <span className="md:hidden"> · </span>
                      <span className="truncate">{invoice.medicalAidName ?? "Patient"}</span>
                      <span className="md:hidden"> · </span>
                      <span>{invoice.days === 1 ? "1 day" : `${invoice.days} days`} old</span>
                    </p>
                    <span className={`${topRight} font-medium tabular-nums`}>{formatRands(invoice.totalCents)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

            </>
          )}

          {tab === "expenses" && (
            <>
              <dl className="mt-6 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-neutral-200 bg-neutral-200 sm:max-w-sm">
                <Tile label="Expenses" value={formatRands(report.expensesCents)} />
              </dl>
              {report.byCategory.length === 0 ? (
                <p className="mt-6 text-sm text-neutral-500">
                  No expenses in this period. <Link href="/expenses/new" className="font-medium text-accent">Add one</Link>
                </p>
              ) : (
                <div className="lg:grid lg:grid-cols-2 lg:gap-10">
                  <section className="mt-10">
                    <h2 className="mb-3 text-lg font-semibold">By category</h2>
                    <ul className="divide-y divide-neutral-100 border-y border-neutral-100 text-sm">
                      {report.byCategory.map((category) => (
                        <li key={category.name} className="py-2">
                          <div className="flex justify-between gap-4">
                            <span>{category.name}</span>
                            <span className="tabular-nums">{formatRands(category.cents)}</span>
                          </div>
                          <div className="mt-1 h-1 rounded-full bg-neutral-100">
                            <div
                              className="h-1 rounded-full bg-accent"
                              style={{ width: `${(category.cents / report.expensesCents) * 100}%` }}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                  {manyMonths && (
                    <section className="mt-10">
                      <h2 className="mb-3 text-lg font-semibold">By month</h2>
                      <ul className="divide-y divide-neutral-100 border-y border-neutral-100 text-sm">
                        {[...report.months].reverse().map((month) => (
                          <li key={month.month} className="flex justify-between gap-4 py-2">
                            <span>{friendlyMonth(month.month)}</span>
                            <span className={`tabular-nums ${month.expensesCents === 0 ? "text-neutral-300" : ""}`}>
                              {formatRands(month.expensesCents)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                </div>
              )}
              <p className="mt-6 text-sm">
                <Link href="/expenses" className="font-medium text-accent">See every expense</Link>
              </p>
            </>
          )}
        </>
      )}
    </main>
  );
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "2026-10" -> "October 2026" */
function friendlyMonth(month: string): string {
  return `${MONTH_NAMES[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;
}

function Tile({ label, value, detail, negative }: { label: string; value: string; detail?: string; negative?: boolean }) {
  return (
    <div className="bg-white p-4">
      <dt className="text-sm text-neutral-500">{label}</dt>
      <dd className={`mt-1 text-xl font-semibold tracking-tight tabular-nums ${negative ? "text-red-600" : ""}`}>{value}</dd>
      {detail && <dd className="mt-0.5 text-xs text-neutral-500">{detail}</dd>}
    </div>
  );
}
