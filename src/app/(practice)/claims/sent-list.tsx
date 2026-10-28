"use client";

import Link from "next/link";
import { BatchStatus } from "./batch-status";
import { DateRangeFilter, FilterBar, FilterSummary, SelectFilter, useFilters } from "../filters";
import { bottomLeft, list, listHead, listRow } from "@/app/ui";
import { friendlyDate, toLocalInput } from "@/lib/dates";
import { inDateRange } from "@/lib/filters";
import { formatRands } from "@/lib/money";

type SentBatch = {
  id: string;
  medicalAid: string;
  sentAt: string;
  claims: number;
  totalCents: number;
  referenceNumber: string | null;
};

const SENT_COLS = "md:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]";

/** Sent claim batches, newest first, filtered by medical aid, status and when they were sent. */
export function SentList({ batches }: { batches: SentBatch[] }) {
  const filters = useFilters({ medicalAid: "", status: "all", from: "", to: "" });
  const { values } = filters;
  const medicalAids = [...new Set(batches.map((batch) => batch.medicalAid))].sort();
  const shown = batches.filter(
    (batch) =>
      (!values.medicalAid || batch.medicalAid === values.medicalAid) &&
      (values.status === "all" || (values.status === "received") === Boolean(batch.referenceNumber)) &&
      inDateRange(toLocalInput(new Date(batch.sentAt)).slice(0, 10), values.from, values.to),
  );

  return (
    <>
      <FilterBar>
        <SelectFilter
          label="Medical aid"
          value={values.medicalAid}
          onChange={(value) => filters.set("medicalAid", value)}
          options={[["", "All medical aids"], ...medicalAids.map((name): [string, string] => [name, name])]}
        />
        <SelectFilter
          label="Status"
          value={values.status}
          onChange={(value) => filters.set("status", value)}
          options={[["all", "Sent and received"], ["sent", "Sent, no reference yet"], ["received", "Received"]]}
        />
        <DateRangeFilter from={values.from} to={values.to} onChange={(end, value) => filters.set(end, value)} />
      </FilterBar>
      <FilterSummary
        active={filters.active}
        shown={shown.length}
        total={batches.length}
        noun="batches"
        amount={formatRands(shown.reduce((sum, batch) => sum + batch.totalCents, 0))}
        onClear={filters.clear}
      />
      <div className={`${listHead} ${SENT_COLS} mt-4`}>
        <span>Medical aid</span>
        <span>Sent</span>
        <span>Claims</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Status</span>
      </div>
      <ul className={`${list} mt-4 md:mt-0`}>
        {shown.map((batch) => (
          <li key={batch.id}>
            <Link href={`/claims/${batch.id}`} className={`${listRow} ${SENT_COLS}`}>
              <p className="truncate font-medium">{batch.medicalAid}</p>
              <p className={`${bottomLeft} text-sm text-neutral-500 md:contents`}>
                <span>{friendlyDate(batch.sentAt)}</span>
                <span className="md:hidden"> · </span>
                <span>{batch.claims === 1 ? "1 claim" : `${batch.claims} claims`}</span>
                <span className="md:hidden"> · </span>
                <span className="tabular-nums md:text-right md:font-medium md:text-neutral-900">{formatRands(batch.totalCents)}</span>
              </p>
              <span className="col-start-2 row-span-2 row-start-1 text-right md:col-start-auto md:row-span-1 md:row-start-auto">
                <BatchStatus referenceNumber={batch.referenceNumber} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {shown.length === 0 && <p className="mt-4 text-neutral-500">No batches match.</p>}
    </>
  );
}
