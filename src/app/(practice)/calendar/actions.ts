"use server";

import { revalidatePath } from "next/cache";
import { checkRepeat, findClashes, repeatStarts, type Repeat } from "@/lib/calendar";
import { isSessionLength, SESSION_MINUTES } from "@/lib/capture";
import { friendlyDateTime, fromLocalInput, toLocalInput } from "@/lib/dates";
import { parseEventInput, parseSessionWhere, type EventInput, type EventKind } from "@/lib/events";
import { requireSetUpPractice } from "@/lib/practice";
import type { Enums } from "@/lib/supabase/database.types";
import { loadPlaces } from "@/lib/travel";

export type CalendarSession = {
  id: string;
  patientId: string;
  patientName: string;
  startsAt: string; // ISO timestamp
  durationMinutes: number;
  outcome: Enums<"session_outcome"> | null;
  seriesId: string | null;
  invoiceId: string | null;
  invoiceNumber: number | null;
  claimed: boolean;
  placeId: string | null;
  atPatientHome: boolean;
  patientHomeAddress: string | null;
};

/** The sessions starting between two moments ("YYYY-MM-DDTHH:mm", South African time). */
export async function loadCalendar(from: string, to: string): Promise<CalendarSession[]> {
  const { supabase } = await requireSetUpPractice();
  const { data, error } = await supabase
    .from("sessions")
    .select(
      "id, patient_id, starts_at, duration_minutes, outcome, series_id, place_id, at_patient_home, patients(first_name, last_name, home_address), invoices(id, number, claim_batches(sent_at))",
    )
    .gte("starts_at", fromLocalInput(from)!)
    .lt("starts_at", fromLocalInput(to)!)
    .order("starts_at");
  if (error) throw error;

  return data.map((session) => ({
    id: session.id,
    patientId: session.patient_id,
    patientName: `${session.patients.first_name} ${session.patients.last_name}`,
    startsAt: session.starts_at,
    durationMinutes: session.duration_minutes,
    outcome: session.outcome,
    seriesId: session.series_id,
    invoiceId: session.invoices?.id ?? null,
    invoiceNumber: session.invoices?.number ?? null,
    claimed: Boolean(session.invoices?.claim_batches?.sent_at),
    placeId: session.place_id,
    atPatientHome: session.at_patient_home,
    patientHomeAddress: session.patients.home_address,
  }));
}

export type CalendarEvent = {
  id: string;
  kind: EventKind;
  title: string | null;
  startsAt: string; // ISO timestamp
  durationMinutes: number;
  placeId: string | null;
  address: string | null;
};

/** The meetings, training and errands starting between two moments ("YYYY-MM-DDTHH:mm", South African time). */
export async function loadEvents(from: string, to: string): Promise<CalendarEvent[]> {
  const { supabase } = await requireSetUpPractice();
  const { data, error } = await supabase
    .from("events")
    .select("id, kind, title, starts_at, duration_minutes, place_id, address")
    .gte("starts_at", fromLocalInput(from)!)
    .lt("starts_at", fromLocalInput(to)!)
    .order("starts_at");
  if (error) throw error;
  return data.map((event) => ({
    id: event.id,
    kind: event.kind,
    title: event.title,
    startsAt: event.starts_at,
    durationMinutes: event.duration_minutes,
    placeId: event.place_id,
    address: event.address,
  }));
}

export type BookingInput = {
  patientId: string;
  startsAt: string; // YYYY-MM-DDTHH:mm, South African time
  durationMinutes: number;
  repeat: Repeat | null;
  /** A place id, AT_HOME for the patient's home, or "" when not set. */
  where: string;
  /** The patient's home address, when the session is at their home and it isn't saved yet. */
  homeAddress: string;
  /** False the first time, so overlaps are shown before booking anyway. */
  allowClashes: boolean;
};

const lengthError = `Please enter the session length in whole minutes, from ${SESSION_MINUTES.min} to ${SESSION_MINUTES.max}.`;

/** Books a session, or a repeating series of them. Asks once about overlaps with sessions already booked. */
export async function bookSessions(input: BookingInput): Promise<{ error?: string; clashes?: string[]; booked?: number }> {
  if (!fromLocalInput(input.startsAt)) return { error: "Please enter when the session is." };
  if (!input.patientId) return { error: "Please choose a patient." };
  if (!isSessionLength(input.durationMinutes)) return { error: lengthError };
  const repeatError = checkRepeat(input.startsAt, input.repeat);
  if (repeatError) return { error: repeatError };

  const { supabase, practice } = await requireSetUpPractice();
  const { data: patient } = await supabase
    .from("patients")
    .select("id, home_address, usual_place_id, seen_at_home")
    .eq("id", input.patientId)
    .maybeSingle();
  if (!patient) return { error: "Please choose a patient." };
  const where = parseSessionWhere(input.where, await loadPlaces(supabase));
  if (!where.ok) return { error: where.error };
  const homeAddress = await saveHomeAddress(supabase, patient, where.columns.at_patient_home, input.homeAddress);
  if (homeAddress.error) return homeAddress;

  const starts = repeatStarts(input.startsAt, input.repeat).map((start) => fromLocalInput(start)!);

  if (!input.allowClashes) {
    const { data: existing, error } = await supabase
      .from("sessions")
      .select("id, starts_at, duration_minutes, patients(first_name, last_name)")
      // A day either side catches long sessions that start before the first one.
      .gte("starts_at", new Date(new Date(starts[0]).getTime() - 24 * 60 * 60 * 1000).toISOString())
      .lte("starts_at", starts.at(-1)!);
    if (error) throw error;
    const clashes = findClashes(
      starts,
      input.durationMinutes,
      existing.map((s) => ({
        id: s.id,
        startsAt: s.starts_at,
        durationMinutes: s.duration_minutes,
        patientName: `${s.patients.first_name} ${s.patients.last_name}`,
      })),
    );
    if (clashes.length) return { clashes: clashes.map((s) => `${s.patientName}, ${friendlyDateTime(s.startsAt)}`) };
  }

  const seriesId = starts.length > 1 ? crypto.randomUUID() : null;
  const { error } = await supabase.from("sessions").insert(
    starts.map((startsAt) => ({
      practice_id: practice.id,
      patient_id: patient.id,
      starts_at: startsAt,
      duration_minutes: input.durationMinutes,
      series_id: seriesId,
      ...where.columns,
    })),
  );
  if (error) {
    console.error("Booking failed", error);
    return { error: "Something went wrong. Please try again." };
  }
  // A patient with no usual place yet is usually seen where they were first booked.
  if (!patient.usual_place_id && !patient.seen_at_home && input.where) {
    await supabase
      .from("patients")
      .update({ usual_place_id: where.columns.place_id, seen_at_home: where.columns.at_patient_home })
      .eq("id", patient.id);
  }
  revalidatePath("/home");
  return { booked: starts.length };
}

type Supabase = Awaited<ReturnType<typeof requireSetUpPractice>>["supabase"];

/** A session at the patient's home needs their address. Saves one typed in, or asks for it. */
async function saveHomeAddress(
  supabase: Supabase,
  patient: { id: string; home_address: string | null },
  atHome: boolean,
  typed: string,
): Promise<{ error?: string }> {
  if (!atHome || patient.home_address) return {};
  const address = typed.trim();
  if (!address) return { error: "Please enter the patient's home address, so your logbook can count the trip." };
  if (address.length > 300) return { error: "Please shorten the home address to under 300 characters." };
  const { error } = await supabase.from("patients").update({ home_address: address }).eq("id", patient.id);
  if (error) {
    console.error("Saving home address failed", error);
    return { error: "Something went wrong. Please try again." };
  }
  return {};
}

/** Changes where a session is: one of the practice's places, or the patient's home. */
export async function setSessionPlace(input: { id: string; where: string; homeAddress: string }): Promise<{ error?: string }> {
  const { supabase } = await requireSetUpPractice();
  const { data: session } = await supabase
    .from("sessions")
    .select("id, patients(id, home_address)")
    .eq("id", input.id)
    .maybeSingle();
  if (!session) return { error: "That session no longer exists." };
  const where = parseSessionWhere(input.where, await loadPlaces(supabase));
  if (!where.ok) return { error: where.error };
  const homeAddress = await saveHomeAddress(supabase, session.patients, where.columns.at_patient_home, input.homeAddress);
  if (homeAddress.error) return homeAddress;

  const { error } = await supabase.from("sessions").update(where.columns).eq("id", session.id);
  if (error) {
    console.error("Changing session place failed", error);
    return { error: "Something went wrong. Please try again." };
  }
  return {};
}

/** Adds a meeting, training, errand or other work to the calendar, or saves changes when there's an id. */
export async function saveEvent(eventId: string | null, input: EventInput): Promise<{ error?: string }> {
  const { supabase, practice } = await requireSetUpPractice();
  const parsed = parseEventInput(input, await loadPlaces(supabase));
  if (!parsed.ok) return { error: parsed.error };
  const { error } = eventId
    ? await supabase.from("events").update(parsed.row).eq("id", eventId)
    : await supabase.from("events").insert({ ...parsed.row, practice_id: practice.id });
  if (error) {
    console.error("Saving event failed", error);
    return { error: "Something went wrong. Please try again." };
  }
  return {};
}

/** Moves an event to a new time or length, from a drag in the calendar. */
export async function moveEvent(input: { id: string; startsAt: string; durationMinutes: number }): Promise<{ error?: string }> {
  const startsAt = fromLocalInput(input.startsAt);
  if (!startsAt) return { error: "Please enter when it is." };
  const { supabase } = await requireSetUpPractice();
  const { error } = await supabase
    .from("events")
    .update({ starts_at: startsAt, duration_minutes: input.durationMinutes })
    .eq("id", input.id);
  if (error) {
    console.error("Moving event failed", error);
    return { error: "Please keep it between 5 minutes and 12 hours long." };
  }
  return {};
}

export async function deleteEvent(eventId: string): Promise<{ error?: string }> {
  const { supabase } = await requireSetUpPractice();
  const { error } = await supabase.from("events").delete().eq("id", eventId);
  if (error) {
    console.error("Deleting event failed", error);
    return { error: "Something went wrong. Please try again." };
  }
  return {};
}

/** "one" changes just this session; "following" also changes the booked sessions after it in its series. */
export type Scope = "one" | "following";

type Found = { id: string; starts_at: string; outcome: Enums<"session_outcome"> | null; series_id: string | null; claimed: boolean };

async function findSession(id: string): Promise<{ supabase: Supabase; session: Found | null }> {
  const { supabase } = await requireSetUpPractice();
  const { data } = await supabase
    .from("sessions")
    .select("id, starts_at, outcome, series_id, invoices(claim_batches(sent_at))")
    .eq("id", id)
    .maybeSingle();
  const session = data && { ...data, claimed: Boolean(data.invoices?.claim_batches?.sent_at) };
  return { supabase, session };
}

/**
 * Moves a session to a new time or length. A captured session's invoice date moves with it. Moving "this and
 * following" shifts the later booked sessions in the series by the same amount, and gives them the same length.
 */
export async function moveSession(input: { id: string; startsAt: string; durationMinutes: number; scope: Scope }): Promise<{ error?: string }> {
  const startsAt = fromLocalInput(input.startsAt);
  if (!startsAt) return { error: "Please enter when the session is." };
  if (!isSessionLength(input.durationMinutes)) return { error: lengthError };

  const { supabase, session } = await findSession(input.id);
  if (!session) return { error: "That session no longer exists." };
  if (session.claimed) return { error: "This session has been claimed, so it can't be moved." };

  const shift = new Date(startsAt).getTime() - new Date(session.starts_at).getTime();
  const later =
    input.scope === "following" && session.series_id && !session.outcome
      ? await supabase
          .from("sessions")
          .select("id, starts_at")
          .eq("series_id", session.series_id)
          .is("outcome", null)
          .gt("starts_at", session.starts_at)
      : { data: [], error: null };
  if (later.error) throw later.error;

  const moves = [
    { id: session.id, starts_at: startsAt },
    ...later.data.map((s) => ({ id: s.id, starts_at: new Date(new Date(s.starts_at).getTime() + shift).toISOString() })),
  ];
  const results = await Promise.all(
    moves.map((move) =>
      supabase.from("sessions").update({ starts_at: move.starts_at, duration_minutes: input.durationMinutes }).eq("id", move.id),
    ),
  );
  let error = results.find((result) => result.error)?.error;

  // The invoice is dated the day of its session.
  if (!error && session.outcome) {
    const issuedOn = toLocalInput(new Date(startsAt)).slice(0, 10);
    const dueOn = new Date(Date.parse(`${issuedOn}T00:00:00Z`) + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    ({ error } = await supabase.from("invoices").update({ issued_on: issuedOn, due_on: dueOn }).eq("session_id", session.id));
  }
  if (error) {
    console.error("Moving session failed", error);
    return { error: "Something went wrong. Please try again." };
  }
  revalidatePath("/home");
  revalidatePath("/invoices");
  return {};
}

/** Deletes a session, and its invoice if it was captured. "following" also deletes the later booked sessions in its series. */
export async function deleteSession(input: { id: string; scope: Scope }): Promise<{ error?: string }> {
  const { supabase, session } = await findSession(input.id);
  if (!session) return {};
  if (session.claimed) return { error: "This session has been claimed, so it can't be deleted." };

  let { error } = await supabase.from("sessions").delete().eq("id", session.id);
  if (!error && input.scope === "following" && session.series_id && !session.outcome) {
    ({ error } = await supabase
      .from("sessions")
      .delete()
      .eq("series_id", session.series_id)
      .is("outcome", null)
      .gt("starts_at", session.starts_at));
  }
  if (error) {
    console.error("Deleting session failed", error);
    return { error: "Something went wrong. Please try again." };
  }
  revalidatePath("/home");
  revalidatePath("/invoices");
  return {};
}
