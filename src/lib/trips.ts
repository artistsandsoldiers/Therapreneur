import { toLocalInput } from "./dates";
import type { Car, Reading } from "./travel";

// Trips worked out from the calendar for the travel logbook (docs/features/travel.md). Each day starts and ends at
// home, and visits the stops of its sessions and events in time order. SARS counts driving between home and a regular
// place of work as private; every other trip is business, except home to a patient's home while the cautious setting
// is on.

export type Stop =
  | { kind: "home"; address: string | null }
  | { kind: "place"; id: string; name: string; address: string; regular: boolean }
  | { kind: "patient"; id: string; name: string; address: string | null }
  | { kind: "address"; address: string };

/** A session or event in the calendar. A stop of null means its place isn't set. */
export type Visit = {
  startsAt: string; // ISO timestamp
  stop: Stop | null;
  /** Why she went, like "Home visit: Thandi Mokoena". */
  reason: string;
  /** The same reason without the patient's name, for an anonymous logbook. */
  anonymousReason: string;
};

export type Trip = {
  date: string; // YYYY-MM-DD, South African time
  from: Stop;
  to: Stop;
  business: boolean;
  reason: string;
  anonymousReason: string;
  /** Null when an address or the distance between them is missing. */
  km: number | null;
};

export type TripRules = {
  /** The cautious setting off: driving from home straight to a patient's home counts as business. */
  homeToPatientIsBusiness: boolean;
};

/** Ignores case, spaces and commas, so the same address typed twice is one address. */
export function normaliseAddress(address: string): string {
  return address.toLowerCase().replace(/[\s,]+/g, " ").trim();
}

/** The key for the distance between two addresses, the same in both directions. */
export function pairKey(a: string, b: string): string {
  return [normaliseAddress(a), normaliseAddress(b)].sort().join(" | ");
}

export function stopAddress(stop: Stop): string | null {
  return stop.address;
}

/** How a stop reads in the logbook. */
export function stopLabel(stop: Stop, anonymous = false): string {
  switch (stop.kind) {
    case "home":
      return "Home";
    case "place":
      return stop.name;
    case "patient":
      return anonymous ? "Patient's home" : `${stop.name}'s home`;
    case "address":
      return stop.address;
  }
}

function stopKey(stop: Stop): string {
  switch (stop.kind) {
    case "home":
      return "home";
    case "place":
      return `place:${stop.id}`;
    case "patient":
      return `patient:${stop.id}`;
    case "address":
      return `address:${normaliseAddress(stop.address)}`;
  }
}

/** Whether a trip between two stops is business, as SARS counts it. */
export function isBusinessTrip(a: Stop, b: Stop, rules: TripRules): boolean {
  const other = a.kind === "home" ? b : b.kind === "home" ? a : null;
  if (!other) return true;
  if (other.kind === "place") return !other.regular;
  if (other.kind === "patient") return rules.homeToPatientIsBusiness;
  return true;
}

const HOME_REASON = { reason: "Home after work", anonymousReason: "Home after work" };

/**
 * Every trip on each day with visits, oldest first: from home to each stop in time order and back home. Visits
 * without a place are skipped, and back-to-back visits at the same stop make no trip.
 */
export function workOutTrips(visits: Visit[], homeAddress: string | null, distances: Map<string, number>, rules: TripRules): Trip[] {
  const days = new Map<string, Visit[]>();
  for (const visit of [...visits].sort((a, b) => a.startsAt.localeCompare(b.startsAt))) {
    if (!visit.stop) continue;
    const date = toLocalInput(new Date(visit.startsAt)).slice(0, 10);
    days.set(date, [...(days.get(date) ?? []), visit]);
  }

  const home: Stop = { kind: "home", address: homeAddress };
  const trips: Trip[] = [];
  for (const [date, dayVisits] of days) {
    const legs = [...dayVisits.map((visit) => ({ stop: visit.stop!, why: visit })), { stop: home, why: HOME_REASON }];
    let at: Stop = home;
    for (const leg of legs) {
      if (stopKey(leg.stop) === stopKey(at)) continue;
      const fromAddress = stopAddress(at);
      const toAddress = stopAddress(leg.stop);
      // Two stops at the same address, like two patients in one house, need no driving.
      if (fromAddress && toAddress && normaliseAddress(fromAddress) === normaliseAddress(toAddress)) {
        at = leg.stop;
        continue;
      }
      trips.push({
        date,
        from: at,
        to: leg.stop,
        business: isBusinessTrip(at, leg.stop, rules),
        reason: leg.why.reason,
        anonymousReason: leg.why.anonymousReason,
        km: fromAddress && toAddress ? (distances.get(pairKey(fromAddress, toAddress)) ?? null) : null,
      });
      at = leg.stop;
    }
  }
  return trips;
}

export type MissingDistance = { key: string; from: string; to: string; fromLabel: string; toLabel: string; trips: number };

/** The pairs of addresses business trips need a distance for, most used first. */
export function missingDistances(trips: Trip[]): MissingDistance[] {
  const missing = new Map<string, MissingDistance>();
  for (const trip of trips) {
    const from = stopAddress(trip.from);
    const to = stopAddress(trip.to);
    if (!trip.business || trip.km !== null || !from || !to) continue;
    const key = pairKey(from, to);
    const found = missing.get(key) ?? { key, from, to, fromLabel: stopLabel(trip.from), toLabel: stopLabel(trip.to), trips: 0 };
    found.trips += 1;
    missing.set(key, found);
  }
  return [...missing.values()].sort((a, b) => b.trips - a.trips);
}

/** The car in use on a day. A car that ended that day has been swapped for the next one. */
export function carOn<T extends Pick<Car, "started_on" | "ended_on">>(cars: T[], date: string): T | null {
  return cars.find((car) => car.started_on <= date && (!car.ended_on || date < car.ended_on)) ?? null;
}

export type BusinessShare = {
  /** Business km as a fraction of all km driven, from 0 to 1. Null until there are two odometer readings. */
  share: number | null;
  /** Business km between the first and last readings. */
  businessKm: number;
  /** All km between the first and last readings. */
  totalKm: number | null;
  from: string | null;
  to: string | null;
};

/**
 * The business share of a car's km, the best we can tell so far: business km between its first and last odometer
 * readings, out of what the odometer says it drove between them. Trips on the first reading's day count, as readings
 * are usually taken before setting off.
 */
export function businessShare(trips: Pick<Trip, "date" | "km" | "business">[], readings: Reading[]): BusinessShare {
  const sorted = [...readings].sort((a, b) => a.readOn.localeCompare(b.readOn));
  const first = sorted[0];
  const last = sorted.at(-1);
  if (!first || !last || first === last) return { share: null, businessKm: 0, totalKm: null, from: first?.readOn ?? null, to: null };

  const businessKm = round1(
    trips.filter((t) => t.business && t.km !== null && t.date >= first.readOn && t.date < last.readOn).reduce((total, t) => total + t.km!, 0),
  );
  const totalKm = last.km - first.km;
  const share = totalKm > 0 ? Math.min(1, businessKm / totalKm) : null;
  return { share, businessKm, totalKm, from: first.readOn, to: last.readOn };
}

/** The business share across a tax year's cars: all their business km out of all their km. Null with no readings. */
export function combinedShare(shares: BusinessShare[]): number | null {
  const known = shares.filter((s) => s.share !== null && s.totalKm);
  const totalKm = known.reduce((total, s) => total + s.totalKm!, 0);
  if (!totalKm) return null;
  return Math.min(1, known.reduce((total, s) => total + s.businessKm, 0) / totalKm);
}

/**
 * What an expense counts as. Vehicle costs count only the business share of the tax year they were paid in, and
 * nothing until the logbook has one: without a logbook, SARS allows no claim.
 */
export function claimableCents(
  expense: { spentOn: string; amountCents: number; businessShare: boolean },
  shares: Map<number, number | null>,
): number {
  if (!expense.businessShare) return expense.amountCents;
  const share = shares.get(taxYearOfDate(expense.spentOn)) ?? null;
  return share === null ? 0 : businessPart(expense.amountCents, share);
}

/** The tax year a date falls in, named by the year it starts (1 March). */
export function taxYearOfDate(date: string): number {
  const year = Number(date.slice(0, 4));
  return Number(date.slice(5, 7)) >= 3 ? year : year - 1;
}

/** The part of an amount in cents that's business, rounded to the nearest cent. */
export function businessPart(cents: number, share: number): number {
  return Math.round(cents * share);
}

function round1(km: number): number {
  return Math.round(km * 10) / 10;
}
