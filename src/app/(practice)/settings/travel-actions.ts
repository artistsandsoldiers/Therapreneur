"use server";

import { revalidatePath } from "next/cache";
import { toLocalInput } from "@/lib/dates";
import { requireSetUpPractice } from "@/lib/practice";
import { checkReading, parsePlaceForm, parseReadingForm, parseStartCarForm } from "@/lib/travel";

export type TravelFormState = { error?: string; saved?: boolean };

const today = () => toLocalInput(new Date()).slice(0, 10);

/** Adds a place, or saves changes to one when there's an id. */
export async function savePlace(placeId: string | null, _previous: TravelFormState, form: FormData): Promise<TravelFormState> {
  const parsed = parsePlaceForm(form);
  if (!parsed.ok) return { error: parsed.error };

  const { supabase, practice } = await requireSetUpPractice();
  const { error } = placeId
    ? await supabase.from("places").update(parsed.place).eq("id", placeId)
    : await supabase.from("places").insert({ ...parsed.place, practice_id: practice.id });
  if (error) {
    if (error.code === "23505") return { error: "You already have a place with that name." };
    console.error("Saving place failed", error);
    return { error: "Something went wrong. Please try again." };
  }
  revalidatePath("/settings");
  return { saved: true };
}

/** Deletes a place. Patients usually seen there are left with no usual place. */
export async function deletePlace(placeId: string): Promise<TravelFormState> {
  const { supabase } = await requireSetUpPractice();
  const { error } = await supabase.from("places").delete().eq("id", placeId);
  if (error) {
    // Sessions and events keep their place, so the logbook never loses where a trip went.
    if (error.code === "23503") return { error: "This place has sessions or events in your calendar, so it can't be deleted." };
    console.error("Deleting place failed", error);
    return { error: "Something went wrong. Please try again." };
  }
  revalidatePath("/settings");
  return {};
}

/** Starts using a car for work. A current car ends on the same day with its last reading. */
export async function startCar(_previous: TravelFormState, form: FormData): Promise<TravelFormState> {
  const { supabase } = await requireSetUpPractice();
  const { data: current, error: loadError } = await supabase
    .from("cars")
    .select("id, name, registration, started_on, ended_on, odometer_readings(read_on, km)")
    .is("ended_on", null)
    .maybeSingle();
  if (loadError) throw loadError;

  const parsed = parseStartCarForm(form, current !== null, today());
  if (!parsed.ok) return { error: parsed.error };
  const { car } = parsed;

  if (current) {
    if (car.startedOn <= current.started_on) return { error: `Please pick a day after you started using your ${current.name}.` };
    const readings = current.odometer_readings.map((r) => ({ readOn: r.read_on, km: r.km }));
    const problem = checkReading({ readOn: car.startedOn, km: car.oldCarKm! }, current, readings);
    if (problem) return { error: `Your ${current.name}'s last reading: ${problem}` };
  }

  const { error } = await supabase.rpc("start_car", {
    p_started_on: car.startedOn,
    p_name: car.name,
    p_registration: car.registration ?? "",
    p_km: car.km,
    // The function ignores the old car's reading when there's no current car.
    p_old_car_km: car.oldCarKm ?? 0,
  });
  if (error) {
    console.error("Starting car failed", error);
    return { error: "Something went wrong. Please try again." };
  }
  revalidatePath("/settings");
  return { saved: true };
}

/** Renames a car or fixes its registration. */
export async function saveCarDetails(carId: string, _previous: TravelFormState, form: FormData): Promise<TravelFormState> {
  const name = String(form.get("name") ?? "").trim();
  const registration = String(form.get("registration") ?? "").trim().toUpperCase() || null;
  if (!name || name.length > 60) return { error: "Please name the car in under 60 characters." };
  if (registration && registration.length > 20) return { error: "Please check the registration number." };

  const { supabase } = await requireSetUpPractice();
  const { error } = await supabase.from("cars").update({ name, registration }).eq("id", carId);
  if (error) {
    console.error("Saving car failed", error);
    return { error: "Something went wrong. Please try again." };
  }
  revalidatePath("/settings");
  return { saved: true };
}

/** Records what the odometer showed on a day, replacing any reading already on that day. */
export async function addReading(carId: string, _previous: TravelFormState, form: FormData): Promise<TravelFormState> {
  const parsed = parseReadingForm(form, today());
  if (!parsed.ok) return { error: parsed.error };

  const { supabase, practice } = await requireSetUpPractice();
  const { data: car, error: loadError } = await supabase
    .from("cars")
    .select("id, name, registration, started_on, ended_on, odometer_readings(read_on, km)")
    .eq("id", carId)
    .single();
  if (loadError) throw loadError;
  const problem = checkReading(parsed.reading, car, car.odometer_readings.map((r) => ({ readOn: r.read_on, km: r.km })));
  if (problem) return { error: problem };

  const { error } = await supabase
    .from("odometer_readings")
    .upsert(
      { practice_id: practice.id, car_id: carId, read_on: parsed.reading.readOn, km: parsed.reading.km },
      { onConflict: "car_id,read_on" },
    );
  if (error) {
    console.error("Saving odometer reading failed", error);
    return { error: "Something went wrong. Please try again." };
  }
  revalidatePath("/settings");
  return { saved: true };
}

/** Deletes a reading, except the one from the day the car started, which the logbook counts from. */
export async function deleteReading(readingId: string): Promise<TravelFormState> {
  const { supabase } = await requireSetUpPractice();
  const { data: reading, error: loadError } = await supabase
    .from("odometer_readings")
    .select("read_on, cars(started_on)")
    .eq("id", readingId)
    .single();
  if (loadError) throw loadError;
  if (reading.read_on === reading.cars.started_on) {
    return { error: "That's the car's first reading. To fix it, add a new reading on the same day." };
  }

  const { error } = await supabase.from("odometer_readings").delete().eq("id", readingId);
  if (error) {
    console.error("Deleting odometer reading failed", error);
    return { error: "Something went wrong. Please try again." };
  }
  revalidatePath("/settings");
  return {};
}
