"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveTaxAnswers, type TaxFormState } from "../actions";
import { button, field, label, secondaryButton } from "@/app/ui";
import { formatDate } from "@/lib/dates";

type Initial = Record<
  | "income_before"
  | "expenses_before"
  | "medical_aid_members"
  | "retirement_annuity_monthly"
  | "salary"
  | "paye"
  | "interest"
  | "rent"
  | "other_income"
  | "last_taxable_income"
  | "profit_override",
  number | null
> & { date_of_birth: string | null };

/**
 * The tax questions, one per screen so nobody faces a tax form. Every step stays in the one form, so going back and
 * forth keeps what was typed.
 */
export function TaxSetupForm({
  yearStart,
  recordsFrom,
  firstDue,
  today,
  askPayment,
  editing,
  initial,
}: {
  yearStart: string;
  /** Where the app's records start, when that's after 1 March. */
  recordsFrom: string | null;
  firstDue: string;
  today: string;
  askPayment: boolean;
  editing: boolean;
  initial: Initial;
}) {
  const [state, action, saving] = useActionState<TaxFormState, FormData>(saveTaxAnswers, {});
  const [step, setStep] = useState(0);
  const rands = (cents: number | null) => (cents === null || cents === 0 ? "" : String(cents / 100));
  const dayBefore = recordsFrom ? new Date(Date.parse(recordsFrom) - 86_400_000).toISOString().slice(0, 10) : null;

  const steps: { title: string; body: React.ReactNode }[] = [
    {
      title: "When were you born?",
      body: (
        <>
          <Hint>SARS takes off more tax from 65, and more again from 75.</Hint>
          <input name="date_of_birth" type="date" max={today} defaultValue={initial.date_of_birth ?? ""} aria-label="Date of birth" className={field} />
        </>
      ),
    },
    ...(dayBefore
      ? [
          {
            title: "Before you used Therapreneur",
            body: (
              <>
                <Hint>
                  Your records here start on {formatDate(recordsFrom!)}. From {formatDate(yearStart)} to {formatDate(dayBefore)}, roughly
                  how much did you invoice, and how much did you spend on your practice? Your old invoicing app or spreadsheet will
                  have this.
                </Hint>
                <Money name="income_before" label="Invoiced (R)" initial={rands(initial.income_before)} />
                <Money name="expenses_before" label="Spent on the practice (R)" initial={rands(initial.expenses_before)} />
              </>
            ),
          },
        ]
      : []),
    {
      title: "Are you on a medical aid?",
      body: (
        <>
          <Hint>
            How many people are on the medical aid you pay for, including you? SARS gives a credit for each person. Leave it blank if
            you&apos;re not on one, or if someone else pays for it.
          </Hint>
          <input
            name="medical_aid_members"
            inputMode="numeric"
            pattern="[0-9]{1,2}"
            defaultValue={initial.medical_aid_members ? String(initial.medical_aid_members) : ""}
            placeholder="0"
            aria-label="People on your medical aid"
            className={field}
          />
        </>
      ),
    },
    {
      title: "Do you pay into a retirement annuity?",
      body: (
        <>
          <Hint>What you put in each month lowers your tax. Leave it blank if you don&apos;t have one.</Hint>
          <Money name="retirement_annuity_monthly" label="Each month (R)" initial={rands(initial.retirement_annuity_monthly)} />
        </>
      ),
    },
    {
      title: "Any other income this tax year?",
      body: (
        <>
          <Hint>Rough amounts for the whole tax year. Leave blank whatever doesn&apos;t apply.</Hint>
          <Money name="salary" label="Salary from a job (R)" initial={rands(initial.salary)} />
          <Money name="paye" label="Tax your employer takes off it, PAYE (R)" initial={rands(initial.paye)} />
          <Money name="interest" label="Interest from savings (R)" initial={rands(initial.interest)} />
          <Money name="rent" label="Rent from a property, after its costs (R)" initial={rands(initial.rent)} />
          <Money name="other_income" label="Anything else (R)" initial={rands(initial.other_income)} />
        </>
      ),
    },
    ...(askPayment
      ? [
          {
            title: "Have you paid SARS any provisional tax this tax year?",
            body: (
              <>
                <Hint>The first payment was due on {formatDate(firstDue)}. Leave it blank if you haven&apos;t paid yet.</Hint>
                <Money name="paid" label="Amount paid (R)" initial="" />
                <div>
                  <label htmlFor="paid_on" className={label}>Paid on</label>
                  <input id="paid_on" name="paid_on" type="date" max={today} defaultValue={firstDue <= today ? firstDue : today} className={field} />
                </div>
              </>
            ),
          },
        ]
      : []),
    {
      title: "Last year's taxable income (optional)",
      body: (
        <>
          <Hint>
            It&apos;s on the assessment (ITA34) SARS sent after your last tax return, as &ldquo;Taxable income&rdquo;. With it, we can
            show the least to pay so SARS can&apos;t charge an underestimate penalty.
          </Hint>
          <Money name="last_taxable_income" label="Taxable income (R)" initial={rands(initial.last_taxable_income)} />
        </>
      ),
    },
    ...(editing
      ? [
          {
            title: "Your own profit figure (optional)",
            body: (
              <>
                <Hint>
                  We work out this year&apos;s profit from your invoices and expenses so far. If you know better, for example because
                  you&apos;re taking leave, type your own figure for the whole tax year. Leave it blank to use ours.
                </Hint>
                <Money name="profit_override" label="Whole year's profit (R)" initial={rands(initial.profit_override)} />
              </>
            ),
          },
        ]
      : []),
  ];

  const last = step === steps.length - 1;

  return (
    <form action={action} className="flex flex-col gap-6">
      <p className="text-sm text-neutral-500">
        Question {step + 1} of {steps.length}
      </p>
      {steps.map((s, i) => (
        <fieldset key={s.title} hidden={i !== step} className="flex flex-col gap-4">
          <legend className="mb-1 text-lg font-semibold">{s.title}</legend>
          {s.body}
        </fieldset>
      ))}

      <div className="flex gap-3">
        {step > 0 && (
          <button type="button" onClick={() => setStep(step - 1)} className={secondaryButton}>
            Back
          </button>
        )}
        {last ? (
          <button type="submit" disabled={saving} className={button}>
            {saving ? "Saving…" : editing ? "Save" : "See my estimate"}
          </button>
        ) : (
          <button type="button" onClick={() => setStep(step + 1)} className={button}>
            Next
          </button>
        )}
        <Link href="/tax" className="ml-auto self-center text-sm text-neutral-500 underline">
          Cancel
        </Link>
      </div>
      {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-neutral-500">{children}</p>;
}

function Money({ name, label: text, initial }: { name: string; label: string; initial: string }) {
  return (
    <div>
      <label htmlFor={name} className={label}>{text}</label>
      <input id={name} name={name} inputMode="decimal" defaultValue={initial} className={field} />
    </div>
  );
}
