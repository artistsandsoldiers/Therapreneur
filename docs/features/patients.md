# Patients

**Status:** building

## Problem
A practitioner needs one place to see and keep each patient's details, medical aid and notes up to date. Today a wrong member number can't be fixed once the patient is added, and it would go onto claims.

## Evidence
None yet from therapists. Grilled with Barry on 28 October 2026 because capture adds patients but can't fix them.

## Scope
- Patients in the main nav. A list of current patients, sorted by surname, showing medical aid (or none, and whether the patient pays) and last session, with search.
- Add a patient from the list, or from capture as before.
- A patient page: details, an Edit button, New session with the patient already picked, and a timeline of sessions, newest first, with billing codes, note and invoice total.
- Adding or fixing a note opens the session in capture.
- Edits show on the patient's existing invoices. Once claims exist, sent claims will keep the details they were sent with.
- Move a patient to past patients, for any reason, and back. Past patients are hidden from the list and capture, and keep their sessions and invoices.
- Delete a patient only if they have no sessions.
- Optionally, who referred them, picked from the practice's referrers or added on the spot. A doctor referrer is the referring doctor on invoices.

## Out of scope
- Phone and email. (Date of birth, dependant code and referring doctor came with claims.)
- Deleting a patient with history.

## Open questions
- Is "past patient" the word practitioners use?
- Where do Robs' patients come from, and does she track it? Referrers were added without therapist evidence.
