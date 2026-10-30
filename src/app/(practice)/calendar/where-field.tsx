"use client";

import { field, label } from "@/app/ui";
import { AT_HOME, type Place } from "@/lib/travel";

/**
 * Where a session is: one of the practice's places, or the patient's home. Asks for the patient's home address when
 * it isn't saved yet, so the logbook can count the trip.
 */
export function WhereField({
  places,
  value,
  onChange,
  needsAddress,
  address,
  onAddress,
}: {
  places: Place[];
  value: string;
  onChange: (value: string) => void;
  needsAddress: boolean;
  address: string;
  onAddress: (value: string) => void;
}) {
  return (
    <section>
      <label htmlFor="where" className={label}>Where</label>
      <select id="where" value={value} onChange={(event) => onChange(event.target.value)} className={field}>
        <option value="">Not set</option>
        {places.map((place) => <option key={place.id} value={place.id}>At {place.name}</option>)}
        <option value={AT_HOME}>At the patient&apos;s home</option>
      </select>
      {value === AT_HOME && needsAddress && (
        <textarea
          value={address}
          onChange={(event) => onAddress(event.target.value)}
          placeholder="The patient's home address"
          aria-label="The patient's home address"
          rows={2}
          className={`${field} mt-2`}
        />
      )}
      {places.length === 0 && value !== AT_HOME && (
        <p className="mt-1 text-sm text-neutral-500">Add your rooms under Settings to choose them here.</p>
      )}
    </section>
  );
}
