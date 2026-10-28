import { formatRands } from "@/lib/money";
import type { MonthProfit } from "@/lib/expenses";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Two shades of the accent: invoiced lighter, paid in the accent itself. The month table below is the exact view.
const INVOICED = "#5FB3BA";
const PAID = "var(--color-accent)";

/** "2026-10" -> "Oct" */
function monthName(month: string): string {
  return MONTH_NAMES[Number(month.slice(5, 7)) - 1];
}

/** Invoiced and paid side by side for each month, with the exact amounts on hover or tap and in a table below. */
export function MonthChart({ months }: { months: MonthProfit[] }) {
  const max = Math.max(...months.flatMap((m) => [m.invoicedCents, m.paidCents]), 1);
  const height = (cents: number) => (cents === 0 ? "0" : `max(${(cents / max) * 100}%, 2px)`);

  return (
    <div>
      <div className="mb-3 flex gap-4 text-sm text-neutral-600">
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: INVOICED }} />Invoiced</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: PAID }} />Paid</span>
      </div>

      <div className="flex h-44 items-end gap-2 border-b border-neutral-200">
        {months.map((m, i) => (
          <div key={m.month} tabIndex={0} className="group relative flex h-full flex-1 items-end justify-center gap-0.5 outline-none">
            <div className="w-full max-w-6 rounded-t" style={{ height: height(m.invoicedCents), background: INVOICED }} />
            <div className="w-full max-w-6 rounded-t" style={{ height: height(m.paidCents), background: PAID }} />
            <div className={`pointer-events-none absolute top-0 z-10 hidden rounded-md ${i === 0 ? "left-0" : i === months.length - 1 ? "right-0" : "left-1/2 -translate-x-1/2"} border border-neutral-200 bg-white px-3 py-2 text-xs whitespace-nowrap shadow-sm group-hover:block group-focus:block`}>
              <p className="font-medium">{monthName(m.month)} {m.month.slice(0, 4)}</p>
              <p className="text-neutral-600">Invoiced {formatRands(m.invoicedCents)}</p>
              <p className="text-neutral-600">Paid {formatRands(m.paidCents)}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-2 text-xs text-neutral-500" aria-hidden>
        {months.map((m) => (
          <span key={m.month} className="flex-1 text-center">{monthName(m.month)}</span>
        ))}
      </div>

      <div className="mt-6 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-xs text-neutral-400 uppercase">
            <th className="py-2 text-left font-medium">Month</th>
            <th className="py-2 pl-2 text-right font-medium">Invoiced</th>
            <th className="py-2 pl-2 text-right font-medium">Paid</th>
            <th className="py-2 pl-2 text-right font-medium">Expenses</th>
            <th className="py-2 pl-2 text-right font-medium">Profit before tax</th>
          </tr>
        </thead>
        <tbody>
          {[...months].reverse().map((m) => (
            <tr key={m.month} className="border-b border-neutral-100">
              <td className="py-2">{monthName(m.month)} {m.month.slice(0, 4)}</td>
              <td className="py-2 text-right tabular-nums">{formatRands(m.invoicedCents)}</td>
              <td className="py-2 text-right tabular-nums">{formatRands(m.paidCents)}</td>
              <td className="py-2 pl-2 text-right tabular-nums">{formatRands(m.expensesCents)}</td>
              <td className={`py-2 pl-2 text-right tabular-nums ${m.profitCents < 0 ? "text-red-600" : ""}`}>{formatRands(m.profitCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
