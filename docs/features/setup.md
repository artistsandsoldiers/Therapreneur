# Setup

**Status:** building

## Problem
A practitioner needs to get into their own practice safely and have it ready to invoice in a few minutes.

## Evidence
Robynne Stock (solo adult OT), October 2026: loading billing codes by hand is a pain, and she wants them built in. Login itself has no therapist evidence; it's needed so a first OT can test capture with fake data.

## Scope
- Invite only. Barry creates a practice and invites the practitioner by email, through an agent for now.
- Log in with an email address and password. On their first visit, an invited practitioner chooses their password. Stay logged in for weeks, including from the app saved to the phone's home screen.
- The first login runs a short setup: practice name, address and banking details, profession, price adjustment (the medical aid rate, or a percentage above or below it) and a no-show price.
- Billing codes and medical aid rates come from the central list, so there are none to type in (decision 0008).
- Each practice sees only its own data (decision 0006).

## Out of scope
- Public sign-up. The landing page waitlist collects interest.
- Sign in with Google. Revisit with calendar sync.
- Logo upload, so invoices show the practice name only.
- Barry's admin screen.
- Password reset by email. Barry resets passwords for now.
- Emailed login codes: Supabase only allows editing its emails with our own email service.
- Overriding the price of a single code.

## Open questions
- None.
