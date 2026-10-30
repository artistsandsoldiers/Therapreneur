# Database

_Limit: 400 words. Update this in the same PR as every migration in `supabase/migrations/`._

What we store in Supabase, in plain English. Money is whole cents.

## The central list (shared by every practice, edited only by us)

- **medical_aids**: name and claims email (unused while testing).
- **billing_codes**: every billing code, by profession, with its description. One is the no-show code.
- **expense_categories**: plain categories like Rooms and rent, each with a hint. Practices add their own too.
- **medical_aid_rates**: what each medical aid pays for each billing code, from a date. Empty means no fixed amount. For now only Discovery's 2026 OT rates.

## A practice's own data (only that practice can see it)

- **practices**: one per practitioner. The invited email, then setup: the practitioner's first and last name, practice name, practice and HPCSA numbers, address, home address and whether home to a patient's home counts as business (for trips), contact and banking details, profession, price adjustment (+/- %), no-show price, usual session length and where its logo is kept. Also sole proprietor or Inc, and for the tax estimate, the practitioner's date of birth and whether it's on.
- **patients**: name, date of birth, and for patients with medical aid the medical aid, plan, member number, main member and dependant code. Their referrer, if any (a doctor's name and practice number are copied onto the patient for invoices). Who usually pays (medical aid or patient; only patient without medical aid). Also ICD-10 codes, when they became a past patient, and where they're usually seen (a place, or at home with their address).
- **places**: where a practice sees patients: name, address, and whether it's a regular place of work (driving there from home is private).
- **cars**: the car used for work: name, registration, and the days it started and stopped. One at a time.
- **odometer_readings**: a car's km on a day.
- **distances**: driving km between two addresses, the same both ways. Trips are worked out from the calendar, not stored.
- **referrers**: who sends a practice patients: name, kind (doctor, website, social media…) and a doctor's practice number.
- **sessions**: one appointment: when, how long (minutes), where (a place or the patient's home, starting where the patient is usually seen), attended or no-show (empty while booked), the note, and a series id shared by repeats.
- **events**: a meeting, training, errand or other work in the calendar: when, how long, an optional title, and a place or an address.
- **invoices**: one per session: number (1, 2, 3… per practice), date, due date (30 days later), who pays (from the patient, changeable per session; no-shows always the patient), the date it was paid in full and its remittance. Once claimed, its claim batch and the patient details sent.
- **claim_batches**: one email of claims to a medical aid: when and where sent, and its reference number.
- **remittances**: one payment from a medical aid: date and reference.
- **expenses**: date paid, who was paid, amount, category, note and its receipt.
- **tax_years**: a practice's tax estimate answers for one tax year (named by the year it starts): where its records here start, rough totals from before, medical aid members, retirement annuity, its own profit figure and last year's taxable income.
- **tax_other_income**: salary (with PAYE), interest, rent or other income for a tax year.
- **tax_payments**: provisional tax paid to SARS, with the tax year it counts towards.
- **invoice_lines**: each billing code on an invoice, with quantity, price and ICD-10 codes. Code and description are copied in, so central list changes never alter an old invoice.

## Other

- **waitlist**: landing page signups. The app can't read it.

## How it fits together

A practice has patients, patients have sessions, and each captured session has one invoice with lines. A claim batch holds invoices emailed together; a remittance holds those paid together.

## Behind the scenes

- **Row level security** stops one practice seeing another's rows or files, even with an app bug.
- **save_capture** saves a session, invoice and lines together, captures a booked session, and gives out invoice numbers one at a time.
- **Claimed invoices are locked.** Once a batch is sent, the database refuses to change its invoices, lines, or session (except the note and payment). **start_claim_batch** checks and reserves invoices before the email goes. **record_remittance** pays only sent, unpaid claims.
- Places used by sessions or events can't be deleted.
- **start_car** starts a new car and ends the current one on the same day with its last reading.
- **Invites:** an agent adds a **practices** row with the email; the first login links to it.
- **Logos** and **receipts** live in private file storage buckets, one folder per practice.
