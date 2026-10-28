"use server";

import { revalidatePath } from "next/cache";
import { checkRepeat, findClashes, repeatStarts, type Repeat } from "@/lib/calendar";
import { isSessionLength, SESSION_MINUTES } from "@/lib/capture";
import { friendlyDateTime, fromLocalInput, toLocalInput } from "@/lib/dates";
import { requireSetUpPractice } from "@/lib/practice";
import type { Enums } from "@/lib/supabase/database.types";

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
};

/** The sessions starting between two moments ("YYYY-MM-DDTHH:mm", South African time). */
export async function loadCalendar(from: string, to: string): Promise<CalendarSession[]> {
  const { supabase } = await requireSetUpPractice();
  const { data, error } = await supabase
    .from("sessions")
    .select("id, patient_id, starts_at, duration_minutes, outcome, series_id, patients(first_name, last_name), invoices(id, number, claim_batches(sent_at))")
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
  }));
}

export type BookingInput = {
  patientId: string;
  startsAt: string; // YYYY-MM-DDTHH:mm, South African time
  durationMinutes: number;
  repeat: Repeat | null;
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
  const { data: patient } = await supabase.from("patients").select("id").eq("id", input.patientId).maybeSingle();
  if (!patient) return { error: "Please choose a patient." };

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
    })),
  );
  if (error) {
    console.error("Booking failed", error);
    return { error: "Something went wrong. Please try again." };
  }
  revalidatePath("/home");
  return { booked: starts.length };
}

/** "one" changes just this session; "following" also changes the booked sessions after it in its series. */
export type Scope = "one" | "following";

type Found = { id: string; starts_at: string; outcome: Enums<"session_outcome"> | null; series_id: string | null; claimed: boolean };

async function findSession(id: string): Promise<{ supabase: Awaited<ReturnType<typeof requireSetUpPractice>>["supabase"]; session: Found | null }> {
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
