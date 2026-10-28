"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { field } from "@/app/ui";
import type { Period } from "@/lib/periods";

const control = `${field.replace("w-full", "")} py-2 text-sm`;

/** Picks the period Performance shows: a month, a tax year or custom dates. Changes show straight away. */
export function PeriodPicker({ period, years }: { period: Period; years: number[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function show(changes: Record<string, string>) {
    const next = new URLSearchParams(params);
    for (const [name, value] of Object.entries(changes)) next.set(name, value);
    router.replace(`${pathname}?${next}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={period.kind}
        onChange={(event) => show({ period: event.target.value })}
        aria-label="Period"
        className={control}
      >
        <option value="month">Month</option>
        <option value="year">Tax year</option>
        <option value="custom">Custom dates</option>
      </select>
      {period.kind === "month" && (
        <input
          type="month"
          value={period.from.slice(0, 7)}
          onChange={(event) => event.target.value && show({ month: event.target.value })}
          aria-label="Month"
          className={control}
        />
      )}
      {period.kind === "year" && (
        <select
          value={period.from.slice(0, 4)}
          onChange={(event) => show({ year: event.target.value })}
          aria-label="Tax year"
          className={control}
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year}/{String(year + 1).slice(2)} (Mar {year} to Feb {year + 1})
            </option>
          ))}
        </select>
      )}
      {period.kind === "custom" && (
        <div className="flex items-center gap-1.5 text-sm text-neutral-500">
          <input
            type="date"
            value={period.from}
            onChange={(event) => event.target.value && show({ from: event.target.value, to: period.to })}
            aria-label="From"
            className={control}
          />
          <span>to</span>
          <input
            type="date"
            value={period.to}
            onChange={(event) => event.target.value && show({ from: period.from, to: event.target.value })}
            aria-label="To"
            className={control}
          />
        </div>
      )}
    </div>
  );
}
