"use client";

import { useState, useTransition } from "react";
import { bookSessions } from "./actions";
import { AddPatient } from "../sessions/capture-form";
import { WhenFields } from "../sessions/when-fields";
import { WhereField } from "./where-field";
import { button, field, label, secondaryButton } from "@/app/ui";
import { repeatStarts, type Repeat } from "@/lib/calendar";
import type { CaptureData, Patient } from "@/lib/capture-data";
import { whereValue } from "@/lib/events";

export type BookFormProps = Pick<CaptureData, "medicalAids" | "referrers" | "places" | "defaultMedicalAidId"> & {
  patients: Patient[];
  startsAt: string;
  durationMinutes: number;
  onBooked: () => void;
};

type Ends = "after" | "on";

/** Books a session ahead, with an optional weekly or fortnightly repeat. Captured later, after it happens. */
export function BookForm({ medicalAids, referrers, places, defaultMedicalAidId, onBooked, ...props }: BookFormProps) {
  const [patients, setPatients] = useState(props.patients);
  const [patientId, setPatientId] = useState("");
  const [where, setWhere] = useState("");
  const [homeAddress, setHomeAddress] = useState("");
  const [addingPatient, setAddingPatient] = useState(patients.length === 0);
  const [startsAt, setStartsAt] = useState(props.startsAt);
  const [duration, setDuration] = useState(String(props.durationMinutes));
  const [everyWeeks, setEveryWeeks] = useState<0 | 1 | 2>(0);
  const [ends, setEnds] = useState<Ends>("after");
  const [count, setCount] = useState("6");
  const [endsOn, setEndsOn] = useState("");
  const [clashes, setClashes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const repeat: Repeat | null = everyWeeks
    ? { everyWeeks, ends: ends === "after" ? { after: Number(count) } : { on: endsOn } }
    : null;
  const patient = patients.find((p) => p.id === patientId);

  // A session starts where its patient is usually seen.
  function pickPatient(picked: Patient) {
    changed(setPatientId)(picked.id);
    setWhere(whereValue({ place_id: picked.usual_place_id, at_patient_home: picked.seen_at_home }));
  }

  const sessions = repeat && /^\d{4}-\d{2}-\d{2}T/.test(startsAt) ? repeatStarts(startsAt, repeat).length : 1;

  // Any change means the overlaps shown no longer apply.
  function changed<T>(set: (value: T) => void) {
    return (value: T) => {
      set(value);
      setClashes([]);
    };
  }

  function book() {
    setError(null);
    startSaving(async () => {
      const result = await bookSessions({
        patientId,
        startsAt,
        durationMinutes: Number(duration),
        repeat,
        where,
        homeAddress,
        allowClashes: clashes.length > 0,
      });
      if (result.error) setError(result.error);
      else if (result.clashes) setClashes(result.clashes);
      else onBooked();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <section>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label htmlFor="patient" className={label}>Patient</label>
            <select
              id="patient"
              value={patientId}
              onChange={(event) => pickPatient(patients.find((p) => p.id === event.target.value)!)}
              className={field}
            >
              <option value="" disabled>{patients.length ? "Choose a patient…" : "No patients yet"}</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
              ))}
            </select>
          </div>
          {!addingPatient && (
            <button type="button" onClick={() => setAddingPatient(true)} className={secondaryButton}>
              + New
            </button>
          )}
        </div>
        {addingPatient && (
          <AddPatient
            medicalAids={medicalAids}
            referrers={referrers}
            places={places}
            defaultMedicalAidId={defaultMedicalAidId}
            onCancel={patients.length ? () => setAddingPatient(false) : undefined}
            onAdded={(added) => {
              setPatients((current) =>
                [...current, added].sort((a, b) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)),
              );
              pickPatient(added);
              setAddingPatient(false);
            }}
          />
        )}
      </section>

      <WhenFields startsAt={startsAt} onStartsAt={changed(setStartsAt)} duration={duration} onDuration={changed(setDuration)} />

      <WhereField
        places={places}
        value={where}
        onChange={setWhere}
        needsAddress={!patient?.home_address}
        address={homeAddress}
        onAddress={setHomeAddress}
      />

      <section className="flex flex-col gap-3">
        <label htmlFor="repeat" className={label}>Repeat</label>
        <select
          id="repeat"
          value={everyWeeks}
          onChange={(event) => changed(setEveryWeeks)(Number(event.target.value) as 0 | 1 | 2)}
          className={field}
        >
          <option value={0}>Doesn&apos;t repeat</option>
          <option value={1}>Every week</option>
          <option value={2}>Every 2 weeks</option>
        </select>
        {everyWeeks > 0 && (
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2">
              <input type="radio" name="ends" checked={ends === "after"} onChange={() => changed(setEnds)("after")} className="accent-accent" />
              For
              <input
                inputMode="numeric"
                value={count}
                onChange={(event) => changed(setCount)(event.target.value.replace(/\D/g, ""))}
                onFocus={() => changed(setEnds)("after")}
                aria-label="Number of sessions"
                className={`${field.replace("w-full", "w-20")} py-1.5`}
              />
              sessions
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="ends" checked={ends === "on"} onChange={() => changed(setEnds)("on")} className="accent-accent" />
              Until
              <input
                type="date"
                value={endsOn}
                onChange={(event) => changed(setEndsOn)(event.target.value)}
                onFocus={() => changed(setEnds)("on")}
                aria-label="Last date"
                className={`${field.replace("w-full", "w-44")} py-1.5`}
              />
            </label>
            <p className="text-sm text-neutral-500">Repeats stop after a year at most.</p>
          </div>
        )}
      </section>

      <section className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t border-neutral-100 bg-white px-4 py-3">
        {clashes.length > 0 && (
          <div role="alert" className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-medium">This overlaps with {clashes.length === 1 ? "a session" : `${clashes.length} sessions`} already booked:</p>
            <ul className="mt-1 list-disc pl-5">
              {clashes.slice(0, 3).map((clash) => <li key={clash}>{clash}</li>)}
            </ul>
            {clashes.length > 3 && <p className="mt-1">and {clashes.length - 3} more.</p>}
          </div>
        )}
        <button type="button" onClick={book} disabled={saving || addingPatient} className={button}>
          {saving ? "Booking…" : `${clashes.length ? "Book anyway" : "Book"}${sessions > 1 ? ` ${sessions} sessions` : ""}`}
        </button>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      </section>
    </div>
  );
}
