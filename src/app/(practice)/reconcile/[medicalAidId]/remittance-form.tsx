"use client";

import { useActionState, useState } from "react";
import { recordRemittance } from "../actions";
import { button, field, label } from "@/app/ui";
import { friendlyDate } from "@/lib/dates";
import { invoiceNumber } from "@/lib/invoices";
import { formatRands } from "@/lib/money";
import type { OutstandingClaim } from "@/lib/reconciliation";

/** The paid date, an optional reference, and a tick per claim, with a running total to check against the remittance. */
export function RemittanceForm({ medicalAidId, claims, today }: { medicalAidId: string; claims: OutstandingClaim[]; today: string }) {
  const [state, action, saving] = useActionState(recordRemittance.bind(null, medicalAidId), {});
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const total = claims.filter((claim) => ticked.has(claim.id)).reduce((sum, claim) => sum + claim.totalCents, 0);

  const toggle = (id: string) =>
    setTicked((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  return (
    <form action={action} className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="paid_on" className={label}>Paid on</label>
          <input id="paid_on" name="paid_on" type="date" defaultValue={today} max={today} required className={field} />
        </div>
        <div>
          <label htmlFor="reference" className={label}>Remittance reference (optional)</label>
          <input id="reference" name="reference" maxLength={100} autoComplete="off" className={field} />
        </div>
      </div>

      <ul className="divide-y divide-neutral-100 border-y border-neutral-100">
        {claims.map((claim) => (
          <li key={claim.id}>
            <label className="flex cursor-pointer items-center gap-3 py-3">
              <input
                type="checkbox"
                name="invoice"
                value={claim.id}
                checked={ticked.has(claim.id)}
                onChange={() => toggle(claim.id)}
                className="size-5 accent-accent"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{claim.patientName}</span>
                <span className="block text-sm text-neutral-500">
                  {invoiceNumber(claim.number)} · {friendlyDate(claim.issuedOn)}
                  {claim.memberNumber && ` · Member no. ${claim.memberNumber}`}
                </span>
              </span>
              <span className="shrink-0 font-medium">{formatRands(claim.totalCents)}</span>
            </label>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setTicked(ticked.size === claims.length ? new Set() : new Set(claims.map((claim) => claim.id)))}
          className="self-start text-sm text-neutral-500 underline"
        >
          {ticked.size === claims.length ? "Untick all" : "Tick all"}
        </button>
        <button type="submit" disabled={saving || ticked.size === 0} className={`${button} w-full py-3`}>
          {saving
            ? "Saving…"
            : ticked.size === 0
              ? "Tick the claims that were paid"
              : `Mark ${ticked.size === 1 ? "1 claim" : `${ticked.size} claims`} paid · ${formatRands(total)}`}
        </button>
        {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
      </div>
    </form>
  );
}
