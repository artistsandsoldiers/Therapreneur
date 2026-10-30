import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { turnOffTaxEstimate } from "./actions";
import { carryForward, estimateFor, loadTaxYear } from "./data";
import { Payments } from "./payments";
import { Timeline } from "./timeline";
import { button } from "@/app/ui";
import { formatDate, toLocalInput } from "@/lib/dates";
import { formatRands } from "@/lib/money";
import { requireSetUpPractice } from "@/lib/practice";
import { dueDates, paymentTimeline, roughly, taxYearDates, taxYearName, taxYearOf, type PaymentKind, type TaxEstimate } from "@/lib/tax";

export const metadata: Metadata = { title: "Tax · Therapreneur" };

// Worked out afresh from the practice's invoices and expenses every time the page opens.
export const dynamic = "force-dynamic";

const PAYMENT_NAMES: Record<PaymentKind, string> = {
  first: "your first provisional tax payment",
  second: "your second provisional tax payment",
  "top-up": "a top-up payment",
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "Friday 26 February 2027" */
function longDate(date: string): string {
  const day = new Date(`${date}T00:00:00Z`);
  return `${WEEKDAYS[day.getUTCDay()]} ${day.getUTCDate()} ${MONTHS[day.getUTCMonth()]} ${day.getUTCFullYear()}`;
}

const about = (cents: number) => formatRands(roughly(cents)).replace(/\.00$/, "");

export default async function TaxPage() {
  const { supabase, practice } = await requireSetUpPractice();

  if (practice.business_type === "inc") {
    return (
      <Shell>
        <p className="mt-6 text-neutral-600">
          The tax estimate is for sole proprietors only, for now. An Inc pays company tax on different forms, so your tax practitioner
          is the best person to work it out. If your practice isn&apos;t an Inc, change it in{" "}
          <Link href="/settings" className="underline">Settings</Link>.
        </p>
      </Shell>
    );
  }

  if (!practice.tax_estimate_on) {
    return (
      <Shell>
        <div className="mt-6 max-w-xl rounded-lg border border-neutral-200 p-5">
          <h2 className="text-lg font-semibold">Know what to put aside for SARS</h2>
          <p className="mt-2 text-neutral-600">
            We estimate your provisional tax from your invoices and expenses, and tell you how much to put aside each month so the
            next payment isn&apos;t a shock. It takes a few questions, and a couple of minutes.
          </p>
          <Link href="/tax/setup" className={`${button} mt-4 inline-block`}>Set up my tax estimate</Link>
        </div>
      </Shell>
    );
  }

  const today = toLocalInput(new Date()).slice(0, 10);
  const year = taxYearOf(today);
  let current = await loadTaxYear(supabase, year);
  if (!current.row) {
    if (!(await carryForward(supabase, practice.id, year))) redirect("/tax/setup");
    current = await loadTaxYear(supabase, year);
  }
  const estimate = await estimateFor(supabase, year, { ...current, row: current.row! }, practice, today);

  // Between March and September, last year may still need a top-up.
  const lastYearOpen = today <= dueDates(year - 1)["top-up"];
  const last = lastYearOpen ? await loadTaxYear(supabase, year - 1) : null;
  const lastEstimate = last?.row
    ? await estimateFor(supabase, year - 1, { ...last, row: last.row }, practice, today)
    : null;

  const payments = [
    ...current.payments.map((p) => ({ ...p, year })),
    ...(last?.payments ?? []).map((p) => ({ ...p, year: year - 1 })),
  ]
    .sort((a, b) => b.paid_on.localeCompare(a.paid_on))
    .map((p) => ({ id: p.id, paidOn: p.paid_on, amountCents: p.amount_cents, yearName: taxYearName(p.year) }));

  return (
    <Shell year={year}>
      <div className="mt-6">
        <Timeline {...paymentTimeline(year, today, estimate.next, current.payments)} next={estimate.next} />
      </div>
      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-8">
          <Headline estimate={estimate} />
          {lastEstimate?.next && lastEstimate.next.amountCents > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
              <p className="font-medium">Last tax year ({taxYearName(year - 1)}) may need a top-up</p>
              <p className="mt-1 text-neutral-700">
                Your {taxYearName(year - 1)} tax comes to about {about(lastEstimate.provisionalCents)}, and you&apos;ve paid{" "}
                {formatRands(lastEstimate.paidCents)}. Paying the other {about(lastEstimate.next.amountCents)} by{" "}
                {longDate(lastEstimate.next.due)} stops SARS charging interest on it.
              </p>
            </div>
          )}
          <Working estimate={estimate} recordsFrom={current.row!.records_from} year={year} />
        </div>

        <div className="flex flex-col gap-8">
          <section>
            <h2 className="mb-3 text-lg font-semibold">Payments to SARS</h2>
            <Payments
              payments={payments}
              today={today}
              years={[
                { year, text: `${taxYearName(year)} (this tax year)` },
                ...(lastYearOpen ? [{ year: year - 1, text: `${taxYearName(year - 1)} (top-up for last year)` }] : []),
              ]}
            />
          </section>
          <section className="text-sm">
            <h2 className="mb-2 text-lg font-semibold">Your answers</h2>
            <p className="text-neutral-600">
              Your age, medical aid, retirement annuity, other income and your figures from before you used Therapreneur.
            </p>
            <Link href="/tax/setup" className="mt-2 inline-block underline">Change your answers</Link>
          </section>
          <p className="text-sm text-neutral-500">
            This is an estimate from what you&apos;ve recorded, not tax advice. Check it with your tax practitioner before you pay.
            It counts every expense in full and leaves out travel, wear and tear on equipment, the extra medical expenses credit,
            capital gains and donations.
          </p>
          <form action={turnOffTaxEstimate}>
            <button type="submit" className="text-sm text-neutral-500 underline">Turn off the tax estimate</button>
          </form>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ year, children }: { year?: number; children: React.ReactNode }) {
  return (
    <main className="py-6">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Tax</h1>
      {year !== undefined && (
        <p className="text-sm text-neutral-500">
          Your provisional tax for the {taxYearName(year)} tax year, estimated from your invoices and expenses.
        </p>
      )}
      {children}
    </main>
  );
}

function Headline({ estimate }: { estimate: TaxEstimate }) {
  const next = estimate.next;
  return (
    <div className="rounded-lg border border-neutral-200 p-5">
      {next && next.amountCents > 0 ? (
        <>
          <p className="text-sm text-neutral-500">Put aside about</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
            {about(next.monthlyCents)} <span className="text-lg font-normal text-neutral-500">a month</span>
          </p>
          <p className="mt-3 text-neutral-700">
            to pay SARS about <strong>{about(next.amountCents)}</strong> by {longDate(next.due)}, {PAYMENT_NAMES[next.kind]}.
          </p>
        </>
      ) : (
        <>
          <p className="text-xl font-semibold tracking-tight">Nothing more to pay for now</p>
          <p className="mt-2 text-neutral-700">
            {next
              ? `What you've paid covers ${PAYMENT_NAMES[next.kind]}, due ${longDate(next.due)}.`
              : "This tax year's payments are done."}{" "}
            Your tax for the whole year comes to about {about(estimate.yearTaxCents)}.
          </p>
        </>
      )}
      {estimate.penaltySafeCents !== null && (
        <p className="mt-3 border-t border-neutral-100 pt-3 text-sm text-neutral-600">
          To be safe from SARS&apos;s underestimate penalty, make sure your payments for the year add up to at least{" "}
          {about(estimate.penaltySafeCents)}. That&apos;s based on last year&apos;s taxable income.
        </p>
      )}
      {!estimate.tableExact && (
        <p className="mt-3 text-sm text-amber-700">We haven&apos;t added this year&apos;s SARS tax tables yet, so this uses last year&apos;s.</p>
      )}
    </div>
  );
}

function Working({ estimate: e, recordsFrom, year }: { estimate: TaxEstimate; recordsFrom: string; year: number }) {
  const { start } = taxYearDates(year);
  const rows: [string, number, "add" | "less" | "total"][] = [
    [
      e.usedOverride
        ? "Your own figure for the year's profit"
        : e.daysSoFar < e.daysInYear
          ? `Profit so far (${e.daysSoFar} of ${e.daysInYear} days), stretched to a full year`
          : "Profit for the year",
      e.businessProfitCents,
      "add",
    ],
  ];
  if (e.otherIncomeCents > 0) rows.push(["Other income", e.otherIncomeCents, "add"]);
  if (e.interestExemptCents > 0) rows.push(["Interest that's tax-free", e.interestExemptCents, "less"]);
  if (e.retirementDeductionCents > 0) rows.push(["Retirement annuity", e.retirementDeductionCents, "less"]);
  rows.push(["Taxable income", e.taxableIncomeCents, "total"]);
  rows.push(["Tax from SARS's tables", e.taxBeforeRebatesCents, "add"]);
  rows.push([e.age !== null && e.age >= 65 ? "Rebates, including for your age" : "Rebate everyone gets", Math.min(e.rebatesCents, e.taxBeforeRebatesCents), "less"]);
  if (e.medicalCreditCents > 0) rows.push(["Medical aid credit", e.medicalCreditCents, "less"]);
  rows.push(["Tax for the year", e.yearTaxCents, "total"]);
  if (e.payeCents > 0) rows.push(["PAYE your employer pays for you", Math.min(e.payeCents, e.yearTaxCents), "less"]);
  if (e.payeCents > 0) rows.push(["Provisional tax for the year", e.provisionalCents, "total"]);
  if (e.next?.kind === "first") rows.push(["Half of it is due at the first payment", Math.round(e.provisionalCents / 2), "total"]);
  if (e.paidCents > 0) rows.push(["Paid so far", e.paidCents, "less"]);

  return (
    <section>
      <h2 className="mb-1 text-lg font-semibold">How we worked it out</h2>
      {!e.usedOverride && (
        <p className="mb-3 text-sm text-neutral-500">
          Profit is what you invoiced less what you spent, from {formatDate(start)}
          {recordsFrom > start ? `, with your own figures for before ${formatDate(recordsFrom)}` : ""}. So far that&apos;s{" "}
          {formatRands(e.profitSoFarCents)}.
        </p>
      )}
      <table className="w-full text-sm">
        <tbody>
          {rows.map(([text, cents, kind]) => (
            <tr key={text} className={kind === "total" ? "border-t border-neutral-200 font-medium" : ""}>
              <td className="py-2 pr-3">{text}</td>
              <td className="py-2 pl-3 text-right whitespace-nowrap tabular-nums">
                {kind === "less" ? `– ${formatRands(cents)}` : formatRands(cents)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
