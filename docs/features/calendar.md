# Calendar

**Status:** building

## Problem
Practitioners need to see and manage their week of sessions, and booked sessions that are never captured are lost income.

## Evidence
Barry's conversations with Robynne Stock, October 2026. She books in Google Calendar today; we chose to hold the calendar in the app instead (decision 0009).

## Scope
- Calendar in the main nav, after Home. Desktop: Monday to Sunday, 06:00 to 20:00. Phone: one day at a time with the week's days above it.
- "New" adds a patient session, meeting, training, errand or other work. A click on an empty slot or a drag to pick the length starts a patient session. A session has a patient, time, length and where (one of her places or the patient's home); an event has a place or an address (docs/features/travel.md).
- Repeat weekly or every 2 weeks, for a number of sessions or until a date, up to a year. Each repeat is its own booked session in a series.
- A booking that overlaps another session warns, and can be booked anyway.
- Desktop: drag to move, drag the edge to change the length. Phone: tap a session to change its time.
- Moving or deleting a booked session in a series asks "this session" or "this and following". Captured sessions are never changed with their series.
- Once a booked session is over it shows as to capture, with Capture and one-tap No-show. Home counts them.
- A captured session can move (its invoice date moves too) or be deleted with its invoice, after a warning. A claimed one is locked.
- Cancelled in time: delete it. A late cancel is a no-show.

## Out of scope
- Google Calendar sync, one way from the app (decision 0009). What an event shows waits for it, since patient names are health information.
- Patient reminders (future ideas).
- Working hours, month or agenda views.

## Open questions
- Will Robs book in the app, or keep double-booking until Google sync?
