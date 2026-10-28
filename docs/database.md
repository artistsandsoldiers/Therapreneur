# Database

_Limit: 400 words. Update this in the same PR as every migration in `supabase/migrations/`._

What we store in Supabase, in plain English. Money is whole cents.

## The central list (shared by every practice, edited only by us)

- **medical_aids**: name and claims email (unused while testing).
- **billing_codes**: every billing code, by profession, with its description. One is the no-show code.
- **medical_aid_rates**: what each medical aid pays for each billing code, from a date. Empty means no fixed amount. For now only Discovery's 2026 OT rates.

## A practice's own data (only that practice can see it)

- **practices**: one per practitioner. The invited email, then setup: name, practice and HPCSA numbers, address, contact and banking details, profession, price adjustment (+/- %) and no-show price.
- **patients**: name, payer type (medical aid or cash), date of birth, and for medical aid patients the medical aid, plan, member number, main member, dependant code and referring doctor. Also ICD-10 codes, and when they became a past patient.
- **sessions**: one appointment: when, attended or no-show, and the note.
- **invoices**: one per session: number (1, 2, 3… per practice), date, due date (30 days later) and who pays. Once claimed, its claim batch and a copy of the patient details sent.
- **claim_batches**: one email of claims to a medical aid: when and where it was sent, and the reference number.
- **invoice_lines**: each billing code on an invoice, with quantity, price and ICD-10 codes. Code and description are copied in, so central list changes never alter an old invoice.

## Other

- **waitlist**: landing page signups. The app can't read it.

## How it fits together

A practice has many patients, each with many sessions. Each session has one invoice, and each invoice has one or more lines. Lines point at billing codes. A claim batch holds one medical aid's invoices.

## Behind the scenes

- **Row level security** stops one practice seeing another's rows, even if the app has a bug.
- **save_capture** saves a session, invoice and lines together and gives out invoice numbers one at a time. Fixing an invoice clears its old lines first.
- **Claimed invoices are locked.** Once a batch is sent, the database refuses to change its invoices, lines, or session (except the note). **start_claim_batch** checks and reserves invoices before the email goes.
- **Invites:** an agent adds a **practices** row with the practitioner's email. Their first login links them to it.
