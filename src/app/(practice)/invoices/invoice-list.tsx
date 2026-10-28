"use client";

import Link from "next/link";
import { DateRangeFilter, FilterBar, FilterSummary, SearchFilter, SelectFilter, useFilters } from "../filters";
import { bottomLeft, bottomRight, list, listHead, listRow, topRight } from "@/app/ui";
import { friendlyDate } from "@/lib/dates";
import { inDateRange, matchesSearch } from "@/lib/filters";
import { invoiceNumber } from "@/lib/invoices";
import { formatRands } from "@/lib/money";

export type InvoiceRow = {
  id: string;
  number: number;
  patientName: string;
  issuedOn: string;
  totalCents: number;
  paid: boolean;
  toMedicalAid: boolean;
  noShow: boolean;
};

const cols = "md:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]";

export function InvoiceList({ invoices }: { invoices: InvoiceRow[] }) {
  const filters = useFilters({ search: "", status: "all", billTo: "all", from: "", to: "" });
  const { values } = filters;
  const shown = invoices.filter(
    (invoice) =>
      matchesSearch(`${invoice.patientName} ${invoiceNumber(invoice.number)}`, values.search) &&
      (values.status === "all" || (values.status === "paid") === invoice.paid) &&
      (values.billTo === "all" || (values.billTo === "medical_aid") === invoice.toMedicalAid) &&
      inDateRange(invoice.issuedOn, values.from, values.to),
  );

  return (
    <>
      <FilterBar>
        <SearchFilter value={values.search} onChange={(value) => filters.set("search", value)} placeholder="Search patient or invoice no." />
        <SelectFilter
          label="Status"
          value={values.status}
          onChange={(value) => filters.set("status", value)}
          options={[["all", "Paid and outstanding"], ["outstanding", "Outstanding"], ["paid", "Paid"]]}
        />
        <SelectFilter
          label="Who pays"
          value={values.billTo}
          onChange={(value) => filters.set("billTo", value)}
          options={[["all", "Anyone pays"], ["medical_aid", "Medical aid pays"], ["patient", "Patient pays"]]}
        />
        <DateRangeFilter from={values.from} to={values.to} onChange={(end, value) => filters.set(end, value)} />
      </FilterBar>
      <FilterSummary
        active={filters.active}
        shown={shown.length}
        total={invoices.length}
        noun="invoices"
        amount={formatRands(shown.reduce((sum, invoice) => sum + invoice.totalCents, 0))}
        onClear={filters.clear}
      />

      <div className={`${listHead} ${cols} mt-4`}>
        <span>Patient</span>
        <span>Invoice</span>
        <span>Date</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Status</span>
      </div>
      <ul className={`${list} mt-4 md:mt-0`}>
        {shown.map((invoice) => (
          <li key={invoice.id}>
            <Link href={`/invoices/${invoice.id}`} className={`${listRow} ${cols}`}>
              <p className="truncate font-medium">{invoice.patientName}</p>
              <p className={`${bottomLeft} text-sm text-neutral-500 md:contents`}>
                <span>{invoiceNumber(invoice.number)}</span>
                <span className="md:hidden"> · </span>
                <span>
                  {friendlyDate(invoice.issuedOn)}
                  {invoice.noShow && " · No-show"}
                </span>
              </p>
              <p className={`${topRight} font-medium tabular-nums`}>{formatRands(invoice.totalCents)}</p>
              <p className={`${bottomRight} text-sm ${invoice.paid ? "text-accent" : "text-neutral-400"}`}>
                {invoice.paid ? "Paid" : "Outstanding"}
              </p>
            </Link>
          </li>
        ))}
      </ul>
      {shown.length === 0 && <p className="mt-4 text-neutral-500">No invoices match.</p>}
    </>
  );
}
