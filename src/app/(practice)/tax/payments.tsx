"use client";

import { useActionState, useState, useTransition } from "react";
import { addTaxPayment, deleteTaxPayment, type TaxFormState } from "./actions";
import { button, field, label } from "@/app/ui";
import { formatDate } from "@/lib/dates";
import { formatRands } from "@/lib/money";

type Payment = { id: string; paidOn: string; amountCents: number; yearName: string };

/** Provisional tax payments made, and a form to add one. */
export function Payments({
  payments,
  today,
  years,
}: {
  payments: Payment[];
  today: string;
  /** The tax years a payment can count towards: this year, and last year while its top-up is still open. */
  years: { year: number; text: string }[];
}) {
  const [state, action, saving] = useActionState<TaxFormState, FormData>(addTaxPayment, {});
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      {payments.length > 0 && (
        <ul className="mb-4 divide-y divide-neutral-100 border-y border-neutral-100">
          {payments.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
              <span>
                {formatDate(p.paidOn)} <span className="text-sm text-neutral-500">for {p.yearName}</span>
              </span>
              <span className="flex items-center gap-4">
                <span className="tabular-nums">{formatRands(p.amountCents)}</span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (!confirm("Remove this payment?")) return;
                    setError(null);
                    startTransition(async () => {
                      const result = await deleteTaxPayment(p.id);
                      if (result.error) setError(result.error);
                    });
                  }}
                  className="text-sm text-neutral-500 underline"
                >
                  Remove
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {error && <p role="alert" className="mb-2 text-sm text-red-600">{error}</p>}

      <form action={action} className="flex flex-col gap-3 rounded-md border border-neutral-200 p-3">
        <p className="text-sm font-medium">Paid SARS? Add it here</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="payment_paid_on" className={label}>Paid on</label>
            <input id="payment_paid_on" name="paid_on" type="date" max={today} defaultValue={today} required className={field} />
          </div>
          <div>
            <label htmlFor="payment_amount" className={label}>Amount (R)</label>
            <input id="payment_amount" name="amount" inputMode="decimal" required className={field} />
          </div>
        </div>
        {years.length > 1 ? (
          <div>
            <label htmlFor="payment_year" className={label}>For the tax year</label>
            <select id="payment_year" name="tax_year" defaultValue={years[0].year} className={field}>
              {years.map((y) => <option key={y.year} value={y.year}>{y.text}</option>)}
            </select>
          </div>
        ) : (
          <input type="hidden" name="tax_year" value={years[0].year} />
        )}
        <button type="submit" disabled={saving} className={`${button} self-start`}>
          {saving ? "Saving…" : "Add payment"}
        </button>
        {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
      </form>
    </div>
  );
}
