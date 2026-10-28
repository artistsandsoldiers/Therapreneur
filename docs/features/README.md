# Features

One doc per feature. A feature doc is written after a grill and before any code, and changes only when its scope or status changes.

**Status:** `idea` → `grilled` → `building` → `with therapists` → `live`

| Feature | Status | In one line |
| --- | --- | --- |
| [Setup](setup.md) | building | Invite-only login with email and password, then practice details and prices |
| [Capture](capture.md) | building | Codes and note on the phone after a session, which creates the invoice |
| [Invoicing](invoicing.md) | grilled | One invoice per session, to the medical aid or the patient |
| [Claims](claims.md) | building | Email claim batches to each medical aid and record reference numbers |
| [Reconciliation](reconciliation.md) | building | Tick the claims a remittance paid and mark them paid |
| [Notes](notes.md) | grilled | Free-text session notes and a list of sessions missing one |
| [Performance](performance.md) | building | Income per month, income per patient, outstanding by age |
| [Patients](patients.md) | building | A patient list and page with details, sessions and notes |
| [Waitlist](waitlist.md) | building | Landing page that collects name, email and occupation |

The PRD and clickable prototype for all six are in [the PRD](https://claude.ai/artifact/S7Z9PWvmCQmF1SztK1Br5p) and [the prototype](https://claude.ai/artifact/VrfhY8P4SrjSAQ4im9D4LL).

## Template

_Limit: 300 words._

```md
# {Feature}

**Status:** idea | grilled | building | with therapists | live

## Problem
{The practitioner's pain, in one or two sentences.}

## Evidence
{Which therapists said or showed this, and when. "None yet" is allowed but is a warning.}

## Scope
{What it does, as short bullets.}

## Out of scope
{What it deliberately doesn't do yet.}

## Open questions
{Unresolved points. Remove each once answered.}
```
