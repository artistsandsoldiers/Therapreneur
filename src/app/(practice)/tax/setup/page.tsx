import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { firstRecordDate, loadTaxYear } from "../data";
import { TaxSetupForm } from "./tax-setup-form";
import { narrow } from "@/app/ui";
import { toLocalInput } from "@/lib/dates";
import { requireSetUpPractice } from "@/lib/practice";
import { dueDates, taxYearDates, taxYearName, taxYearOf } from "@/lib/tax";

export const metadata: Metadata = { title: "Set up your tax estimate · Therapreneur" };

export default async function TaxSetupPage() {
  const { supabase, practice } = await requireSetUpPractice();
  if (practice.business_type === "inc") redirect("/tax");

  const today = toLocalInput(new Date()).slice(0, 10);
  const year = taxYearOf(today);
  const taxYear = await loadTaxYear(supabase, year);
  const { start } = taxYearDates(year);
  const recordsFrom = taxYear.row?.records_from ?? (await firstRecordDate(supabase, year)) ?? today;
  const editing = practice.tax_estimate_on && taxYear.row !== null;
  const amount = (kind: string, field: "yearlyCents" | "payeCents" = "yearlyCents") =>
    taxYear.otherIncome.find((i) => i.kind === kind)?.[field] ?? null;

  return (
    <main className={`py-6 ${narrow}`}>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">{editing ? "Your tax answers" : "Set up your tax estimate"}</h1>
      <p className="mb-8 text-neutral-500">
        A few questions about the {taxYearName(year)} tax year. Rough figures are fine, and you can change any answer later.
      </p>
      <TaxSetupForm
        yearStart={start}
        recordsFrom={recordsFrom > start ? recordsFrom : null}
        firstDue={dueDates(year).first}
        today={today}
        askPayment={taxYear.payments.length === 0}
        editing={editing}
        initial={{
          date_of_birth: practice.date_of_birth,
          income_before: taxYear.row?.income_before_cents ?? null,
          expenses_before: taxYear.row?.expenses_before_cents ?? null,
          medical_aid_members: taxYear.row?.medical_aid_members ?? null,
          retirement_annuity_monthly: taxYear.row?.retirement_annuity_monthly_cents ?? null,
          salary: amount("salary"),
          paye: amount("salary", "payeCents"),
          interest: amount("interest"),
          rent: amount("rent"),
          other_income: amount("other"),
          last_taxable_income: taxYear.row?.last_taxable_income_cents ?? null,
          profit_override: taxYear.row?.profit_override_cents ?? null,
        }}
      />
    </main>
  );
}
