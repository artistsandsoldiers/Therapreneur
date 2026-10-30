import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "./supabase/database.types";

// The travel logbook (docs/features/travel.md): places, patients' homes, the car and its odometer readings.

export type Place = Pick<Tables<"places">, "id" | "name" | "address" | "regular">;
export type Car = Pick<Tables<"cars">, "id" | "name" | "registration" | "started_on" | "ended_on">;
export type Reading = { readOn: string; km: number };

/** The value of the patient form's "Usually seen" option for the patient's home. */
export const AT_HOME = "home";

type Parsed<T> = { ok: true } & T | { ok: false; error: string };

/** Validates a place: a name and an address. Places are regular unless the advanced box says otherwise. */
export function parsePlaceForm(form: FormData): Parsed<{ place: { name: string; address: string; regular: boolean } }> {
  const text = (name: string) => String(form.get(name) ?? "").trim();
  const name = text("name");
  const address = text("address");
  if (!name) return { ok: false, error: "Please name the place, like “My rooms”." };
  if (name.length > 60) return { ok: false, error: "Please shorten the name to under 60 characters." };
  if (!address) return { ok: false, error: "Please enter the place's address." };
  if (address.length > 300) return { ok: false, error: "Please shorten the address to under 300 characters." };
  return { ok: true, place: { name, address, regular: form.get("not_regular") !== "yes" } };
}

/**
 * Reads where a patient is usually seen. A home visit needs their address. When the form has no "Usually seen"
 * field, nothing changes. The address is only touched when home is chosen, so switching away keeps it.
 */
export function parseUsualPlace(
  form: FormData,
): Parsed<{ columns: { seen_at_home?: boolean; usual_place_id?: string | null; home_address?: string } }> {
  if (!form.has("usual_place")) return { ok: true, columns: {} };
  const picked = String(form.get("usual_place")).trim();
  if (picked !== AT_HOME) return { ok: true, columns: { seen_at_home: false, usual_place_id: picked || null } };

  const address = String(form.get("home_address") ?? "").trim();
  if (!address) return { ok: false, error: "Please enter the patient's home address for home visits." };
  if (address.length > 300) return { ok: false, error: "Please shorten the home address to under 300 characters." };
  return { ok: true, columns: { seen_at_home: true, usual_place_id: null, home_address: address } };
}

/** Validates starting a car: its name, registration, start date and odometer, plus the old car's last reading. */
export function parseStartCarForm(
  form: FormData,
  hasCurrentCar: boolean,
  today: string,
): Parsed<{ car: { startedOn: string; name: string; registration: string | null; km: number; oldCarKm: number | null } }> {
  const text = (name: string) => String(form.get(name) ?? "").trim();
  const name = text("name");
  if (!name) return { ok: false, error: "Please name the car, like “White Polo”." };
  if (name.length > 60) return { ok: false, error: "Please shorten the car's name to under 60 characters." };
  const registration = text("registration").toUpperCase() || null;
  if (registration && registration.length > 20) return { ok: false, error: "Please check the registration number." };

  const startedOn = text("started_on");
  if (!isDate(startedOn) || startedOn > today) return { ok: false, error: "Please enter the day you started using this car, not in the future." };
  const km = parseKm(text("km"));
  if (km === null) return { ok: false, error: "Please enter the odometer reading in whole km, like 84 312." };

  if (!hasCurrentCar) return { ok: true, car: { startedOn, name, registration, km, oldCarKm: null } };
  const oldCarKm = parseKm(text("old_car_km"));
  if (oldCarKm === null) return { ok: false, error: "Please enter your old car's last odometer reading, in whole km." };
  return { ok: true, car: { startedOn, name, registration, km, oldCarKm } };
}

/** Validates an odometer reading: a day that isn't in the future and whole km. */
export function parseReadingForm(form: FormData, today: string): Parsed<{ reading: Reading }> {
  const readOn = String(form.get("read_on") ?? "").trim();
  if (!isDate(readOn) || readOn > today) return { ok: false, error: "Please enter the day of the reading, not in the future." };
  const km = parseKm(String(form.get("km") ?? ""));
  if (km === null) return { ok: false, error: "Please enter the odometer reading in whole km, like 84 312." };
  return { ok: true, reading: { readOn, km } };
}

/**
 * Odometers only go up, so a reading must be at least the one before it and at most the one after it. Also checks it
 * falls while the car was in use. Returns the problem in plain words, or null.
 */
export function checkReading(reading: Reading, car: Car, others: Reading[]): string | null {
  if (reading.readOn < car.started_on || (car.ended_on && reading.readOn > car.ended_on)) {
    return "That day is outside the time you used this car.";
  }
  const rest = others.filter((other) => other.readOn !== reading.readOn);
  const before = rest.filter((other) => other.readOn < reading.readOn).sort((a, b) => b.readOn.localeCompare(a.readOn))[0];
  const after = rest.filter((other) => other.readOn > reading.readOn).sort((a, b) => a.readOn.localeCompare(b.readOn))[0];
  if (before && reading.km < before.km) return `That's lower than ${formatKm(before.km)} on an earlier day. Please check it.`;
  if (after && reading.km > after.km) return `That's higher than ${formatKm(after.km)} on a later day. Please check it.`;
  return null;
}

/** Whole km typed with or without spaces or commas, like "84 312". Null if it isn't one. */
export function parseKm(input: string): number | null {
  const digits = input.replace(/[\s,]/g, "");
  if (!/^\d{1,7}$/.test(digits)) return null;
  return Number(digits);
}

/** 84312 -> "84 312 km" */
export function formatKm(km: number): string {
  return `${String(km).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} km`;
}

/** The practice's places, alphabetically. */
export async function loadPlaces(supabase: SupabaseClient<Database>): Promise<Place[]> {
  const { data, error } = await supabase.from("places").select("id, name, address, regular").order("name");
  if (error) throw error;
  return data;
}

function isDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value) && value >= "2000-01-01";
}
