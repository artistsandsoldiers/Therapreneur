# Database

_Limit: 400 words. Update this in the same PR as every migration in `supabase/migrations/`._

What we store in Supabase, in plain English. Each heading is a table. Money is whole cents.

## The central list (shared by every practice, edited only by us)

- **medical_aids**: each medical aid's name.
- **billing_codes**: every billing code, by profession, with its description. One is marked as the no-show code.
- **medical_aid_rates**: what each medical aid pays for each billing code, from a date. An empty rate means the medical aid has no fixed amount. For now we only have Discovery's 2026 OT rates.

## A practice's own data (only that practice can see it)

- **practices**: one per practitioner. The email we invited, then what they enter in setup: name, practice number, address, contact details, banking details, profession, price adjustment (+/- %) and no-show price.
- **patients**: name, payer type (medical aid or cash), and for medical aid patients the medical aid, plan, member number and main member. Also their ICD-10 codes, and the date they became a past patient, if they did.
- **sessions**: one appointment with one patient: when it was, whether they attended or didn't show, and the note.
- **invoices**: one per session, with its number (1, 2, 3… per practice), date, due date (30 days later) and who pays (medical aid or patient).
- **invoice_lines**: each billing code on an invoice, with quantity, price and ICD-10 codes. The code and description are copied in, so later changes to the central list never change an old invoice.

## Other

- **waitlist**: name, email, occupation and source of each landing page signup. The app can't read it.

## How it fits together

A practice has many patients, each with many sessions. Each session has one invoice, and each invoice has one or more lines. Lines point at billing codes.

## Behind the scenes

- **Row level security** makes the database refuse to show one practice's rows to another, even if the app has a bug.
- **save_capture** saves a session, its invoice and lines together and gives out invoice numbers one at a time. When an invoice is fixed, the app clears its old lines first, and save_capture refuses to save if any are left.
- **Invites:** to invite a practitioner, an agent adds a row to **practices** with their email. Their first login links them to it.
