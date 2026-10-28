# Performance

**Status:** building

## Problem
Practitioners need a separate tool to see how the practice is doing.

## Evidence
Discovery interview with Robynne Stock (solo adult OT), October 2026. She uses Tiny Invoice for these reports today.

## Scope
- A live dashboard page called Performance, worked out from the invoices each time it opens. No exports yet.
- Three tabs (Overall, Income, Expenses), each for a period picked at the top: a month, a tax year, or custom dates. Defaults to this tax year.
- Per month within the period: invoiced, paid, expenses and profit.
- Income per patient for the period: invoiced and paid, with who pays.
- Income per referrer, and a referrer filter on the Income tab (not Outstanding).
- Paid means marked paid on the invoice, with a date, until reconciliation sets it.
- Outstanding: unpaid invoices by age (0 to 30, 31 to 60, 61 to 90, 90+ days), by medical aid and patients. Always as at today, whatever the period.
- Expenses by category and month, and profit before tax ([Expenses](expenses.md)).

## Out of scope
- Tax owed and the tax year summary.

## Open questions
- Should debt age from the invoice date (as now) or the due date?
