"use client";

import { useState, useTransition } from "react";
import { deleteEvent, saveEvent, type CalendarEvent } from "./actions";
import { WhenFields } from "../sessions/when-fields";
import { button, field, label, secondaryButton } from "@/app/ui";
import { toLocalInput } from "@/lib/dates";
import { ELSEWHERE, eventKindLabel, type EventKind } from "@/lib/events";
import type { Place } from "@/lib/travel";

/** Adds or changes a meeting, training, errand or other work. It needs a place or an address for the logbook. */
export function EventForm({
  kind,
  places,
  event,
  startsAt: initialStartsAt,
  durationMinutes,
  onDone,
}: {
  kind: EventKind;
  places: Place[];
  event?: CalendarEvent;
  startsAt: string;
  durationMinutes: number;
  onDone: () => void;
}) {
  const [title, setTitle] = useState(event?.title ?? "");
  const [startsAt, setStartsAt] = useState(event ? toLocalInput(new Date(event.startsAt)) : initialStartsAt);
  const [duration, setDuration] = useState(String(event?.durationMinutes ?? durationMinutes));
  const [where, setWhere] = useState(event ? (event.placeId ?? ELSEWHERE) : places.length ? "" : ELSEWHERE);
  const [address, setAddress] = useState(event?.address ?? "");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  function run(action: () => Promise<{ error?: string }>) {
    setError(null);
    startSaving(async () => {
      const result = await action();
      if (result.error) setError(result.error);
      else onDone();
    });
  }

  const save = () =>
    run(() => saveEvent(event?.id ?? null, { kind, title, startsAt, durationMinutes: Number(duration), where, address }));

  return (
    <div className="flex flex-col gap-6">
      <section>
        <label htmlFor="title" className={label}>Title (optional)</label>
        <input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={EXAMPLES[kind]}
          autoComplete="off"
          className={field}
        />
      </section>

      <WhenFields startsAt={startsAt} onStartsAt={setStartsAt} duration={duration} onDuration={setDuration} />

      <section>
        <label htmlFor="event-where" className={label}>Where</label>
        <select id="event-where" value={where} onChange={(e) => setWhere(e.target.value)} className={field}>
          {places.length > 0 && <option value="" disabled>Choose…</option>}
          {places.map((place) => <option key={place.id} value={place.id}>At {place.name}</option>)}
          <option value={ELSEWHERE}>Somewhere else</option>
        </select>
        {where === ELSEWHERE && (
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Address"
            aria-label="Address"
            rows={2}
            className={`${field} mt-2`}
          />
        )}
        <p className="mt-1 text-sm text-neutral-500">Your travel logbook counts the trip there and back.</p>
      </section>

      <section className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t border-neutral-100 bg-white px-4 py-3">
        {deleting ? (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => run(() => deleteEvent(event!.id))} disabled={saving} className={`${secondaryButton} text-red-600`}>
              Delete
            </button>
            <button type="button" onClick={() => setDeleting(false)} className="px-2 text-neutral-500">Cancel</button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button type="button" onClick={save} disabled={saving} className={`${button} flex-1`}>
              {saving ? "Saving…" : event ? "Save" : `Add ${eventKindLabel(kind).toLowerCase()}`}
            </button>
            {event && (
              <button type="button" onClick={() => setDeleting(true)} className={`${secondaryButton} text-red-600`}>Delete</button>
            )}
          </div>
        )}
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      </section>
    </div>
  );
}

const EXAMPLES: Record<EventKind, string> = {
  meeting: "Like a meeting at a school",
  training: "Like a CPD course",
  errand: "Like buying therapy supplies",
  other: "Like admin at your rooms",
};
