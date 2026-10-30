"use client";

import { startTransition, useActionState, useState, useTransition } from "react";
import { deletePlace, savePlace, type TravelFormState } from "./travel-actions";
import { field, secondaryButton } from "@/app/ui";
import type { Place } from "@/lib/travel";

/** Where the practitioner sees patients, like their rooms or a hospital, for the travel logbook. */
export function PlacesForm({ places }: { places: Place[] }) {
  const [adding, setAdding] = useState(places.length === 0);

  return (
    <section className="mt-12 border-t border-neutral-100 pt-8">
      <h2 className="mb-1 text-lg font-semibold">Where you see patients</h2>
      <p className="mb-4 text-sm text-neutral-500">
        Your rooms, or a hospital you work at. Sessions happen at one of these or at the patient&apos;s home, and your
        travel logbook works out the trips between them.
      </p>
      <div className="flex flex-col gap-4">
        {places.map((place) => (
          <PlaceRow key={place.id} place={place} />
        ))}
        {adding ? (
          <PlaceRow onSaved={() => setAdding(false)} onCancel={places.length ? () => setAdding(false) : undefined} />
        ) : (
          <button type="button" onClick={() => setAdding(true)} className={`${secondaryButton} self-start`}>
            + Add a place
          </button>
        )}
      </div>
    </section>
  );
}

function PlaceRow({ place, onSaved, onCancel }: { place?: Place; onSaved?: () => void; onCancel?: () => void }) {
  const [state, action, saving] = useActionState<TravelFormState, FormData>(async (previous, form) => {
    const result = await savePlace(place?.id ?? null, previous, form);
    if (result.saved) onSaved?.();
    return result;
  }, {});
  const [deleting, startDeleting] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  return (
    <form
      // Submitting by hand keeps what she typed if there's an error; a form action would clear the fields.
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        startTransition(() => action(form));
      }}
      className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-4"
    >
      <input name="name" defaultValue={place?.name} placeholder="Name, like My rooms" aria-label="Place name" autoComplete="off" className={field} />
      <textarea name="address" defaultValue={place?.address} placeholder="Address" aria-label="Address" rows={2} className={field} />
      <details className="text-sm text-neutral-500" open={place ? !place.regular : false}>
        <summary className="cursor-pointer">Advanced</summary>
        <label className="mt-2 flex items-start gap-2">
          <input type="checkbox" name="not_regular" value="yes" defaultChecked={place ? !place.regular : false} className="mt-1 accent-accent" />
          <span>
            Count driving here from home as a business trip. Only tick this if your tax practitioner says it isn&apos;t a
            regular place of work for you.
          </span>
        </label>
      </details>
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className={secondaryButton}>
          {saving ? "Saving…" : place ? "Save" : "Add place"}
        </button>
        {onCancel && <button type="button" onClick={onCancel} className={secondaryButton}>Cancel</button>}
        {place && (
          <button
            type="button"
            disabled={deleting}
            onClick={() => {
              if (!confirm(`Delete ${place.name}? Patients usually seen there will need a new place.`)) return;
              startDeleting(async () => setDeleteError((await deletePlace(place.id)).error ?? null));
            }}
            className="ml-auto text-sm text-neutral-500 hover:text-red-600"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        )}
      </div>
      {(state.error || deleteError) && <p role="alert" className="text-sm text-red-600">{state.error ?? deleteError}</p>}
      {state.saved && place && <p className="text-sm text-neutral-500">Saved.</p>}
    </form>
  );
}
