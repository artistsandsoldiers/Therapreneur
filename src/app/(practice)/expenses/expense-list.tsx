"use client";

import Link from "next/link";
import { DateRangeFilter, FilterBar, FilterSummary, SearchFilter, SelectFilter, useFilters } from "../filters";
import { bottomLeft, list, listHead, listRow, topRight } from "@/app/ui";
import { friendlyDate } from "@/lib/dates";
import { expensesByMonth } from "@/lib/expenses";
import { inDateRange, matchesSearch } from "@/lib/filters";
import { formatRands } from "@/lib/money";

type ExpenseRow = { id: string; spentOn: string; amountCents: number; supplier: string; category: string; hasReceipt: boolean };

const COLS = "md:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Expenses by month, newest first, with filters that apply as she types or picks. */
export function ExpenseList({ expenses }: { expenses: ExpenseRow[] }) {
  const filters = useFilters({ search: "", category: "", receipt: "all", from: "", to: "" });
  const { values } = filters;
  const categories = [...new Set(expenses.map((e) => e.category))].sort();
  const shown = expenses.filter(
    (e) =>
      matchesSearch(`${e.supplier} ${e.category}`, values.search) &&
      (!values.category || e.category === values.category) &&
      (values.receipt === "all" || (values.receipt === "missing") === !e.hasReceipt) &&
      inDateRange(e.spentOn, values.from, values.to),
  );

  return (
    <>
      <FilterBar>
        <SearchFilter value={values.search} onChange={(value) => filters.set("search", value)} placeholder="Search who you paid" />
        <SelectFilter
          label="Category"
          value={values.category}
          onChange={(value) => filters.set("category", value)}
          options={[["", "All categories"], ...categories.map((c): [string, string] => [c, c])]}
        />
        <SelectFilter
          label="Receipt"
          value={values.receipt}
          onChange={(value) => filters.set("receipt", value)}
          options={[["all", "With or without receipt"], ["missing", "Missing a receipt"], ["has", "Has a receipt"]]}
        />
        <DateRangeFilter from={values.from} to={values.to} onChange={(end, value) => filters.set(end, value)} />
      </FilterBar>
      <FilterSummary
        active={filters.active}
        shown={shown.length}
        total={expenses.length}
        noun="expenses"
        amount={formatRands(shown.reduce((sum, e) => sum + e.amountCents, 0))}
        onClear={filters.clear}
      />
      {expensesByMonth(shown).map((month) => (
        <section key={month.month} className="mt-8">
          <div className="mb-1 flex items-baseline justify-between gap-4 text-sm font-medium text-neutral-500">
            <h2>{MONTH_NAMES[Number(month.month.slice(5, 7)) - 1]} {month.month.slice(0, 4)}</h2>
            <span className="tabular-nums">{formatRands(month.totalCents)}</span>
          </div>
          <div className={`${listHead} ${COLS}`}>
            <span>Supplier</span>
            <span>Category</span>
            <span>Date</span>
            <span>Receipt</span>
            <span className="text-right">Amount</span>
          </div>
          <ul className={list}>
            {month.expenses.map((expense) => (
              <li key={expense.id}>
                <Link href={`/expenses/${expense.id}`} className={`${listRow} ${COLS}`}>
                  <p className="truncate font-medium">{expense.supplier}</p>
                  <p className={`${bottomLeft} text-sm text-neutral-500 md:contents`}>
                    <span className="truncate">{expense.category}</span>
                    <span className="md:hidden"> · </span>
                    <span>{friendlyDate(expense.spentOn)}</span>
                    <span className="text-amber-700">
                      {!expense.hasReceipt && (
                        <>
                          <span className="md:hidden"> · </span>No receipt
                        </>
                      )}
                    </span>
                  </p>
                  <span className={`${topRight} font-medium tabular-nums`}>{formatRands(expense.amountCents)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {shown.length === 0 && <p className="mt-4 text-neutral-500">No expenses match.</p>}
    </>
  );
}
