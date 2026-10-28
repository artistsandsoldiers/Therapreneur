# Reconciliation

**Status:** building

## Problem
Working out which claims a medical aid has paid means comparing its remittance against invoices by hand.

## Evidence
Discovery interview with Robynne Stock (solo adult OT), October 2026. Medical aids publish remittances on their portals on their own schedule. Grilled with Barry on 28 October 2026.

## Scope
- Reconcile in the main nav: sent claims not yet paid, grouped by medical aid, oldest first.
- Pick a medical aid, tick the claims its remittance paid, and enter the paid date and an optional remittance reference. A running total helps check against the bank.
- Ticked invoices become paid in full on that date. The remittance is kept, with its claims and total.
- Undo a remittance recorded by mistake, and its claims are outstanding again.
- Mark paid by hand stays, for cash invoices or a patient paying a medical aid invoice.

## Out of scope
- Importing a remittance file. We haven't seen one yet.
- Shortfalls, rejections and part-payments, for now. A claim not paid in full stays outstanding. We will build for them later, so don't design them out.

## Open questions
- What a real remittance looks like (PDF, CSV, portal export). Ask Robs for a redacted Discovery one.
