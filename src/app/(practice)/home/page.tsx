import type { Metadata } from "next";
import Link from "next/link";
import { ModalButton } from "../modal";
import { NewSession } from "../sessions/new-session";
import { estimateFor, loadTaxYear } from "../tax/data";
import { button } from "@/app/ui";
import { friendlyDate, toLocalInput } from "@/lib/dates";
import { sessionEnd } from "@/lib/calendar";
import { greeting, homeSummary } from "@/lib/home";
import { formatRands } from "@/lib/money";
import { outstanding } from "@/lib/performance";
import { requireSetUpPractice, type Practice } from "@/lib/practice";
import { invoiceTotal } from "@/lib/pricing";
import { loadOutstandingClaims } from "@/lib/reconciliation";
import { loadReportData } from "@/lib/report-data";
import type { createClient } from "@/lib/supabase/server";
import { roughly, taxYearOf } from "@/lib/tax";

export const metadata: Metadata = { title: "Home · Therapreneur" };

// Live from the practice's records every time it opens.
export const dynamic = "force-dynamic";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY = 24 * 60 * 60 * 1000;

// A tile is flagged when it needs doing: claims waiting to go, or a tax payment due within this many days.
const TAX_SOON_DAYS = 30;

const about = (cents: number) => formatRands(roughly(cents)).replace(/\.00$/, "");
const whole = (cents: number) => formatRands(cents).replace(/\.\d\d$/, "");

export default async function HomePage() {
  const { supabase, practice } = await requireSetUpPractice();
  const now = new Date();
  const today = toLocalInput(now).slice(0, 10);

  const [{ invoices, expenses }, toClaim, waiting, patients, tax, booked] = await Promise.all([
    loadReportData(supabase),
    supabase.from("invoices").select("invoice_lines(quantity, unit_price_cents)").eq("bill_to", "medical_aid").is("claim_batch_id", null),
    loadOutstandingClaims(supabase),
    supabase.from("patients").select("created_at, past_since"),
    taxTile(supabase, practice, today),
    supabase.from("sessions").select("starts_at, duration_minutes").is("outcome", null).lt("starts_at", now.toISOString()),
  ]);
  if (booked.error) throw booked.error;
  if (toClaim.error) throw toClaim.error;
  if (patients.error) throw patients.error;

  const summary = homeSummary(invoices, expenses, today);
  const owed = outstanding(invoices, today);
  const toClaimCents = sum(toClaim.data.map((invoice) => totalOf(invoice.invoice_lines)));
  const waitingCents = sum(waiting.map((claim) => claim.totalCents));
  const currentPatients = patients.data.filter((p) => !p.past_since).length;
  const newPatients = patients.data.filter((p) => toLocalInput(new Date(p.created_at)).startsWith(today.slice(0, 7))).length;
  const toCapture = booked.data.filter((s) => sessionEnd(s.starts_at, s.duration_minutes) <= now.getTime()).length;
  const change = summary.paidThisMonthCents - summary.paidLastMonthCents;

  return (
    <main className="py-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-neutral-500">{friendlyDate(today, now).replace(/^Today, /, "")}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {greeting(now)}
            {practice.first_name ? `, ${practice.first_name}` : ""}
          </h1>
        </div>
        <ModalButton label="New session" title="New session" className={`${button} w-full sm:w-auto`}>
          <NewSession />
        </ModalButton>
      </div>

      {/* Room above the tiles for a to-do strip later (yearly tax check, missing notes). Nothing goes here yet. */}

      {/* Phone: one column, the tiles that need doing first. Desktop: a bento grid of four columns. */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4 lg:grid-flow-dense">
        <Tile href="/performance?tab=income&period=month" title="Income this month" className="order-3 md:col-span-2 md:order-none lg:row-span-2">
          <Big>{formatRands(summary.paidThisMonthCents)}</Big>
          <Detail>
            {summary.paidLastMonthCents === 0 && summary.paidThisMonthCents === 0
              ? "Nothing paid yet this month or last."
              : `${whole(Math.abs(change))} ${change >= 0 ? "more" : "less"} than last month's ${whole(summary.paidLastMonthCents)}`}
          </Detail>
          <Bars months={summary.paidByMonth} />
        </Tile>

        <Tile href="/calendar" title="Sessions to capture" flagged={toCapture > 0} className="order-1 md:order-none">
          <Big>{toCapture === 0 ? "None" : plural(toCapture, "session")}</Big>
          <Detail>{toCapture === 0 ? "Every booked session so far is captured." : "Booked sessions that are over. Capture them to invoice."}</Detail>
        </Tile>

        <Tile href="/tax" title="Tax" flagged={tax.soon} className="order-2 md:order-none">
          {tax.big && <Big>{tax.big}</Big>}
          <Detail>{tax.detail}</Detail>
        </Tile>

        <Tile href="/performance?tab=income" title="Owed to you" className="order-4 md:order-none lg:col-span-2">
          <Big>{formatRands(owed.totals.totalCents)}</Big>
          <Detail>
            {owed.invoices.length === 0
              ? "Every invoice is paid."
              : owed.totals.bucketCents[3] > 0
                ? <span className="text-red-600">{formatRands(owed.totals.bucketCents[3])} is over 90 days old</span>
                : `${plural(owed.invoices.length, "unpaid invoice")}, none over 90 days`}
          </Detail>
        </Tile>

        <Tile href="/claims" title="Claims to send" flagged={toClaim.data.length > 0} className="order-1 md:order-none lg:col-span-2">
          <Big>{toClaim.data.length === 0 ? "None" : plural(toClaim.data.length, "invoice")}</Big>
          <Detail>{toClaim.data.length === 0 ? "Nothing to claim from medical aids." : `${formatRands(toClaimCents)} to claim from medical aids`}</Detail>
        </Tile>

        <Tile href="/reconcile" title="Waiting on medical aids" className="order-5 md:order-none lg:col-span-2">
          <Big>{formatRands(waitingCents)}</Big>
          <Detail>{waiting.length === 0 ? "No claims waiting to be paid." : `${plural(waiting.length, "claim")} sent, not paid yet`}</Detail>
        </Tile>

        <Tile href="/invoices" title="Invoices this month" className="order-6 md:order-none">
          <Big>{summary.invoicesThisMonth}</Big>
          <Detail>{summary.invoicesThisMonth === 0 ? "No sessions invoiced yet." : `${formatRands(summary.invoicedThisMonthCents)} invoiced`}</Detail>
        </Tile>

        <Tile href="/patients" title="Patients" className="order-7 md:order-none">
          <Big>{currentPatients}</Big>
          <Detail>{newPatients === 0 ? "No new patients this month." : `${newPatients} new this month`}</Detail>
        </Tile>

        <Tile href="/expenses" title="Expenses this month" className="order-8 md:order-none lg:col-span-2">
          <Big>{formatRands(summary.expensesThisMonthCents)}</Big>
          <Detail>
            Profit before tax this tax year:{" "}
            <span className={summary.profitThisTaxYearCents < 0 ? "text-red-600" : "text-neutral-800"}>
              {formatRands(summary.profitThisTaxYearCents)}
            </span>
          </Detail>
        </Tile>
      </div>
    </main>
  );
}

/** What the Tax tile says, following the Tax page: set it up, start the new year, or the next payment to SARS. */
async function taxTile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  practice: Practice,
  today: string,
): Promise<{ big: string | null; detail: string; soon: boolean }> {
  if (practice.business_type === "inc") return { big: null, detail: "The tax estimate is for sole proprietors, for now.", soon: false };
  if (!practice.tax_estimate_on) return { big: "Set up your tax estimate", detail: "Know what to put aside for SARS each month.", soon: false };

  const year = taxYearOf(today);
  const taxYear = await loadTaxYear(supabase, year);
  if (!taxYear.row) return { big: "New tax year", detail: "Open Tax to start this year's estimate.", soon: false };

  const { next } = await estimateFor(supabase, year, { ...taxYear, row: taxYear.row }, practice.date_of_birth, today);
  if (!next || next.amountCents === 0) {
    return { big: "Nothing to pay for now", detail: next ? `Next payment due ${friendlyDate(next.due)}.` : "This tax year's payments are done.", soon: false };
  }
  const days = Math.round((Date.parse(next.due) - Date.parse(today)) / DAY);
  return {
    big: `${about(next.monthlyCents)} a month`,
    detail: `Put aside to pay about ${about(next.amountCents)} by ${friendlyDate(next.due)}${days > 6 ? `, ${days} days away` : ""}.`,
    soon: days <= TAX_SOON_DAYS,
  };
}

function Tile({
  href,
  title,
  flagged,
  className,
  children,
}: {
  href: string;
  title: string;
  flagged?: boolean;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`group flex flex-col rounded-xl border border-neutral-200 p-5 transition-colors hover:border-neutral-300 hover:bg-neutral-50/60 ${className}`}
    >
      <span className="flex items-center gap-2 text-sm text-neutral-500">
        {title}
        {flagged && <span className="size-2 rounded-full bg-accent" aria-label="Needs doing" />}
        <span className="ml-auto text-neutral-300 transition-colors group-hover:text-neutral-500" aria-hidden>→</span>
      </span>
      {children}
    </Link>
  );
}

function Big({ children }: { children: React.ReactNode }) {
  return <span className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{children}</span>;
}

function Detail({ children }: { children: React.ReactNode }) {
  return <span className="mt-1 text-sm text-neutral-500">{children}</span>;
}

/** Paid per month for the last six months, this month in the accent. */
function Bars({ months }: { months: { month: string; cents: number }[] }) {
  const max = Math.max(...months.map((m) => m.cents), 1);
  return (
    <span className="mt-6 flex flex-1 flex-col justify-end" aria-hidden>
      <span className="flex h-28 items-end gap-2 border-b border-neutral-200 lg:h-auto lg:min-h-28 lg:flex-1">
        {months.map((m, i) => (
          <span
            key={m.month}
            title={`${MONTHS[Number(m.month.slice(5, 7)) - 1]}: ${formatRands(m.cents)}`}
            className={`flex-1 rounded-t ${i === months.length - 1 ? "bg-accent" : "bg-neutral-200"}`}
            style={{ height: m.cents === 0 ? 0 : `max(${(m.cents / max) * 100}%, 2px)` }}
          />
        ))}
      </span>
      <span className="mt-1 flex gap-2 text-xs text-neutral-400">
        {months.map((m) => (
          <span key={m.month} className="flex-1 text-center">{MONTHS[Number(m.month.slice(5, 7)) - 1]}</span>
        ))}
      </span>
    </span>
  );
}

function totalOf(lines: { quantity: number; unit_price_cents: number }[]): number {
  return invoiceTotal(lines.map((line) => ({ quantity: line.quantity, unitPriceCents: line.unit_price_cents })));
}

function sum(cents: number[]): number {
  return cents.reduce((total, c) => total + c, 0);
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}
