"use client";

import { startTransition, useActionState, useState, useTransition } from "react";
import { addReading, deleteReading, saveCarDetails, startCar, type TravelFormState } from "./travel-actions";
import { field, label, secondaryButton } from "@/app/ui";
import { friendlyDate } from "@/lib/dates";
import { formatKm, type Car } from "@/lib/travel";

export type CarWithReadings = Car & { readings: { id: string; readOn: string; km: number }[] };

/** The car used for work and its odometer readings, which give the total km for the travel logbook. */
export function CarSection({ cars, today }: { cars: CarWithReadings[]; today: string }) {
  const current = cars.find((car) => !car.ended_on) ?? null;
  const past = cars.filter((car) => car.ended_on);
  const [changing, setChanging] = useState(false);

  return (
    <section className="mt-12 border-t border-neutral-100 pt-8">
      <h2 className="mb-1 text-lg font-semibold">Your car</h2>
      <p className="mb-4 text-sm text-neutral-500">
        The car you drive for work. SARS needs its odometer reading at the start and end of each tax year (1 March), and
        a reading now and then keeps your business share up to date.
      </p>

      {current ? (
        <div className="flex flex-col gap-4">
          <CarDetails key={current.id} car={current} />
          <Readings car={current} today={today} />
          {changing ? (
            <StartCarForm current={current} today={today} onCancel={() => setChanging(false)} onStarted={() => setChanging(false)} />
          ) : (
            <button type="button" onClick={() => setChanging(true)} className={`${secondaryButton} self-start`}>
              Changed car?
            </button>
          )}
        </div>
      ) : (
        <StartCarForm current={null} today={today} />
      )}

      {past.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-medium text-neutral-700">Past cars</h3>
          <ul className="flex flex-col gap-1 text-sm text-neutral-500">
            {past.map((car) => (
              <li key={car.id}>
                {car.name}
                {car.registration && ` · ${car.registration}`} · {friendlyDate(car.started_on)} to {friendlyDate(car.ended_on!)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function CarDetails({ car }: { car: CarWithReadings }) {
  const [state, action, saving] = useActionState<TravelFormState, FormData>(saveCarDetails.bind(null, car.id), {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <div className="grid grid-cols-[1fr_10rem] gap-2">
        <input name="name" defaultValue={car.name} aria-label="Car" autoComplete="off" className={field} />
        <input name="registration" defaultValue={car.registration ?? ""} placeholder="Registration" aria-label="Registration" className={field} />
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className={secondaryButton}>{saving ? "Saving…" : "Save"}</button>
        <span className="text-sm text-neutral-500">Used for work since {friendlyDate(car.started_on)}</span>
      </div>
      {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}

export function Readings({ car, today }: { car: CarWithReadings; today: string }) {
  const [state, action, saving] = useActionState<TravelFormState, FormData>(addReading.bind(null, car.id), {});
  const [deleting, startDeleting] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const readings = [...car.readings].sort((a, b) => b.readOn.localeCompare(a.readOn));

  return (
    <div>
      <h3 className="mb-2 text-sm font-medium text-neutral-700">Odometer readings</h3>
      <form action={action} className="flex gap-2">
        <input name="read_on" type="date" defaultValue={today} max={today} aria-label="Day of the reading" className={field} />
        <input name="km" inputMode="numeric" placeholder="km, like 84 312" aria-label="Odometer km" autoComplete="off" className={field} />
        <button type="submit" disabled={saving} className={`${secondaryButton} shrink-0`}>{saving ? "Adding…" : "Add"}</button>
      </form>
      {(state.error || deleteError) && <p role="alert" className="mt-1 text-sm text-red-600">{state.error ?? deleteError}</p>}
      <ul className="mt-3 divide-y divide-neutral-100 border-y border-neutral-100 text-sm">
        {readings.map((reading) => (
          <li key={reading.id} className="flex items-center justify-between gap-3 py-2">
            <span>{friendlyDate(reading.readOn)}</span>
            <span className="flex items-center gap-4">
              {formatKm(reading.km)}
              <button
                type="button"
                disabled={deleting || reading.readOn === car.started_on}
                onClick={() => startDeleting(async () => setDeleteError((await deleteReading(reading.id)).error ?? null))}
                aria-label={`Delete the reading on ${friendlyDate(reading.readOn)}`}
                className="text-neutral-400 hover:text-red-600 disabled:invisible"
              >
                ×
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StartCarForm({
  current,
  today,
  onCancel,
  onStarted,
}: {
  current: CarWithReadings | null;
  today: string;
  onCancel?: () => void;
  onStarted?: () => void;
}) {
  const [state, action, saving] = useActionState<TravelFormState, FormData>(async (previous, form) => {
    const result = await startCar(previous, form);
    if (result.saved) onStarted?.();
    return result;
  }, {});

  return (
    <form
      // Submitting by hand keeps what she typed if there's an error; a form action would clear the fields.
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        startTransition(() => action(form));
      }}
      className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4"
    >
      {current && <h3 className="font-semibold">Your new car</h3>}
      <div className="grid grid-cols-[1fr_10rem] gap-2">
        <input name="name" placeholder="Car, like White Polo" aria-label="Car" autoComplete="off" className={field} />
        <input name="registration" placeholder="Registration" aria-label="Registration" className={field} />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label htmlFor="started_on" className={label}>{current ? "First day in the new car" : "Using it for work since"}</label>
          <input id="started_on" name="started_on" type="date" defaultValue={today} max={today} className={field} />
        </div>
        <div>
          <label htmlFor="km" className={label}>Its odometer that day (km)</label>
          <input id="km" name="km" inputMode="numeric" placeholder="84 312" autoComplete="off" className={field} />
        </div>
      </div>
      {current && (
        <div>
          <label htmlFor="old_car_km" className={label}>Your {current.name}&apos;s last odometer reading (km)</label>
          <input id="old_car_km" name="old_car_km" inputMode="numeric" autoComplete="off" className={field} />
        </div>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className={secondaryButton}>
          {saving ? "Saving…" : current ? "Change car" : "Add car"}
        </button>
        {onCancel && <button type="button" onClick={onCancel} className={secondaryButton}>Cancel</button>}
      </div>
      {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
