"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { deleteSession, moveSession, setSessionPlace, type CalendarSession, type Scope } from "./actions";
import { WhereField } from "./where-field";
import { saveCapture } from "../sessions/actions";
import { WhenFields } from "../sessions/when-fields";
import { button, secondaryButton } from "@/app/ui";
import { sessionState } from "@/lib/calendar";
import { friendlySessionTime, toLocalInput } from "@/lib/dates";
import { whereValue } from "@/lib/events";
import { invoiceNumber } from "@/lib/invoices";
import type { Place } from "@/lib/travel";

const STATE_TEXT = { booked: "Booked", to_capture: "To capture", attended: "Attended", no_show: "No-show" };

/** What a tap on a session in the calendar opens: capture it, change its time, or delete it. */
export function SessionSheet({ session, places, onChanged }: { session: CalendarSession; places: Place[]; onChanged: () => void }) {
  const state = sessionState(session);
  const started = new Date(session.startsAt).getTime() <= Date.now();
  // Only booked sessions change with their series; a captured one stands alone.
  const inSeries = Boolean(session.seriesId && !session.outcome);

  const [moving, setMoving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [where, setWhere] = useState(whereValue({ place_id: session.placeId, at_patient_home: session.atPatientHome }));
  const [homeAddress, setHomeAddress] = useState("");
  const [startsAt, setStartsAt] = useState(toLocalInput(new Date(session.startsAt)));
  const [duration, setDuration] = useState(String(session.durationMinutes));
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  function run(action: () => Promise<{ error?: string } | undefined>) {
    setError(null);
    startSaving(async () => {
      const result = await action();
      if (result?.error) setError(result.error);
      else onChanged();
    });
  }

  const move = (scope: Scope) =>
    run(() => moveSession({ id: session.id, startsAt, durationMinutes: Number(duration), scope }));
  const place = () => run(() => setSessionPlace({ id: session.id, where, homeAddress }));
  const placeName = session.atPatientHome
    ? "At the patient's home"
    : session.placeId
      ? `At ${places.find((p) => p.id === session.placeId)?.name ?? "a place"}`
      : "Where not set";
  const remove = (scope: Scope) => run(() => deleteSession({ id: session.id, scope }));
  // One tap: billed to the patient at the no-show price, then shows the invoice.
  const noShow = () =>
    run(() =>
      saveCapture({
        sessionId: session.id,
        patientId: session.patientId,
        startsAt: toLocalInput(new Date(session.startsAt)),
        durationMinutes: session.durationMinutes,
        outcome: "no_show",
        billTo: "patient",
        note: "",
        lines: [],
      }),
    );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-medium">{friendlySessionTime(session.startsAt, session.durationMinutes)}</p>
        <p className="mt-1 text-sm text-neutral-500">
          {STATE_TEXT[state]}
          {session.claimed && " · Claimed"}
          {inSeries && " · Repeats"}
          {` · ${placeName}`}
          {session.invoiceId && session.invoiceNumber !== null && (
            <>
              {" · "}
              <Link href={`/invoices/${session.invoiceId}`} className="text-accent">{invoiceNumber(session.invoiceNumber)}</Link>
            </>
          )}
        </p>
      </div>

      {!session.outcome && started && (
        <div className="grid grid-cols-2 gap-2">
          <Link href={`/sessions/${session.id}/edit`} className={`${button} text-center`}>Capture</Link>
          <button type="button" onClick={noShow} disabled={saving} className={secondaryButton}>No-show</button>
        </div>
      )}

      {session.claimed ? (
        <p className="text-neutral-600">
          This session has been claimed, so it can&apos;t be moved or deleted.{" "}
          <Link href={`/sessions/${session.id}/edit`} className="text-accent">Edit its note</Link>
        </p>
      ) : placing ? (
        <section className="flex flex-col gap-4 rounded-lg border border-neutral-200 p-4">
          <WhereField
            places={places}
            value={where}
            onChange={setWhere}
            needsAddress={!session.patientHomeAddress}
            address={homeAddress}
            onAddress={setHomeAddress}
          />
          <div className="flex gap-2">
            <button type="button" onClick={place} disabled={saving} className={button}>Save</button>
            <button type="button" onClick={() => setPlacing(false)} className="px-2 text-neutral-500">Cancel</button>
          </div>
        </section>
      ) : moving ? (
        <section className="flex flex-col gap-4 rounded-lg border border-neutral-200 p-4">
          <WhenFields startsAt={startsAt} onStartsAt={setStartsAt} duration={duration} onDuration={setDuration} />
          {session.outcome && <p className="text-sm text-neutral-500">The invoice date moves with the session.</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => move("one")} disabled={saving} className={button}>
              {inSeries ? "Move this session" : "Save"}
            </button>
            {inSeries && (
              <button type="button" onClick={() => move("following")} disabled={saving} className={secondaryButton}>
                Move this and following
              </button>
            )}
            <button type="button" onClick={() => setMoving(false)} className="px-2 text-neutral-500">Cancel</button>
          </div>
        </section>
      ) : deleting ? (
        <section className="flex flex-col gap-3 rounded-lg border border-red-200 p-4">
          <p>
            {session.invoiceId
              ? "This also deletes its invoice. This can't be undone."
              : inSeries
                ? "Delete just this session, or this one and the later sessions in the repeat?"
                : "Delete this booking?"}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => remove("one")} disabled={saving} className={`${secondaryButton} text-red-600`}>
              {session.invoiceId ? "Delete session and invoice" : inSeries ? "Delete this session" : "Delete"}
            </button>
            {inSeries && (
              <button type="button" onClick={() => remove("following")} disabled={saving} className={`${secondaryButton} text-red-600`}>
                Delete this and following
              </button>
            )}
            <button type="button" onClick={() => setDeleting(false)} className="px-2 text-neutral-500">Cancel</button>
          </div>
        </section>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setMoving(true)} className={secondaryButton}>Change time</button>
          <button type="button" onClick={() => setPlacing(true)} className={secondaryButton}>Change where</button>
          <button type="button" onClick={() => setDeleting(true)} className={`${secondaryButton} text-red-600`}>Delete</button>
        </div>
      )}

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
