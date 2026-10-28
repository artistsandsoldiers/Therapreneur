# Claims

**Status:** building

## Problem
Emailing invoices to each medical aid and tracking which ones were received is manual and easy to lose track of.

## Evidence
Discovery interview with Robynne Stock (solo adult OT), October 2026. She emails PDFs to per-scheme addresses and gets a reference number back. Grilled with Barry on 28 October 2026.

## Scope
- Claims in the main nav. Medical aid invoices not yet claimed, grouped by medical aid and all ticked. Untick to hold one back.
- Preview, then send one claim batch per medical aid: one email with a table (patient, member number, dependant code, date, ICD-10, amount) and one PDF per invoice.
- Sent by Resend, with replies going to the practice's email.
- Record the reference number on the batch. A batch is Sent until it has one, then Received.
- A claimed invoice is locked: no fixing or deleting, and the patient details it was sent with are kept. Its note can still change.
- Medical aid patients need a date of birth and dependant code before they can be claimed. Referring doctor is optional. The practice adds its HPCSA number.
- Every invoice can be downloaded as a PDF.

## Out of scope
- Switching houses (see decision 0001).
- Emailing cash invoices to patients.
- Fixing and resubmitting a sent claim.
- Real medical aid addresses. While testing, every claim goes to one test inbox (decision 0007).

## Open questions
- Must claims come from the email address the medical aid has on file for the practice?
