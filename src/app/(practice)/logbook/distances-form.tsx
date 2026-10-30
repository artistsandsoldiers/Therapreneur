"use client";

import { useState, useTransition } from "react";
import { saveDistance } from "./actions";
import { field, secondaryButton } from "@/app/ui";
import type { MissingDistance } from "@/lib/trips";

/** The distances business trips still need, typed once each and remembered for every trip after. */
export function DistancesForm({ missing }: { missing: MissingDistance[] }) {
  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
      <h2 className="font-semibold">Distances to fill in</h2>
      <p className="mt-1 mb-3 text-sm text-neutral-600">
        Type the driving distance once and every trip between these two places uses it, both ways. Google Maps will do
        this for you later.
      </p>
      <ul className="flex flex-col gap-3">
        {missing.map((pair) => (
          <DistanceRow key={pair.key} pair={pair} />
        ))}
      </ul>
    </section>
  );
}

function DistanceRow({ pair }: { pair: MissingDistance }) {
  const [km, setKm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  return (
    <li>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          startSaving(async () => setError((await saveDistance(pair.from, pair.to, km)).error ?? null));
        }}
        className="flex flex-wrap items-center gap-2"
      >
        <span className="min-w-0 flex-1 text-sm">
          {pair.fromLabel} to {pair.toLabel}
          <span className="block text-neutral-500">
            {pair.trips} {pair.trips === 1 ? "trip" : "trips"}
          </span>
        </span>
        <input
          value={km}
          onChange={(e) => setKm(e.target.value)}
          inputMode="decimal"
          placeholder="km"
          aria-label={`Kilometres from ${pair.fromLabel} to ${pair.toLabel}`}
          className={`${field.replace("w-full", "w-24")} py-1.5`}
        />
        <button type="submit" disabled={saving} className={`${secondaryButton} py-1.5`}>{saving ? "Saving…" : "Save"}</button>
      </form>
      {error && <p role="alert" className="mt-1 text-sm text-red-600">{error}</p>}
    </li>
  );
}
