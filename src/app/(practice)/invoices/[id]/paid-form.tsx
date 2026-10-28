"use client";

import { useActionState } from "react";
import { setPaidOn } from "./actions";
import { button, field, label } from "@/app/ui";
import { formatDate } from "@/lib/dates";

/** Marks the invoice paid on a date, or back to outstanding. */
export function PaidForm({ invoiceId, paidOn, today }: { invoiceId: string; paidOn: string | null; today: string }) {
  const [state, action, saving] = useActionState(setPaidOn.bind(null, invoiceId), {});

  return (
    <form action={action} className="mt-4 rounded-md border border-neutral-200 px-3 py-3 text-sm">
      {paidOn ? (
        <div className="flex items-center justify-between gap-3">
          <p>
            <span className="font-medium text-accent">Paid</span> on {formatDate(paidOn)}
          </p>
          <button type="submit" disabled={saving} className="text-neutral-500 underline">
            {saving ? "Saving…" : "Mark unpaid"}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <label htmlFor="paid_on" className={label}>Outstanding. Paid on</label>
          <div className="flex gap-2">
            <input id="paid_on" name="paid_on" type="date" defaultValue={today} max={today} required className={field} />
            <button type="submit" disabled={saving} className={`${button} shrink-0`}>
              {saving ? "Saving…" : "Mark paid"}
            </button>
          </div>
        </div>
      )}
      {state.error && <p role="alert" className="mt-2 text-red-600">{state.error}</p>}
    </form>
  );
}
