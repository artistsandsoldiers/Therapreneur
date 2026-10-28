# Capture

**Status:** building

## Problem
Practitioners bill from memory at the end of the day or week, which is slow and leaks revenue.

## Evidence
Discovery interview with Robynne Stock (solo adult OT), October 2026. She sees 3 to 6 patients a day and invoices each session separately.

## Scope
- Tap New session, pick a patient and a time, then capture. Sessions from Google Calendar come in the next slice (decision 0002 stands).
- The patient picker can add a patient with a short form: name, payer type, medical aid, plan, member number, main member and ICD-10 codes.
- The patient's ICD-10 codes are filled in.
- Pick one or more billing codes from the central list for the practitioner's profession, priced by their price adjustment (decision 0008). Codes without a fixed medical aid rate are priced while capturing.
- One tap for a no-show, billed to the patient at the no-show price set in setup.
- Type or dictate an optional note.
- Saving creates the session's invoice and shows it as the medical aid or patient will see it.
- A list of invoices. An invoice can be fixed or deleted until it's claimed.

## Out of scope
- Booking or editing sessions in a diary (decision 0002).
- Invoice PDF, download or email. These come with claims.
- A patients page (see [Patients](patients.md)).

## Open questions
- None.
