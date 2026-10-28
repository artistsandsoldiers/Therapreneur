"use client";

import { useState } from "react";
import { field } from "@/app/ui";

const control = `${field} py-2 text-sm`;

/** Filter values for a list, with a way to clear them all. Active means anything differs from the start. */
export function useFilters<T extends Record<string, string>>(initial: T) {
  const [values, setValues] = useState(initial);
  const set = (name: keyof T, value: string) => setValues((current) => ({ ...current, [name]: value }));
  const active = Object.keys(initial).some((name) => values[name] !== initial[name]);
  return { values, set, clear: () => setValues(initial), active };
}

/** The row of filters above a list. Wraps onto more lines on a phone. */
export function FilterBar({ children }: { children: React.ReactNode }) {
  return <div className="mt-4 flex flex-wrap items-end gap-2">{children}</div>;
}

export function SearchFilter({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <input
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className={`${control} basis-full md:basis-64`}
    />
  );
}

export function SelectFilter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} aria-label={label} className={`${control} w-auto`}>
      {options.map(([option, text]) => (
        <option key={option} value={option}>{text}</option>
      ))}
    </select>
  );
}

export function DateRangeFilter({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (end: "from" | "to", value: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 text-sm text-neutral-500">
      <input type="date" value={from} onChange={(event) => onChange("from", event.target.value)} aria-label="From" className={`${control} w-auto`} />
      <span>to</span>
      <input type="date" value={to} onChange={(event) => onChange("to", event.target.value)} aria-label="To" className={`${control} w-auto`} />
    </div>
  );
}

/** "4 of 20 invoices · R1 200,00 · Clear filters", shown while any filter is on. */
export function FilterSummary({
  active,
  shown,
  total,
  noun,
  amount,
  onClear,
}: {
  active: boolean;
  shown: number;
  total: number;
  noun: string;
  amount?: string;
  onClear: () => void;
}) {
  if (!active) return null;
  return (
    <p className="mt-3 text-sm text-neutral-500">
      {shown} of {total} {noun}
      {amount && <> · <span className="font-medium text-neutral-800 tabular-nums">{amount}</span></>} ·{" "}
      <button type="button" onClick={onClear} className="font-medium text-accent">
        Clear filters
      </button>
    </p>
  );
}
