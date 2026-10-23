# Waitlist

**Status:** building

## Problem
Barry needs somewhere to point therapists during market research, so interest turns into an audience he can test prototypes with.

## Evidence
None yet from therapists. This is a research tool, not a product feature.

## Scope
- A public landing page at the site root: one line on who it's for, one on what it is, and a signup form.
- The form takes name, email and occupation, all required. Occupation is OT, physio, speech or Other, and choosing Other asks them to type it. A `?ref=` or `utm_source=` link parameter records where the visitor came from.
- Signups are stored in the Supabase `waitlist` table. The public can add to it but never read it.
- Signing up twice still says "You're on the list", and a hidden field quietly drops bots.

## Out of scope
- Confirmation or marketing emails.
- An admin screen for the list. Ask an agent to query it for now.

## Open questions
- Connect therapreneur.co.za once it's set up.
