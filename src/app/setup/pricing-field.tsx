"use client";

import { useState } from "react";
import { field } from "@/app/ui";
import type { PriceExample } from "@/lib/capture-data";
import { formatRands } from "@/lib/money";
import { adjustPrice } from "@/lib/pricing";

// The slider covers the usual range in 5% steps. The number box beside it takes anything the database allows.
const SLIDER = { min: -30, max: 50, step: 5 };
const LIMITS = { min: -50, max: 100 };
const ratePosition = ((0 - SLIDER.min) / (SLIDER.max - SLIDER.min)) * 100;

/** How a practice's prices compare to medical aid rates, as a slider with medical aid rates marked. */
export function PricingField({ initial, example }: { initial: number; example: PriceExample | null }) {
  const [typed, setTyped] = useState(String(initial));
  const percent = Number(typed);
  const valid = typed !== "" && typed !== "-" && Number.isInteger(percent) && percent >= LIMITS.min && percent <= LIMITS.max;

  const summary = !valid
    ? `Choose a whole percent from ${LIMITS.min}% to +${LIMITS.max}%.`
    : percent === 0
      ? "At medical aid rates"
      : `${Math.abs(percent)}% ${percent > 0 ? "above" : "below"} medical aid rates`;

  return (
    <div>
      <input type="hidden" name="price_adjustment" value={typed} />
      <div className="flex items-baseline justify-between gap-3">
        <p className={`font-medium ${valid ? "" : "text-red-600"}`}>{summary}</p>
        <label className="flex items-center gap-1.5 text-sm text-neutral-500">
          <input
            inputMode="numeric"
            value={typed}
            onChange={(event) => setTyped(event.target.value.replace(/[^\d-]/g, "").replace(/(?!^)-/g, ""))}
            aria-label="Price adjustment in percent"
            className={`${field.replace("w-full", "w-20")} py-1.5 text-right`}
          />
          %
        </label>
      </div>

      <div className="relative mt-4">
        <input
          type="range"
          min={SLIDER.min}
          max={SLIDER.max}
          step={SLIDER.step}
          value={valid ? Math.min(SLIDER.max, Math.max(SLIDER.min, percent)) : 0}
          onChange={(event) => setTyped(event.target.value)}
          aria-label="Price adjustment"
          aria-valuetext={summary}
          className="w-full accent-accent"
        />
        {/* Medical aid rates, marked where 0% sits on the slider. */}
        <div className="pointer-events-none absolute top-full mt-1 -translate-x-1/2 text-center" style={{ left: `${ratePosition}%` }}>
          <div className="mx-auto h-2 w-px bg-neutral-300" />
          <p className="text-xs font-medium whitespace-nowrap text-accent">Medical aid rate</p>
          <p className="text-xs whitespace-nowrap text-neutral-400">recommended</p>
        </div>
        <div className="mt-1 flex justify-between text-xs text-neutral-400">
          <span>{SLIDER.min}%</span>
          <span>+{SLIDER.max}%</span>
        </div>
      </div>

      {example && valid && (
        <p className="mt-10 rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
          For example, {example.code} ({example.description.replace(/\.$/, "")}) is{" "}
          <span className="tabular-nums">{formatRands(example.rateCents)}</span> at medical aid rates, so you&apos;d charge{" "}
          <span className="font-medium text-neutral-900 tabular-nums">{formatRands(adjustPrice(example.rateCents, percent))}</span>.
        </p>
      )}
      {(!example || !valid) && <div className="mt-10" />}
    </div>
  );
}
