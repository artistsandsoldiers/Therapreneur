import type { SupabaseClient } from "@supabase/supabase-js";
import { eventKindLabel, eventTitle } from "./events";
import type { Practice } from "./practice";
import type { Database } from "./supabase/database.types";
import type { Car, Place, Reading } from "./travel";
import { businessShare, carOn, missingDistances, pairKey, workOutTrips, type BusinessShare, type Stop, type Trip, type Visit } from "./trips";

export type LogbookCar = Car & { readings: (Reading & { id: string })[] };

export type CarLogbook = {
  car: LogbookCar;
  trips: Trip[];
  businessKm: number;
  share: BusinessShare;
};

/**
 * Everything the logbook needs for one tax year (from 1 March, "YYYY-MM-DD"), worked out from the calendar up to now:
 * each car's business trips and business share, and what's missing to count every trip.
 */
export async function loadLogbook(supabase: SupabaseClient<Database>, practice: Practice, yearStart: string, now = new Date()) {
  const yearEnd = `${Number(yearStart.slice(0, 4)) + 1}-03-01`;
  const from = new Date(`${yearStart}T00:00:00+02:00`).toISOString();
  const until = new Date(Math.min(now.getTime(), new Date(`${yearEnd}T00:00:00+02:00`).getTime())).toISOString();

  const [sessions, events, places, cars, distances] = await Promise.all([
    supabase
      .from("sessions")
      .select("starts_at, place_id, at_patient_home, patients(id, first_name, last_name, home_address)")
      .gte("starts_at", from)
      .lt("starts_at", until),
    supabase.from("events").select("kind, title, starts_at, place_id, address").gte("starts_at", from).lt("starts_at", until),
    supabase.from("places").select("id, name, address, regular"),
    supabase
      .from("cars")
      .select("id, name, registration, started_on, ended_on, odometer_readings(id, read_on, km)")
      .order("started_on"),
    supabase.from("distances").select("address_a, address_b, km"),
  ]);
  if (sessions.error) throw sessions.error;
  if (events.error) throw events.error;
  if (places.error) throw places.error;
  if (cars.error) throw cars.error;
  if (distances.error) throw distances.error;

  const placeById = new Map(places.data.map((place) => [place.id, place]));
  const placeStop = (id: string): Stop | null => {
    const place: Place | undefined = placeById.get(id);
    return place ? { kind: "place", ...place } : null;
  };

  const visits: Visit[] = [
    ...sessions.data.map((session) => {
      const name = `${session.patients.first_name} ${session.patients.last_name}`;
      if (session.at_patient_home) {
        const stop: Stop = { kind: "patient", id: session.patients.id, name, address: session.patients.home_address };
        return { startsAt: session.starts_at, stop, reason: `Home visit: ${name}`, anonymousReason: "Home visit" };
      }
      const stop = session.place_id ? placeStop(session.place_id) : null;
      const reason = stop?.kind === "place" ? `Sessions at ${stop.name}` : "Session";
      return { startsAt: session.starts_at, stop, reason, anonymousReason: reason };
    }),
    ...events.data.map((event) => {
      const stop: Stop | null = event.place_id ? placeStop(event.place_id) : event.address ? { kind: "address", address: event.address } : null;
      const title = eventTitle(event);
      const reason = title === eventKindLabel(event.kind) ? title : `${eventKindLabel(event.kind)}: ${title}`;
      return { startsAt: event.starts_at, stop, reason, anonymousReason: eventKindLabel(event.kind) };
    }),
  ];

  const km = new Map(distances.data.map((d) => [pairKey(d.address_a, d.address_b), Number(d.km)]));
  const trips = workOutTrips(visits, practice.home_address, km, { homeToPatientIsBusiness: practice.home_to_patient_business });
  const business = trips.filter((trip) => trip.business);

  const yearCars: LogbookCar[] = cars.data
    .filter((car) => car.started_on < yearEnd && (!car.ended_on || car.ended_on > yearStart))
    .map(({ odometer_readings, ...car }) => ({
      ...car,
      readings: odometer_readings.map((r) => ({ id: r.id, readOn: r.read_on, km: r.km })).sort((a, b) => a.readOn.localeCompare(b.readOn)),
    }));

  const logbooks: CarLogbook[] = yearCars.map((car) => {
    const carTrips = trips.filter((trip) => carOn(yearCars, trip.date)?.id === car.id);
    const readings = car.readings.filter((r) => r.readOn >= yearStart && r.readOn < yearEnd);
    return {
      car,
      trips: carTrips.filter((trip) => trip.business),
      businessKm: sumKm(carTrips.filter((trip) => trip.business)),
      share: businessShare(carTrips, readings),
    };
  });

  const patientsWithoutAddress = [
    ...new Set(business.flatMap((trip) => [trip.from, trip.to]).filter((s) => s.kind === "patient" && !s.address).map((s) => (s as { name: string }).name)),
  ];

  return {
    logbooks,
    tripsWithoutCar: business.filter((trip) => !carOn(yearCars, trip.date)),
    missing: missingDistances(trips),
    visitsWithoutPlace: visits.filter((visit) => !visit.stop).length,
    patientsWithoutAddress,
    needsHomeAddress: !practice.home_address && visits.length > 0,
  };
}

export type Logbook = Awaited<ReturnType<typeof loadLogbook>>;

function sumKm(trips: Trip[]): number {
  return Math.round(trips.reduce((total, trip) => total + (trip.km ?? 0), 0) * 10) / 10;
}
