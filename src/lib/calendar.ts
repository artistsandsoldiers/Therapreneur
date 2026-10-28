/** The calendar's rules (docs/features/calendar.md): where a session is in its life, repeats and clashes. */
import { fromLocalInput, toLocalInput } from "./dates";
import type { Enums } from "./supabase/database.types";

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

/** Booked (no outcome yet), to capture (booked and over), or captured as attended or a no-show. */
export type SessionState = "booked" | "to_capture" | "attended" | "no_show";

export function sessionState(
  session: { outcome: Enums<"session_outcome"> | null; startsAt: string; durationMinutes: number },
  now = new Date(),
): SessionState {
  if (session.outcome) return session.outcome;
  return sessionEnd(session.startsAt, session.durationMinutes) <= now.getTime() ? "to_capture" : "booked";
}

/** When a session ends, in milliseconds. */
export function sessionEnd(startsAt: string, durationMinutes: number): number {
  return new Date(startsAt).getTime() + durationMinutes * MINUTE;
}

/** "YYYY-MM-DDTHH:mm" in South African time, moved by some days. South Africa has no daylight saving. */
export function addDaysLocal(local: string, days: number): string {
  return toLocalInput(new Date(new Date(fromLocalInput(local)!).getTime() + days * DAY));
}

export type Repeat = { everyWeeks: 1 | 2; ends: { after: number } | { on: string } };

// Repeats stop within a year of the first session.
export const REPEAT_MAX_DAYS = 365;

/**
 * The start of every session in a booking, the first included, as "YYYY-MM-DDTHH:mm" South African times.
 * Ends after a number of sessions, or on a date ("YYYY-MM-DD", inclusive), and never more than a year on.
 */
export function repeatStarts(first: string, repeat: Repeat | null): string[] {
  if (!repeat) return [first];
  const lastDay = addDaysLocal(first, REPEAT_MAX_DAYS).slice(0, 10);
  const until = "on" in repeat.ends && repeat.ends.on < lastDay ? repeat.ends.on : lastDay;
  const count = "after" in repeat.ends ? repeat.ends.after : Infinity;

  const starts: string[] = [];
  for (let start = first; starts.length < count && start.slice(0, 10) <= until; start = addDaysLocal(start, 7 * repeat.everyWeeks)) {
    starts.push(start);
  }
  return starts;
}

/** Checks a repeat as typed. The number of sessions counts the first one. */
export function checkRepeat(first: string, repeat: Repeat | null): string | null {
  if (!repeat) return null;
  if ("after" in repeat.ends) {
    const { after } = repeat.ends;
    if (!Number.isInteger(after) || after < 2 || after > 52) return "Please repeat for 2 to 52 sessions.";
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(repeat.ends.on) || repeat.ends.on <= first.slice(0, 10)) {
    return "Please pick an end date after the first session.";
  }
  return null;
}

export type Booked = { id: string; startsAt: string; durationMinutes: number; patientName: string };

/** Sessions already in the calendar that overlap any new ones starting at these timestamps. Back to back isn't a clash. */
export function findClashes(starts: string[], durationMinutes: number, existing: Booked[]): Booked[] {
  const ranges = starts.map((start) => {
    const from = new Date(start).getTime();
    return [from, from + durationMinutes * MINUTE] as const;
  });
  return existing.filter((session) => {
    const from = new Date(session.startsAt).getTime();
    const to = sessionEnd(session.startsAt, session.durationMinutes);
    return ranges.some(([start, end]) => start < to && from < end);
  });
}
