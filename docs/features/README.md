# Features

One doc per feature. A feature doc is written after a grill and before any code, and changes only when its scope or status changes.

**Status:** `idea` → `grilled` → `building` → `with therapists` → `live`

| Feature | Status | In one line |
| --- | --- | --- |
| [Capture](capture.md) | grilled | Codes and note on the phone after a session, which creates the invoice |
| [Invoicing](invoicing.md) | grilled | One invoice per session, to the medical aid or the patient |
| [Claims](claims.md) | grilled | Email claim batches to each medical aid and record reference numbers |
| [Reconciliation](reconciliation.md) | grilled | Match remittances to claims and mark invoices paid |
| [Notes](notes.md) | grilled | Free-text session notes and a list of sessions missing one |
| [Reports](reports.md) | grilled | Income per month, income per patient, outstanding by age |

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
