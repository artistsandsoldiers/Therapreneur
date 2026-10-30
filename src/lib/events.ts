import { fromLocalInput } from "./dates";
import type { Enums } from "./supabase/database.types";
import { AT_HOME, type Place } from "./travel";

// Calendar events that aren't sessions (docs/features/travel.md): they make trips but never an invoice.

export type EventKind = Enums<"event_kind">;

export const EVENT_KINDS: [EventKind, string][] = [
  ["meeting", "Meeting"],
  ["training", "Training"],
  ["errand", "Errand"],
  ["other", "Other work"],
];

// Training can take a whole day.
export const EVENT_MINUTES = { min: 5, max: 720 } as const;

/** The value of the event form's "Where" option for an address typed in. */
export const ELSEWHERE = "elsewhere";

export function eventKindLabel(kind: EventKind): string {
  return EVENT_KINDS.find(([value]) => value === kind)?.[1] ?? "Other work";
}

/** What an event shows in the calendar: its title, or its kind when it has none. */
export function eventTitle(event: { kind: EventKind; title: string | null }): string {
  return event.title || eventKindLabel(event.kind);
}

export type EventInput = {
  kind: string;
  title: string;
  startsAt: string; // YYYY-MM-DDTHH:mm, South African time
  durationMinutes: number;
  /** One of the practice's places, or ELSEWHERE for the address. */
  where: string;
  address: string;
};

export type EventRow = {
  kind: EventKind;
  title: string | null;
  starts_at: string;
  duration_minutes: number;
  place_id: string | null;
  address: string | null;
};

/** Validates an event as typed. Returns the row to save or the first problem, in plain words. */
export function parseEventInput(input: EventInput, places: Place[]): { ok: true; row: EventRow } | { ok: false; error: string } {
  const kind = EVENT_KINDS.find(([value]) => value === input.kind)?.[0];
  if (!kind) return { ok: false, error: "Please choose what this is." };
  const title = input.title.trim();
  if (title.length > 100) return { ok: false, error: "Please shorten the title to under 100 characters." };
  const startsAt = fromLocalInput(input.startsAt);
  if (!startsAt) return { ok: false, error: "Please enter when it is." };
  const minutes = input.durationMinutes;
  if (!Number.isInteger(minutes) || minutes < EVENT_MINUTES.min || minutes > EVENT_MINUTES.max) {
    return { ok: false, error: `Please enter how long it takes, from ${EVENT_MINUTES.min} minutes to 12 hours.` };
  }

  const base = { kind, title: title || null, starts_at: startsAt, duration_minutes: minutes };
  if (input.where === ELSEWHERE) {
    const address = input.address.trim();
    if (!address) return { ok: false, error: "Please enter the address, so your logbook can count the trip." };
    if (address.length > 300) return { ok: false, error: "Please shorten the address to under 300 characters." };
    return { ok: true, row: { ...base, place_id: null, address } };
  }
  if (!places.some((place) => place.id === input.where)) return { ok: false, error: "Please choose where it is." };
  return { ok: true, row: { ...base, place_id: input.where, address: null } };
}

/** Where a session is, as the booking form's "Where" picker sends it: a place, the patient's home, or not set. */
export function parseSessionWhere(
  where: string,
  places: Place[],
): { ok: true; columns: { place_id: string | null; at_patient_home: boolean } } | { ok: false; error: string } {
  if (where === AT_HOME) return { ok: true, columns: { place_id: null, at_patient_home: true } };
  if (!where) return { ok: true, columns: { place_id: null, at_patient_home: false } };
  if (!places.some((place) => place.id === where)) return { ok: false, error: "Please choose where the session is." };
  return { ok: true, columns: { place_id: where, at_patient_home: false } };
}

/** The "Where" picker's value for a session or patient: a place id, AT_HOME, or "" when not set. */
export function whereValue(row: { place_id: string | null; at_patient_home: boolean }): string {
  return row.at_patient_home ? AT_HOME : (row.place_id ?? "");
}
